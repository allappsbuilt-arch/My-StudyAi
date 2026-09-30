/**
 * AI service - the ONLY file that talks to the AI provider (Anthropic Claude).
 *
 * The API key is read from backend/.env (AI_API_KEY) and never leaves the server.
 * Functions:
 *   - tutorReply(history, message, context)  -> AI Tutor chat answer (markdown)
 *   - analyzeMaterial(input)                 -> summary, key points, definitions, topics, questions, recommendations
 *   - generateQuiz(options)                  -> multiple-choice questions with explanations
 */
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

let client = null;

/** Shown by AI Tutor, AI analysis and AI quiz generation when no key is configured. */
const AI_NOT_CONFIGURED_MESSAGE = 'AI features require an AI API key. Please configure AI_API_KEY in backend/.env.';

function getClient() {
  if (!config.ai.apiKey || config.ai.apiKey === 'your_api_key_here') {
    throw new AppError(AI_NOT_CONFIGURED_MESSAGE, 503, undefined, 'AI_NOT_CONFIGURED');
  }
  if (!client) client = new Anthropic({ apiKey: config.ai.apiKey, maxRetries: 2 });
  return client;
}

const model = () => config.ai.model;
// Effort control is not available on Haiku models
const supportsEffort = () => !/haiku/i.test(model());
// Server-side refusal fallbacks are available for Claude Opus 5 and Fable models
const supportsFallbacks = () => config.ai.useFallbacks && /^claude-(opus-5|fable-5)/.test(model());

/** Turn SDK errors into friendly AppErrors the frontend can show. */
function translateError(err) {
  if (err instanceof AppError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new AppError('The AI API key is invalid. Check AI_API_KEY in backend/.env.', 503);
  if (err instanceof Anthropic.PermissionDeniedError) return new AppError('The AI API key does not have permission for this model.', 503);
  if (err instanceof Anthropic.NotFoundError) return new AppError(`The AI model "${model()}" was not found. Check AI_MODEL in backend/.env.`, 503);
  if (err instanceof Anthropic.RateLimitError) return new AppError('The AI is receiving too many requests. Please wait a moment and try again.', 429);
  if (err instanceof Anthropic.BadRequestError) return new AppError(`The AI could not process this request: ${err.message}`, 502);
  if (err instanceof Anthropic.APIConnectionError) return new AppError('Could not reach the AI service. Check your internet connection.', 503);
  if (err instanceof Anthropic.APIError) return new AppError('The AI service returned an error. Please try again.', 502);
  return err;
}

/**
 * One call to Claude. Uses streaming under the hood (safe for long outputs)
 * and returns the final text.
 */
async function callClaude({ system, messages, maxTokens = 16000, effort = 'high', schema }) {
  const anthropic = getClient();

  const params = { model: model(), max_tokens: maxTokens, system, messages };
  const outputConfig = {};
  if (supportsEffort()) outputConfig.effort = effort;
  if (schema) outputConfig.format = { type: 'json_schema', schema };
  if (Object.keys(outputConfig).length) params.output_config = outputConfig;

  let response;
  try {
    if (supportsFallbacks()) {
      // If Claude declines for safety reasons, the API re-runs on a fallback model automatically.
      response = await anthropic.beta.messages
        .stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
        .finalMessage();
    } else {
      response = await anthropic.messages.stream(params).finalMessage();
    }
  } catch (err) {
    throw translateError(err);
  }

  if (response.stop_reason === 'refusal') {
    throw new AppError("The AI couldn't help with this request. Try rephrasing it or using different material.", 422);
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (response.stop_reason === 'max_tokens' && schema) {
    throw new AppError('The AI response was too long to finish. Try a smaller file or fewer questions.', 502);
  }
  if (!text) throw new AppError('The AI returned an empty response. Please try again.', 502);

  if (!schema) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError('The AI returned an unexpected format. Please try again.', 502);
  }
}

// ---------------------------------------------------------------------------
// AI Tutor chat
// ---------------------------------------------------------------------------

const TUTOR_SYSTEM = `You are StudyAI, a friendly and patient AI tutor inside the MyStudyAI app.
Help students understand concepts, solve problems step by step, and prepare for exams.
- Explain clearly at the student's level; use short paragraphs, bullet points, and worked examples.
- Use Markdown formatting (headings, lists, **bold**, tables, code blocks) when it helps readability.
- For maths/science problems, show the reasoning steps, not only the final answer.
- If a question is ambiguous, answer the most likely interpretation and mention the assumption.
- Encourage learning: finish longer explanations with a quick check-your-understanding question when appropriate.
- If study material is provided, ground your answers in it and say when something is not covered by it.`;

/**
 * @param {Array<{message:string,response:string}>} history earlier exchanges, oldest first
 * @param {string} message the new student message
 * @param {{title?:string, summary?:string, text?:string}|null} material optional study material context
 */
async function tutorReply(history, message, material) {
  const messages = [];
  for (const h of history) {
    messages.push({ role: 'user', content: h.message });
    messages.push({ role: 'assistant', content: h.response });
  }
  messages.push({ role: 'user', content: message });

  let system = TUTOR_SYSTEM;
  if (material) {
    const text = (material.text || '').slice(0, 150000);
    system += `\n\nThe student is studying this material. Use it as the main reference.\n<material title="${(material.title || 'Study material').replace(/"/g, "'")}">\n<summary>${material.summary || ''}</summary>\n${text ? `<content>${text}</content>` : ''}\n</material>`;
  }

  return callClaude({ system, messages, maxTokens: 8000, effort: 'medium' });
}

// ---------------------------------------------------------------------------
// Study material analysis
// ---------------------------------------------------------------------------

const str = { type: 'string' };
const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'subject', 'summary', 'key_points', 'definitions', 'important_topics', 'exam_questions', 'recommendations'],
  properties: {
    title: str,
    subject: str,
    summary: str,
    key_points: { type: 'array', items: str },
    definitions: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['term', 'definition'], properties: { term: str, definition: str } },
    },
    important_topics: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['topic', 'description'], properties: { topic: str, description: str } },
    },
    exam_questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'type', 'answer_hint'],
        properties: { question: str, type: { type: 'string', enum: ['short', 'long', 'conceptual', 'numerical'] }, answer_hint: str },
      },
    },
    recommendations: { type: 'array', items: str },
  },
};

const ANALYSIS_SYSTEM = `You are an expert teacher who turns study material into exam-ready study guides for students.
Read the provided material carefully and produce:
- title: a short descriptive title for the material
- subject: the academic subject (e.g. Biology, Physics, Computer Science)
- summary: a clear 2-5 paragraph summary in plain language (Markdown allowed)
- key_points: 6-12 of the most important points to remember
- definitions: the important terms with precise, student-friendly definitions (up to 12)
- important_topics: the main topics with a one or two sentence description each (up to 8)
- exam_questions: 6-10 likely exam questions mixing short, long, conceptual and numerical (when relevant), each with a brief answer hint
- recommendations: 3-6 concrete, personalised study recommendations for mastering this material
Base everything on the material itself. If the material is thin (for example a few video frames), work with what is visible and say so in the summary.`;

/**
 * @param {{filename:string, fileType:string, text?:string, images?:Array<{mediaType:string,data:string}>, pdfBase64?:string, description?:string, wasTruncated?:boolean}} input
 */
async function analyzeMaterial(input) {
  const content = [];

  if (input.pdfBase64) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdfBase64 } });
  }
  for (const img of input.images || []) {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } });
  }

  let prompt = `File name: ${input.filename}\nFile type: ${input.fileType}\n`;
  if (input.fileType === 'video') {
    prompt += `The images above are frames sampled evenly from a study video.\n`;
  }
  if (input.description) {
    prompt += `\nStudent's description / transcript of this material:\n<description>\n${input.description}\n</description>\n`;
  }
  if (input.text) {
    prompt += `\n<material>\n${input.text}\n</material>\n`;
    if (input.wasTruncated) prompt += `\n(Note: the material was very long, so only the first part is included above.)\n`;
  }
  prompt += `\nCreate the study guide for this material.`;
  content.push({ type: 'text', text: prompt });

  const r = await callClaude({ system: ANALYSIS_SYSTEM, messages: [{ role: 'user', content }], maxTokens: 32000, effort: 'high', schema: ANALYSIS_SCHEMA });

  return {
    title: String(r.title || input.filename).slice(0, 250),
    subject: String(r.subject || '').slice(0, 100),
    summary: String(r.summary || ''),
    keyPoints: (r.key_points || []).map(String),
    definitions: (r.definitions || []).map((d) => ({ term: String(d.term), definition: String(d.definition) })),
    importantTopics: (r.important_topics || []).map((t) => ({ topic: String(t.topic), description: String(t.description) })),
    importantQuestions: (r.exam_questions || []).map((q) => ({ question: String(q.question), type: q.type, answerHint: String(q.answer_hint) })),
    recommendations: (r.recommendations || []).map(String),
  };
}

// ---------------------------------------------------------------------------
// Quiz generation
// ---------------------------------------------------------------------------

const QUIZ_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'options', 'correct_option', 'explanation'],
        properties: {
          question: str,
          options: { type: 'array', items: str },
          correct_option: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          explanation: str,
        },
      },
    },
  },
};

const QUIZ_SYSTEM = `You write high-quality multiple-choice quizzes for students.
Rules:
- Each question has exactly 4 options (A, B, C, D) with exactly one correct answer.
- Distractors must be plausible; avoid "all of the above" / "none of the above".
- Vary which letter is correct.
- The explanation says why the correct answer is right and briefly why the common wrong choice is wrong.
- Match the requested difficulty: easy = recall and basic understanding, medium = application, hard = analysis and multi-step reasoning.
- Do not include the letter labels inside the option text.`;

/**
 * @param {{subject:string, topic:string, difficulty:'easy'|'medium'|'hard', count:number, materialText?:string}} opts
 */
async function generateQuiz({ subject, topic, difficulty, count, materialText }) {
  let prompt = `Create a ${difficulty} quiz with exactly ${count} multiple-choice questions.\nSubject: ${subject}\nTopic: ${topic}\n`;
  if (materialText) {
    prompt += `\nBase the questions on this study material:\n<material>\n${materialText.slice(0, 200000)}\n</material>\n`;
  }

  const attempt = async () => {
    const r = await callClaude({ system: QUIZ_SYSTEM, messages: [{ role: 'user', content: prompt }], maxTokens: 16000, effort: 'medium', schema: QUIZ_SCHEMA });
    return (r.questions || [])
      .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length === 4 && ['A', 'B', 'C', 'D'].includes(q.correct_option))
      .map((q) => ({
        question: String(q.question).trim(),
        options: q.options.map((o) => String(o).replace(/^[A-D][).:]\s+/, '').trim()),
        correctAnswer: q.correct_option,
        explanation: String(q.explanation || '').trim(),
      }));
  };

  let questions = await attempt();
  // Very rarely the model returns a malformed question; retry once if we lost any.
  if (questions.length < count) {
    const retry = await attempt();
    if (retry.length > questions.length) questions = retry;
  }
  if (!questions.length) throw new AppError('The AI could not create a quiz for this topic. Try a different topic.', 502);
  return questions.slice(0, count);
}

// ---------------------------------------------------------------------------
// Study tools: Scan & Solve, Translate, Summarize, Essay Help, Lecture Notes
// ---------------------------------------------------------------------------

const SOLVE_SYSTEM = `You are an expert tutor who solves homework and exam questions for students.
- First state what the problem is (e.g. "Quadratic equation", "Newton's second law").
- Then solve it step by step with numbered steps, showing the working.
- Finish with a line that starts with "**Answer:**".
- If the image contains several questions, solve each one under its own heading.
- If the image is unreadable or has no question, say so briefly and ask for a clearer photo.
Use Markdown. Use plain-text maths (x², √, ÷) rather than LaTeX.`;

/** @param {{text?:string, image?:{mediaType:string,data:string}}} input */
async function solveProblem({ text, image }) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: text ? `Question:\n${text}` : 'Solve the question in this image.' });
  return callClaude({ system: SOLVE_SYSTEM, messages: [{ role: 'user', content }], maxTokens: 8000, effort: 'medium' });
}

const TRANSLATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['detected_language', 'translation', 'explanation'],
  properties: { detected_language: str, translation: str, explanation: str },
};

async function translate({ text, from, to, explain }) {
  const prompt = `Translate the text ${from && from !== 'auto' ? `from ${from} ` : ''}into ${to}.
Return the natural translation in "translation" and the source language name in "detected_language".
${explain ? 'In "explanation", briefly explain (in English, 2-5 bullet points) key vocabulary and grammar choices.' : 'Leave "explanation" as an empty string.'}
<text>
${text}
</text>`;
  const r = await callClaude({
    system: 'You are a precise, natural-sounding translator for students.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 6000,
    effort: 'low',
    schema: TRANSLATE_SCHEMA,
  });
  return { detectedLanguage: String(r.detected_language || ''), translation: String(r.translation || ''), explanation: String(r.explanation || '') };
}

async function summarize({ text, length }) {
  const size = { short: '3-5 bullet points', medium: 'a short paragraph followed by 5-8 key bullet points', long: 'a detailed multi-section summary with headings' }[length] || 'a short paragraph followed by key bullet points';
  return callClaude({
    system: 'You summarise study material for students clearly and accurately. Use Markdown.',
    messages: [{ role: 'user', content: `Summarise this as ${size}. Finish with a "Key terms" list if there are any.\n<material>\n${text.slice(0, 150000)}\n</material>` }],
    maxTokens: 6000,
    effort: 'low',
  });
}

const ESSAY_PROMPTS = {
  write: (t) => `Create a detailed essay outline for this topic: "${t}". Include a working thesis statement, an introduction plan, 3-5 body sections with key arguments and supporting evidence ideas, counter-arguments, and a conclusion plan.`,
  improve: (t) => `Improve this piece of student writing. First give the improved version, then a short list of the main changes (clarity, grammar, flow, word choice) and why they help.\n<writing>\n${t}\n</writing>`,
  structure: (t) => `Analyse the structure of this essay or draft. Give a paragraph-by-paragraph map, point out missing or weak parts (thesis, topic sentences, transitions, evidence), and suggest a better structure.\n<writing>\n${t}\n</writing>`,
};

async function essayHelp({ mode, text }) {
  return callClaude({
    system: 'You are a supportive writing coach for students. Help them learn to write better - do not just hand in finished work for graded assignments; explain your suggestions. Use Markdown.',
    messages: [{ role: 'user', content: ESSAY_PROMPTS[mode](text) }],
    maxTokens: 8000,
    effort: 'medium',
  });
}

async function lectureNotes({ transcript, title }) {
  return callClaude({
    system: 'You turn raw lecture transcripts into clean, well-organised study notes. Use Markdown headings, bullet points, bold key terms, and finish with "Key takeaways" and "Questions to review".',
    messages: [{ role: 'user', content: `Lecture: ${title}\n<transcript>\n${transcript.slice(0, 150000)}\n</transcript>` }],
    maxTokens: 10000,
    effort: 'medium',
  });
}

const FLASHCARDS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cards'],
  properties: {
    cards: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['front', 'back'], properties: { front: str, back: str } },
    },
  },
};

async function generateFlashcards({ topic, subject, count, materialText }) {
  let prompt = `Create exactly ${count} flashcards for studying.\nSubject: ${subject || 'General'}\nTopic: ${topic}\n`;
  if (materialText) prompt += `\nBase the cards on this material:\n<material>\n${materialText.slice(0, 150000)}\n</material>\n`;
  prompt += '\nFront: a term or short question. Back: a concise, accurate answer (1-3 sentences).';
  const r = await callClaude({
    system: 'You write excellent flashcards for spaced-repetition study. One fact per card, no duplicates.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 12000,
    effort: 'low',
    schema: FLASHCARDS_SCHEMA,
  });
  const cards = (r.cards || [])
    .filter((c) => c && c.front && c.back)
    .map((c) => ({ front: String(c.front).trim().slice(0, 1000), back: String(c.back).trim().slice(0, 2000) }));
  if (!cards.length) throw new AppError('The AI could not create flashcards for this topic. Try a different topic.', 502);
  return cards.slice(0, count);
}

module.exports = {
  tutorReply,
  analyzeMaterial,
  generateQuiz,
  solveProblem,
  translate,
  summarize,
  essayHelp,
  lectureNotes,
  generateFlashcards,
  AI_NOT_CONFIGURED_MESSAGE,
  isConfigured: () => Boolean(config.ai.apiKey && config.ai.apiKey !== 'your_api_key_here'),
};
