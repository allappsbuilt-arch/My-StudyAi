/**
 * Quizzes: AI generation, taking, server-side grading, results and history.
 * Correct answers are stored in quiz_answer_keys (no RLS policies) and only read here with the
 * service role, so they never reach the browser before the quiz is submitted.
 */
const { admin, check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const aiService = require('./aiService');
const materialService = require('./materialService');

const SECONDS_PER_QUESTION = { easy: 45, medium: 60, hard: 90 };
const LETTERS = ['A', 'B', 'C', 'D'];

const toPublic = (q) => ({
  id: q.id, subject: q.subject, topic: q.topic, difficulty: q.difficulty, totalQuestions: q.total_questions, timeLimit: q.time_limit, materialId: q.material_id, createdAt: q.created_at,
});

async function getQuizRow(ctx, id) {
  const q = check(await ctx.db.from('quizzes').select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle(), 'Loading the quiz');
  if (!q) throw new AppError('Quiz not found.', 404);
  return q;
}

async function generate(ctx, body) {
  const difficulty = String(body.difficulty || 'medium').toLowerCase();
  if (!['easy', 'medium', 'hard'].includes(difficulty)) throw new AppError('Difficulty must be easy, medium or hard.', 400);
  const count = Number(body.numQuestions ?? 10);
  if (!Number.isInteger(count) || count < 3 || count > 30) throw new AppError('Number of questions must be between 3 and 30.', 400);

  let subject = body.subject ? String(body.subject).trim() : '';
  let topic = body.topic ? String(body.topic).trim() : '';
  let materialText;
  let materialId = null;
  if (body.materialId) {
    materialId = Number(body.materialId);
    const { material, analysis } = await materialService.analysedText(ctx, materialId);
    if (!analysis) throw new AppError('Analyse this material with AI before creating a quiz from it.', 400);
    materialText = analysis.extracted_text || analysis.summary;
    subject = subject || material.subject || 'General';
    topic = topic || analysis.title || material.filename;
  }
  if (!subject) throw new AppError('Subject is required.', 400);
  if (!topic) throw new AppError('Topic is required.', 400);

  const questions = await aiService.generateQuiz({ subject: subject.slice(0, 100), topic: topic.slice(0, 200), difficulty, count, materialText });

  const db = admin();
  const quiz = check(
    await db
      .from('quizzes')
      .insert({ user_id: ctx.userId, material_id: materialId, subject, topic, difficulty, total_questions: questions.length, time_limit: questions.length * SECONDS_PER_QUESTION[difficulty] })
      .select()
      .single(),
    'Saving the quiz'
  );
  const saved = check(
    await db.from('quiz_questions').insert(questions.map((q, i) => ({ quiz_id: quiz.id, user_id: ctx.userId, position: i, question: q.question, options: q.options }))).select('id, position'),
    'Saving the questions'
  );
  const idAt = Object.fromEntries(saved.map((s) => [s.position, s.id]));
  check(await db.from('quiz_answer_keys').insert(questions.map((q, i) => ({ question_id: idAt[i], correct_answer: q.correctAnswer, explanation: q.explanation }))), 'Saving the answers');
  return toPublic(quiz);
}

async function get(ctx, id) {
  const quiz = await getQuizRow(ctx, id);
  const questions = check(await ctx.db.from('quiz_questions').select('id, question, options, position').eq('quiz_id', id).order('position'), 'Loading the questions');
  return { quiz: toPublic(quiz), questions: questions.map((q) => ({ id: q.id, question: q.question, options: q.options })) };
}

function buildResult(attempt, quiz) {
  const results = attempt.results || [];
  const unanswered = results.filter((r) => !r.selectedAnswer).length;
  return {
    attemptId: attempt.id,
    quiz: toPublic(quiz),
    score: attempt.score,
    totalQuestions: results.length,
    correctAnswers: attempt.score,
    wrongAnswers: results.length - attempt.score - unanswered,
    unanswered,
    percentage: Number(attempt.percentage),
    timeTaken: attempt.time_taken,
    completedAt: attempt.completed_at,
    questions: results,
  };
}

async function submit(ctx, id, body) {
  const quiz = await getQuizRow(ctx, id);
  const questions = check(await ctx.db.from('quiz_questions').select('id, question, options').eq('quiz_id', id).order('position'), 'Loading the questions');
  const keys = check(await admin().from('quiz_answer_keys').select('*').in('question_id', questions.map((q) => q.id)), 'Loading the answers');
  const keyOf = Object.fromEntries(keys.map((k) => [k.question_id, k]));

  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const timeTaken = Math.max(0, Math.min(Math.round(Number(body.timeTaken)) || 0, 24 * 3600));
  let correct = 0;
  const clean = {};
  const results = questions.map((q) => {
    const raw = answers[q.id] ?? answers[String(q.id)];
    const selected = LETTERS.includes(raw) ? raw : null;
    if (selected) clean[q.id] = selected;
    const key = keyOf[q.id] || {};
    const isCorrect = selected === key.correct_answer;
    if (isCorrect) correct += 1;
    return { questionId: q.id, question: q.question, options: q.options, selectedAnswer: selected, correctAnswer: key.correct_answer, isCorrect, explanation: key.explanation };
  });
  const percentage = results.length ? Math.round((correct / results.length) * 10000) / 100 : 0;
  const attempt = check(
    await admin().from('quiz_attempts').insert({ quiz_id: quiz.id, user_id: ctx.userId, score: correct, percentage, answers: clean, results, time_taken: timeTaken }).select().single(),
    'Saving the result'
  );
  return buildResult(attempt, quiz);
}

async function attempt(ctx, attemptId) {
  const a = check(await ctx.db.from('quiz_attempts').select('*').eq('id', attemptId).eq('user_id', ctx.userId).maybeSingle(), 'Loading the result');
  if (!a) throw new AppError('Quiz result not found.', 404);
  return buildResult(a, await getQuizRow(ctx, a.quiz_id));
}

async function history(ctx) {
  const [quizzes, attempts] = await Promise.all([
    ctx.db.from('quizzes').select('*').eq('user_id', ctx.userId).order('created_at', { ascending: false }).then((r) => check(r, 'Loading quizzes')),
    ctx.db.from('quiz_attempts').select('id, quiz_id, score, percentage, time_taken, completed_at').eq('user_id', ctx.userId).order('completed_at', { ascending: false }).limit(100).then((r) => check(r, 'Loading results')),
  ]);
  const byId = Object.fromEntries(quizzes.map((q) => [q.id, q]));
  const attempted = new Set(attempts.map((a) => String(a.quiz_id)));
  return {
    attempts: attempts
      .filter((a) => byId[a.quiz_id])
      .map((a) => {
        const q = byId[a.quiz_id];
        return { attemptId: a.id, quizId: a.quiz_id, subject: q.subject, topic: q.topic, difficulty: q.difficulty, totalQuestions: q.total_questions, score: a.score, percentage: Number(a.percentage), timeTaken: a.time_taken, completedAt: a.completed_at };
      }),
    notAttempted: quizzes.filter((q) => !attempted.has(String(q.id))).slice(0, 20).map(toPublic),
  };
}

module.exports = { generate, get, submit, attempt, history };
