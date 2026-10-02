/**
 * DEVELOPMENT-ONLY UI PREVIEW.
 *
 * Answers the same /api requests as the real backend, using in-memory sample data, so every
 * screen can be viewed without Supabase. Loaded only when `npm run dev` runs with
 * EXPO_PUBLIC_UI_PREVIEW=true. Never used in production
 * builds, never touches Supabase, and nothing is saved: a page reload resets it.
 */

const DAY = 86400000;
const now = () => new Date().toISOString();
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const localDate = (v = new Date()) => {
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};
const weekday = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class PreviewError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const ME = 'preview-me';
const people = {
  [ME]: { id: ME, name: 'Priya Sharma', avatarUrl: null },
  u1: { id: 'u1', name: 'Sarah Chen', avatarUrl: null },
  u2: { id: 'u2', name: 'Mike Johnson', avatarUrl: null },
  u3: { id: 'u3', name: 'Emily Davis', avatarUrl: null },
  u4: { id: 'u4', name: 'Alice', avatarUrl: null },
  u5: { id: 'u5', name: 'Bob', avatarUrl: null },
  u6: { id: 'u6', name: 'Carol', avatarUrl: null },
  u7: { id: 'u7', name: 'Dave', avatarUrl: null },
};

let seq = 1000;
const id = () => (seq += 1);
const today = localDate();

const db = {
  signedIn: true,
  profile: {
    name: 'Priya Sharma',
    email: 'priya@example.com',
    avatarUrl: null,
    educationLevel: 'Undergraduate',
    createdAt: ago(40 * DAY),
    preferences: {
      darkMode: false, studyReminders: true, pushNotifications: true, onboarded: true, subjects: ['Mathematics', 'Physics', 'Biology', 'Chemistry'],
      studyMethods: ['Flashcards', 'Practice Tests'], language: 'en', role: 'student', streakAlerts: true, reminderTime: '18:00',
      profileVisibility: 'public', showStudyStats: true, showOnlineStatus: true, username: 'priya_study', school: 'Delhi University',
    },
  },
  // 7-day streak (today included) + a longer run earlier
  sessions: Object.fromEntries([
    ...Array.from({ length: 7 }, (_, i) => [addDays(today, -i), [120, 90, 150, 60, 75, 45, 30][i]]),
    ...Array.from({ length: 14 }, (_, i) => [addDays(today, -10 - i), 40]),
  ]),
  tasks: [
    { id: id(), title: 'Mathematics', topic: 'Calculus - Derivatives', minutes: 45, date: today, done: true },
    { id: id(), title: 'Physics', topic: "Newton's Laws", minutes: 30, date: today, done: false },
    { id: id(), title: 'Computer Science', topic: 'Data Structures', minutes: 60, date: today, done: false },
    { id: id(), title: 'Chemistry', topic: 'Periodic Table', minutes: 40, date: addDays(today, -1), done: true },
    { id: id(), title: 'Biology', topic: 'Cell Structure', minutes: 50, date: addDays(today, -2), done: true },
  ],
  materials: [
    { id: 11, filename: 'Cell Biology Notes.pdf', fileType: 'pdf', mimeType: 'application/pdf', fileSize: 845000, subject: 'Biology', description: null, analysisStatus: 'completed', analysisError: null, hasAnalysis: true, uploadedAt: ago(2 * 3600000) },
    { id: 12, filename: 'Physics Lecture 4.mp4', fileType: 'video', mimeType: 'video/mp4', fileSize: 24500000, subject: 'Physics', description: 'Forces and motion', analysisStatus: 'not_started', analysisError: null, hasAnalysis: false, uploadedAt: ago(DAY) },
    { id: 13, filename: 'Periodic Table Summary.docx', fileType: 'document', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 120000, subject: 'Chemistry', description: null, analysisStatus: 'completed', analysisError: null, hasAnalysis: true, uploadedAt: ago(3 * DAY) },
  ],
  analyses: {},
  notes: [
    { id: 21, title: 'Cell organelles', subject: 'Biology', content: '## Organelles\n- **Nucleus** – controls the cell\n- **Mitochondria** – releases energy\n- **Ribosomes** – make proteins', createdAt: ago(2 * DAY), updatedAt: ago(2 * DAY) },
    { id: 22, title: 'Derivative rules', subject: 'Mathematics', content: '- Power rule: d/dx xⁿ = n·xⁿ⁻¹\n- Product rule: (uv)′ = u′v + uv′\n- Chain rule: f(g(x))′ = f′(g(x))·g′(x)', createdAt: ago(5 * DAY), updatedAt: ago(DAY) },
  ],
  quizzes: [],
  attempts: [],
  chats: [],
  decks: [],
  cards: [],
  games: [
    { user: ME, game: 'matching', score: 110, won: true, at: ago(DAY) },
    { user: ME, game: 'mathrush', score: 140, won: false, at: ago(2 * DAY) },
    { user: 'u4', game: 'battle', score: 240, won: true, at: ago(DAY) },
    { user: 'u5', game: 'matching', score: 185, won: true, at: ago(DAY) },
    { user: 'u6', game: 'spelling', score: 152, won: true, at: ago(2 * DAY) },
    { user: 'u7', game: 'memory', score: 120, won: true, at: ago(3 * DAY) },
  ],
  communities: [
    { id: 1, slug: 'computer-science', name: 'Computer Science', description: 'A community for programming and algorithms enthusiasts', emoji: '💻', members: 1250, joined: true },
    { id: 2, slug: 'mathematics', name: 'Mathematics', description: 'Calculus, algebra, statistics and problem solving', emoji: '📐', members: 2100, joined: true },
    { id: 3, slug: 'medical-students', name: 'Medical Students', description: 'Anatomy, physiology and exam prep for future doctors', emoji: '🩺', members: 890, joined: false },
    { id: 4, slug: 'language-learning', name: 'Language Learning', description: 'Spanish, French, Japanese and more', emoji: '🌍', members: 3400, joined: false },
    { id: 5, slug: 'exam-prep', name: 'Exam Prep', description: 'SAT, GRE, GMAT and professional exam strategies', emoji: '📝', members: 5200, joined: false },
    { id: 6, slug: 'science-lab', name: 'Science Lab', description: 'Physics, chemistry and biology discussions', emoji: '🔬', members: 760, joined: false },
  ],
  posts: [
    { id: 31, user: 'u1', communityId: null, content: 'Just finished my calculus study session! 45 flashcards mastered 💪', image: null, likes: new Set(['u2', 'u3']), likeBase: 22, comments: [{ id: 1, user: 'u2', content: 'Nice work! 🔥', at: ago(3600000) }], at: ago(2 * 3600000) },
    { id: 32, user: 'u2', communityId: null, content: 'Anyone have good resources for organic chemistry?', image: null, likes: new Set(), likeBase: 18, comments: [], at: ago(4 * 3600000) },
    { id: 33, user: 'u3', communityId: 3, content: 'Just joined the Medical Students community! Excited to learn together 🩺', image: null, likes: new Set([ME]), likeBase: 31, comments: [], at: ago(6 * 3600000) },
    { id: 34, user: 'u4', communityId: 1, content: 'Just finished implementing a binary search tree in Python! The recursion logic was tricky but satisfying when it finally worked.', image: null, likes: new Set(), likeBase: 24, comments: [], at: ago(3600000) },
    { id: 35, user: 'u5', communityId: 1, content: 'Anyone have recommendations for good resources on dynamic programming? Looking to improve my algorithmic skills.', image: null, likes: new Set([ME]), likeBase: 17, comments: [], at: ago(2 * 3600000) },
  ],
  follows: new Set([`${ME}>u1`, `u1>${ME}`, `u2>${ME}`, `u4>${ME}`]),
};

db.analyses[11] = {
  materialId: 11, title: 'Cell Biology: Structure and Function', createdAt: ago(3600000), wasTruncated: false,
  summary: 'Cells are the basic unit of life. This material covers **prokaryotic vs eukaryotic cells**, the main organelles and what each one does, and how the cell membrane controls what enters and leaves the cell.\n\n*(Sample analysis shown in UI preview mode.)*',
  keyPoints: ['All living things are made of cells', 'Eukaryotic cells have a nucleus; prokaryotic cells do not', 'Mitochondria release energy through respiration', 'Ribosomes make proteins', 'The cell membrane is selectively permeable', 'Plant cells also have a cell wall and chloroplasts'],
  definitions: [{ term: 'Organelle', definition: 'A specialised structure inside a cell with a specific job.' }, { term: 'Osmosis', definition: 'Movement of water across a semi-permeable membrane.' }, { term: 'Cytoplasm', definition: 'Jelly-like fluid where most chemical reactions happen.' }],
  importantTopics: [{ topic: 'Cell organelles', description: 'Structure and function of nucleus, mitochondria, ribosomes, ER and Golgi.' }, { topic: 'Transport', description: 'Diffusion, osmosis and active transport across membranes.' }],
  importantQuestions: [{ question: 'Compare prokaryotic and eukaryotic cells.', type: 'long', answerHint: 'Nucleus, size, organelles, examples.' }, { question: 'What is the role of mitochondria?', type: 'short', answerHint: 'Aerobic respiration releases energy (ATP).' }],
  recommendations: ['Draw and label a plant and an animal cell from memory', 'Make flashcards for each organelle', 'Take a 10-question quiz on transport'],
};
db.analyses[13] = { ...db.analyses[11], materialId: 13, title: 'The Periodic Table', summary: 'How elements are arranged by atomic number into groups and periods.\n\n*(Sample analysis shown in UI preview mode.)*' };

function addDeck(title, subject, cards, reviewed) {
  const deckId = id();
  db.decks.push({ id: deckId, title, subject, description: null, tags: [], materialId: null, createdAt: ago(6 * DAY), updatedAt: ago(DAY) });
  cards.forEach(([front, back], i) =>
    db.cards.push({ id: id(), deckId, front, back, ease: 2.5, interval: i < reviewed ? 8 : 0, repetitions: i < reviewed ? 3 : 0, dueAt: i < reviewed ? ago(-5 * DAY) : ago(60000), reviewedAt: i < reviewed ? ago(2 * 3600000) : null })
  );
}
addDeck('Biology - Cell Structure', 'Biology', [['Nucleus', 'Controls the cell and contains DNA'], ['Mitochondria', 'Releases energy through respiration'], ['Ribosome', 'Makes proteins'], ['Cell membrane', 'Controls what enters and leaves the cell'], ['Chloroplast', 'Site of photosynthesis in plants']], 3);
addDeck('Chemistry - Periodic Table', 'Chemistry', [['Group 1', 'Alkali metals'], ['Group 17', 'Halogens'], ['Group 18', 'Noble gases'], ['Period', 'A horizontal row of the table'], ['Atomic number', 'Number of protons in the nucleus'], ['Isotope', 'Same element, different number of neutrons']], 2);

const SAMPLE_QUESTIONS = [
  ['What is the derivative of x²?', ['x', '2x', 'x²', '2'], 'B', 'Power rule: d/dx xⁿ = n·xⁿ⁻¹, so 2x.'],
  ['Which organelle releases energy?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 'C', 'Mitochondria carry out aerobic respiration.'],
  ['What is the SI unit of force?', ['Joule', 'Newton', 'Watt', 'Pascal'], 'B', 'Force is measured in newtons (N).'],
  ['H₂O is the formula for?', ['Hydrogen', 'Oxygen', 'Water', 'Salt'], 'C', 'Two hydrogen atoms and one oxygen atom.'],
  ['Which is a prime number?', ['21', '27', '29', '33'], 'C', '29 has no divisors other than 1 and itself.'],
];

function makeQuiz(subject, topic, difficulty = 'medium', materialId = null) {
  const quizId = id();
  const questions = SAMPLE_QUESTIONS.map(([question, options, correct, explanation]) => ({ id: id(), question, options, correct, explanation }));
  const quiz = { id: quizId, subject, topic, difficulty, totalQuestions: questions.length, timeLimit: questions.length * 60, materialId, createdAt: now(), questions };
  db.quizzes.push(quiz);
  return quiz;
}
{
  const q = makeQuiz('Mathematics', 'Derivatives');
  q.createdAt = ago(3600000);
  gradeQuiz(q, { [q.questions[0].id]: 'B', [q.questions[1].id]: 'C', [q.questions[2].id]: 'B', [q.questions[3].id]: 'A' }, 240, ago(3600000));
}

db.chats.push(
  { id: id(), conversationId: '11111111-1111-4111-8111-111111111111', message: 'Explain photosynthesis simply', response: '**Photosynthesis** is how plants make food:\n\n1. Leaves absorb **light** with chlorophyll\n2. They take in **CO₂** and **water**\n3. They produce **glucose** and release **oxygen**\n\n*(Sample reply - UI preview mode.)*', createdAt: ago(3 * 3600000) }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const quizPublic = (q) => ({ id: q.id, subject: q.subject, topic: q.topic, difficulty: q.difficulty, totalQuestions: q.totalQuestions, timeLimit: q.timeLimit, materialId: q.materialId, createdAt: q.createdAt });

function gradeQuiz(quiz, answers, timeTaken, at = now()) {
  let score = 0;
  const results = quiz.questions.map((q) => {
    const selected = ['A', 'B', 'C', 'D'].includes(answers[q.id]) ? answers[q.id] : null;
    const isCorrect = selected === q.correct;
    if (isCorrect) score += 1;
    return { questionId: q.id, question: q.question, options: q.options, selectedAnswer: selected, correctAnswer: q.correct, isCorrect, explanation: q.explanation };
  });
  const attempt = { id: id(), quizId: quiz.id, score, percentage: Math.round((score / results.length) * 10000) / 100, results, timeTaken, completedAt: at };
  db.attempts.push(attempt);
  return attempt;
}

function result(attempt) {
  const quiz = db.quizzes.find((q) => q.id === attempt.quizId);
  const unanswered = attempt.results.filter((r) => !r.selectedAnswer).length;
  return {
    attemptId: attempt.id, quiz: quizPublic(quiz), score: attempt.score, totalQuestions: attempt.results.length, correctAnswers: attempt.score,
    wrongAnswers: attempt.results.length - attempt.score - unanswered, unanswered, percentage: attempt.percentage, timeTaken: attempt.timeTaken,
    completedAt: attempt.completedAt, questions: attempt.results,
  };
}

function user() {
  return { id: ME, name: db.profile.name, email: db.profile.email, isGuest: false, avatarUrl: db.profile.avatarUrl, educationLevel: db.profile.educationLevel, preferences: db.profile.preferences, createdAt: db.profile.createdAt };
}

function deckPublic(d) {
  const cards = db.cards.filter((c) => c.deckId === d.id);
  const mastered = cards.filter((c) => c.interval >= 7).length;
  const t = now();
  return {
    ...d, cardCount: cards.length, dueCount: cards.filter((c) => c.dueAt <= t).length, masteredCount: mastered,
    mastery: cards.length ? Math.round((mastered / cards.length) * 100) : 0, lastStudiedAt: cards.map((c) => c.reviewedAt).filter(Boolean).sort().pop() || null,
  };
}

function streaks() {
  const dates = new Set([...Object.keys(db.sessions).filter((d) => db.sessions[d] > 0), ...db.attempts.map((a) => localDate(a.completedAt)), ...db.games.filter((g) => g.user === ME).map((g) => localDate(g.at))]);
  let current = 0;
  let cursor = dates.has(today) ? today : addDays(today, -1);
  while (dates.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev = null;
  [...dates].sort().forEach((d) => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  });
  return { current, longest, studiedToday: dates.has(today) };
}

function weekDays(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(today, -(days - 1 - i));
    const qs = db.attempts.filter((a) => localDate(a.completedAt) === d);
    return {
      date: d, day: weekday(d), minutes: db.sessions[d] || 0, quizzes: qs.length,
      averageScore: qs.length ? qs.reduce((s, a) => s + a.percentage, 0) / qs.length : null,
      uploads: db.materials.filter((m) => localDate(m.uploadedAt) === d).length,
      chats: new Set(db.chats.filter((c) => localDate(c.createdAt) === d).map((c) => c.conversationId)).size,
    };
  });
}

function overview(limit = 10) {
  const quizById = Object.fromEntries(db.quizzes.map((q) => [q.id, q]));
  const activity = [
    { type: 'deck', refId: db.decks[0].id, title: 'Completed Physics flashcards session', at: ago(10 * 60000) },
    ...db.attempts.map((a) => ({ type: 'quiz', refId: a.quizId, title: `Scored ${Math.round(a.percentage)}% on ${quizById[a.quizId]?.topic} quiz`, meta: quizById[a.quizId]?.subject, at: a.completedAt })),
    ...db.materials.map((m) => ({ type: 'upload', refId: m.id, title: `Uploaded ${m.filename}`, meta: m.fileType, at: m.uploadedAt })),
    ...db.notes.map((n) => ({ type: 'note', refId: n.id, title: `Created note: ${n.title}`, meta: n.subject, at: n.createdAt })),
    ...db.decks.map((d) => ({ type: 'deck', refId: d.id, title: `Created flashcards: ${d.title}`, meta: d.subject, at: d.createdAt })),
    ...db.games.filter((g) => g.user === ME).map((g) => ({ type: 'game', refId: g.game, title: `${g.won ? 'Won' : 'Played'} ${g.game} · ${g.score} pts`, at: g.at })),
    { type: 'streak', refId: 'streak-7', title: '7 day study streak achieved! 🔥', at: ago(DAY) },
    { type: 'badge', refId: 'badge-early', title: 'Earned "Early Bird" badge', at: ago(2 * DAY) },
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  const week = weekDays(7);
  const bySubject = {};
  db.attempts.forEach((a) => (bySubject[quizById[a.quizId]?.subject] ||= []).push(a.percentage));
  const avg = db.attempts.length ? db.attempts.reduce((s, a) => s + a.percentage, 0) / db.attempts.length : 0;
  return {
    progress: {
      studyTime: Object.values(db.sessions).reduce((s, m) => s + m, 0),
      materialsCompleted: db.materials.filter((m) => m.hasAnalysis).length,
      quizzesCompleted: db.attempts.length,
      averageScore: Math.round(avg * 100) / 100,
    },
    streak: streaks(),
    today: week[6],
    weekMinutes: week.reduce((s, d) => s + d.minutes, 0),
    cardsStudied: db.cards.filter((c) => c.reviewedAt).length,
    scoreBySubject: Object.entries(bySubject).map(([subject, list]) => ({ subject, attempts: list.length, averageScore: list.reduce((s, v) => s + v, 0) / list.length })),
    recentActivity: activity.slice(0, limit),
  };
}

function planOverview() {
  const dow = (new Date().getDay() + 6) % 7;
  const monday = addDays(today, -dow);
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dayTasks = db.tasks.filter((t) => t.date === date);
    return { date, day: weekday(date), dayNum: Number(date.slice(8)), minutes: db.sessions[date] || 0, planned: dayTasks.reduce((s, t) => s + t.minutes, 0), done: dayTasks.filter((t) => t.done).length, total: dayTasks.length, isToday: date === today };
  });
  const weekTasks = db.tasks.filter((t) => t.date >= monday && t.date <= addDays(monday, 6));
  const todays = db.tasks.filter((t) => t.date === today);
  const d = new Date();
  return {
    today, tasks: todays, week, subjects: new Set(weekTasks.map((t) => t.title)).size, activeDays: new Set(weekTasks.map((t) => t.date)).size,
    progress: weekTasks.length ? Math.round((weekTasks.filter((t) => t.done).length / weekTasks.length) * 100) : 0,
    todayProgress: todays.length ? Math.round((todays.filter((t) => t.done).length / todays.length) * 100) : 0,
    daysLeftInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate(),
  };
}

function postPublic(p) {
  const community = db.communities.find((c) => c.id === p.communityId);
  return {
    id: p.id, content: p.content, imageUrl: p.image, communityId: p.communityId, communityName: community?.name || null, author: people[p.user] || { id: p.user, name: 'Student' },
    likes: p.likeBase + p.likes.size, likedByMe: p.likes.has(ME), comments: p.comments.length, isMine: p.user === ME, createdAt: p.at,
  };
}

function followStats(userId) {
  const followers = [...db.follows].filter((f) => f.endsWith(`>${userId}`));
  return {
    posts: db.posts.filter((p) => p.user === userId).length,
    communities: userId === ME ? db.communities.filter((c) => c.joined).length : 2,
    followers: followers.length + (userId === ME ? 0 : 12),
    following: [...db.follows].filter((f) => f.startsWith(`${userId}>`)).length,
    iFollow: db.follows.has(`${ME}>${userId}`),
  };
}

function gameStats() {
  const totals = {};
  db.games.forEach((g) => { totals[g.user] = (totals[g.user] || 0) + g.score; });
  const mine = db.games.filter((g) => g.user === ME);
  const perGame = {};
  mine.forEach((g) => {
    const x = (perGame[g.game] ||= { played: 0, best: 0 });
    x.played += 1;
    x.best = Math.max(x.best, g.score);
  });
  const players = { matching: 2400, battle: 1100, streak: 860, memory: 640, spelling: 520, mathrush: 770 };
  return { streak: streaks().current, wins: mine.filter((g) => g.won).length, played: mine.length, points: totals[ME] || 0, rank: 1 + Object.values(totals).filter((p) => p > (totals[ME] || 0)).length, perGame, players };
}

const find = (list, key, what) => {
  const item = list.find((x) => String(x.id) === String(key));
  if (!item) throw new PreviewError(`${what} not found.`, 404);
  return item;
};

const AI_NOTE = '\n\n*(Sample AI answer - UI preview mode. Connect Supabase and add an AI key for real answers.)*';

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const routes = [
  ['GET', /^\/me$/, () => ({ user: user() })],
  ['GET', /^\/profile$/, () => {
    const o = overview(1);
    return { user: user(), stats: { ...o.progress, streak: o.streak.current, cards: o.cardsStudied }, courses: ['Biology', 'Mathematics', 'Chemistry', 'Physics'].map((subject, i) => ({ subject, items: 4 - i })), social: followStats(ME) };
  }],
  ['PUT', /^\/profile$/, (m, q, b) => {
    if (b.name !== undefined) db.profile.name = String(b.name).trim() || db.profile.name;
    if (b.educationLevel !== undefined) db.profile.educationLevel = b.educationLevel || null;
    if (b.preferences) db.profile.preferences = { ...db.profile.preferences, ...b.preferences };
    if (b.removeAvatar) db.profile.avatarUrl = null;
    people[ME].name = db.profile.name;
    return { user: user(), message: 'Profile updated.' };
  }],
  ['POST', /^\/profile\/avatar$/, (m, q, b) => {
    const file = b.get('avatar');
    db.profile.avatarUrl = file.uri;
    people[ME].avatarUrl = db.profile.avatarUrl;
    return { user: user() };
  }],
  ['GET', /^\/profile\/export$/, () => ({ preview: true, profile: db.profile, notes: db.notes, tasks: db.tasks })],

  ['GET', /^\/progress$/, (m, q) => overview(Number(q.activityLimit) || 10)],
  ['GET', /^\/progress\/weekly$/, (m, q) => {
    const days = weekDays(Math.min(Math.max(Number(q.days) || 7, 7), 30));
    return { days, totals: { minutes: days.reduce((s, d) => s + d.minutes, 0), quizzes: days.reduce((s, d) => s + d.quizzes, 0), uploads: days.reduce((s, d) => s + d.uploads, 0), chats: days.reduce((s, d) => s + d.chats, 0), activeDays: days.filter((d) => d.minutes).length } };
  }],
  ['POST', /^\/progress\/study-time$/, (m, q, b) => { db.sessions[today] = (db.sessions[today] || 0) + Number(b.minutes || 0); return {}; }],

  ['GET', /^\/plan$/, () => planOverview()],
  ['POST', /^\/plan\/tasks$/, (m, q, b) => {
    const task = { id: id(), title: String(b.title || 'Study'), topic: b.topic || null, minutes: Number(b.minutes) || 30, date: b.date || today, done: false };
    db.tasks.push(task);
    return { task };
  }],
  ['PATCH', /^\/plan\/tasks\/(\d+)$/, (m, q, b) => ({ task: Object.assign(find(db.tasks, m[1], 'Task'), b) })],
  ['DELETE', /^\/plan\/tasks\/(\d+)$/, (m) => { db.tasks = db.tasks.filter((t) => String(t.id) !== m[1]); return {}; }],

  ['GET', /^\/materials$/, (m, q) => ({ materials: db.materials.filter((x) => (!q.type || x.fileType === q.type) && (!q.search || x.filename.toLowerCase().includes(String(q.search).toLowerCase()))) })],
  ['POST', /^\/materials$/, (m, q, b) => {
    const file = b.get('file');
    const ext = file.name.split('.').pop().toLowerCase();
    const type = ext === 'pdf' ? 'pdf' : ext === 'mp4' ? 'video' : ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? 'image' : 'document';
    const material = { id: id(), filename: file.name, fileType: type, mimeType: file.type, fileSize: file.size || 0, subject: b.get('subject') || null, description: b.get('description') || null, analysisStatus: 'not_started', analysisError: null, hasAnalysis: false, uploadedAt: now() };
    db.materials.unshift(material);
    return { material, message: 'File uploaded successfully.' };
  }],
  ['GET', /^\/materials\/(\d+)$/, (m) => ({ material: find(db.materials, m[1], 'Material'), analysis: db.analyses[m[1]] || null })],
  ['DELETE', /^\/materials\/(\d+)$/, (m) => { db.materials = db.materials.filter((x) => String(x.id) !== m[1]); return {}; }],
  ['GET', /^\/materials\/(\d+)\/file-url$/, () => { throw new PreviewError('Files are not stored in UI preview mode.'); }],
  ['GET', /^\/materials\/(\d+)\/analysis$/, (m) => { const x = find(db.materials, m[1], 'Material'); return { material: x, status: x.analysisStatus, error: x.analysisError }; }],
  ['POST', /^\/materials\/(\d+)\/analysis$/, (m) => {
    const x = find(db.materials, m[1], 'Material');
    x.analysisStatus = 'extracting';
    setTimeout(() => { x.analysisStatus = 'analyzing'; }, 2000);
    setTimeout(() => { x.analysisStatus = 'completed'; x.hasAnalysis = true; db.analyses[x.id] = { ...db.analyses[11], materialId: x.id, title: x.filename.replace(/\.\w+$/, '') }; }, 5000);
    return { status: 'extracting' };
  }],

  ['GET', /^\/notes$/, (m, q) => ({ notes: db.notes.filter((n) => (!q.subject || n.subject === q.subject) && (!q.search || `${n.title} ${n.content}`.toLowerCase().includes(String(q.search).toLowerCase()))).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)) })],
  ['POST', /^\/notes$/, (m, q, b) => {
    if (!String(b.title || '').trim() || !String(b.content || '').trim()) throw new PreviewError('Title and content are required.');
    const note = { id: id(), title: b.title.trim(), subject: b.subject || null, content: b.content, createdAt: now(), updatedAt: now() };
    db.notes.push(note);
    return { note, message: 'Note created.' };
  }],
  ['GET', /^\/notes\/(\d+)$/, (m) => ({ note: find(db.notes, m[1], 'Note') })],
  ['PUT', /^\/notes\/(\d+)$/, (m, q, b) => ({ note: Object.assign(find(db.notes, m[1], 'Note'), { title: b.title, subject: b.subject || null, content: b.content, updatedAt: now() }) })],
  ['DELETE', /^\/notes\/(\d+)$/, (m) => { db.notes = db.notes.filter((n) => String(n.id) !== m[1]); return {}; }],

  ['POST', /^\/quiz\/generate$/, async (m, q, b) => {
    await wait(1200);
    const mat = b.materialId ? db.materials.find((x) => String(x.id) === String(b.materialId)) : null;
    return { quiz: quizPublic(makeQuiz(b.subject || mat?.subject || 'General', b.topic || mat?.filename || 'Mixed topics', b.difficulty, mat?.id || null)) };
  }],
  ['GET', /^\/quiz\/history$/, () => ({
    attempts: db.attempts.map((a) => { const x = db.quizzes.find((z) => z.id === a.quizId); return { attemptId: a.id, quizId: x.id, subject: x.subject, topic: x.topic, difficulty: x.difficulty, totalQuestions: x.totalQuestions, score: a.score, percentage: a.percentage, timeTaken: a.timeTaken, completedAt: a.completedAt }; }).reverse(),
    notAttempted: db.quizzes.filter((x) => !db.attempts.some((a) => a.quizId === x.id)).map(quizPublic),
  })],
  ['GET', /^\/quiz\/attempt\/(\d+)$/, (m) => ({ result: result(find(db.attempts, m[1], 'Result')) })],
  ['GET', /^\/quiz\/(\d+)$/, (m) => { const x = find(db.quizzes, m[1], 'Quiz'); return { quiz: quizPublic(x), questions: x.questions.map(({ id: qid, question, options }) => ({ id: qid, question, options })) }; }],
  ['POST', /^\/quiz\/(\d+)\/submit$/, (m, q, b) => ({ result: result(gradeQuiz(find(db.quizzes, m[1], 'Quiz'), b.answers || {}, b.timeTaken || 0)) })],

  ['POST', /^\/ai\/chat$/, async (m, q, b) => {
    await wait(900);
    const conversationId = b.conversationId || crypto.randomUUID();
    const ex = { id: id(), conversationId, message: b.message, response: `Great question! Here's a short explanation of **${String(b.message).slice(0, 60)}**:\n\n1. Start with the key idea\n2. Look at an example\n3. Practise with a quick question${AI_NOTE}`, createdAt: now() };
    db.chats.push(ex);
    return { conversationId, exchange: ex };
  }],
  ['GET', /^\/ai\/conversations$/, () => {
    const map = new Map();
    db.chats.forEach((c) => {
      const x = map.get(c.conversationId) || { conversationId: c.conversationId, title: c.message.slice(0, 80), messageCount: 0, startedAt: c.createdAt };
      x.messageCount += 1;
      x.lastMessageAt = c.createdAt;
      map.set(c.conversationId, x);
    });
    return { conversations: [...map.values()].reverse() };
  }],
  ['GET', /^\/ai\/conversations\/([\w-]+)$/, (m) => ({ conversationId: m[1], messages: db.chats.filter((c) => c.conversationId === m[1]) })],
  ['DELETE', /^\/ai\/conversations\/([\w-]+)$/, (m) => { db.chats = db.chats.filter((c) => c.conversationId !== m[1]); return {}; }],
  ['DELETE', /^\/ai\/conversations$/, () => { db.chats = []; return {}; }],

  ['GET', /^\/flashcards\/decks$/, () => ({ decks: db.decks.map(deckPublic) })],
  ['POST', /^\/flashcards\/decks$/, (m, q, b) => {
    if (!String(b.title || '').trim() || !b.subject) throw new PreviewError('Title and subject are required.');
    const deckId = id();
    db.decks.push({ id: deckId, title: b.title, subject: b.subject, description: b.description || null, tags: b.tags || [], materialId: b.materialId || null, createdAt: now(), updatedAt: now() });
    (b.cards || []).forEach((c) => db.cards.push({ id: id(), deckId, front: c.front, back: c.back, ease: 2.5, interval: 0, repetitions: 0, dueAt: now(), reviewedAt: null }));
    return { deck: { id: deckId } };
  }],
  ['GET', /^\/flashcards\/decks\/(\d+)$/, (m) => { const d = find(db.decks, m[1], 'Flashcard set'); return { deck: deckPublic(d), cards: db.cards.filter((c) => c.deckId === d.id) }; }],
  ['PUT', /^\/flashcards\/decks\/(\d+)$/, (m, q, b) => { Object.assign(find(db.decks, m[1], 'Flashcard set'), b, { updatedAt: now() }); return {}; }],
  ['DELETE', /^\/flashcards\/decks\/(\d+)$/, (m) => { db.decks = db.decks.filter((d) => String(d.id) !== m[1]); db.cards = db.cards.filter((c) => String(c.deckId) !== m[1]); return {}; }],
  ['POST', /^\/flashcards\/decks\/(\d+)\/cards$/, (m, q, b) => { const card = { id: id(), deckId: Number(m[1]), front: b.front, back: b.back, ease: 2.5, interval: 0, repetitions: 0, dueAt: now(), reviewedAt: null }; db.cards.push(card); return { card }; }],
  ['PUT', /^\/flashcards\/cards\/(\d+)$/, (m, q, b) => ({ card: Object.assign(find(db.cards, m[1], 'Card'), { front: b.front, back: b.back }) })],
  ['DELETE', /^\/flashcards\/cards\/(\d+)$/, (m) => { db.cards = db.cards.filter((c) => String(c.id) !== m[1]); return {}; }],
  ['POST', /^\/flashcards\/cards\/(\d+)\/review$/, (m, q, b) => {
    const c = find(db.cards, m[1], 'Card');
    const g = Number(b.grade);
    if (g === 0) Object.assign(c, { repetitions: 0, interval: 0 });
    else Object.assign(c, { repetitions: c.repetitions + 1, interval: c.repetitions === 0 ? (g === 3 ? 3 : 1) : Math.round(Math.max(c.interval, 1) * (g === 1 ? 1.2 : 2.5)) });
    Object.assign(c, { reviewedAt: now(), dueAt: new Date(Date.now() + (c.interval ? c.interval * DAY : 60000)).toISOString() });
    return { card: c };
  }],
  ['POST', /^\/flashcards\/generate$/, async (m, q, b) => {
    await wait(1200);
    const topic = b.topic || db.materials.find((x) => String(x.id) === String(b.materialId))?.filename || 'Sample topic';
    return { topic, subject: b.subject, cards: Array.from({ length: Math.min(Number(b.count) || 6, 12) }, (_, i) => ({ front: `${topic} - key term ${i + 1}`, back: `Sample definition ${i + 1} (UI preview)` })) };
  }],

  ['GET', /^\/games\/stats$/, () => gameStats()],
  ['GET', /^\/games\/leaderboard$/, () => {
    const totals = {};
    db.games.forEach((g) => { totals[g.user] = (totals[g.user] || 0) + g.score; });
    return { leaderboard: Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([u, points]) => ({ ...people[u], points })) };
  }],
  ['GET', /^\/games\/pairs$/, (m, q) => ({ pairs: db.cards.slice(0, Number(q.limit) || 6).map((c) => ({ term: c.front, definition: c.back })) })],
  ['POST', /^\/games\/scores$/, (m, q, b) => { db.games.push({ user: ME, game: b.game, score: Math.round(b.score), won: Boolean(b.won), at: now() }); return {}; }],

  ['GET', /^\/social\/feed$/, (m, q) => ({ posts: db.posts.filter((p) => (!q.communityId || String(p.communityId) === String(q.communityId)) && (!q.authorId || p.user === q.authorId)).sort((a, b) => (a.at < b.at ? 1 : -1)).map(postPublic) })],
  ['POST', /^\/social\/posts$/, (m, q, b) => {
    const image = b.get('image');
    const content = String(b.get('content') || '').trim();
    if (!content && !image) throw new PreviewError('Write something or add an image.');
    db.posts.push({ id: id(), user: ME, communityId: b.get('communityId') ? Number(b.get('communityId')) : null, content, image: image ? image.uri : null, likes: new Set(), likeBase: 0, comments: [], at: now() });
    return {};
  }],
  ['DELETE', /^\/social\/posts\/(\d+)$/, (m) => { db.posts = db.posts.filter((p) => !(String(p.id) === m[1] && p.user === ME)); return {}; }],
  ['PUT', /^\/social\/posts\/(\d+)\/like$/, (m, q, b) => { const p = find(db.posts, m[1], 'Post'); b.liked ? p.likes.add(ME) : p.likes.delete(ME); return {}; }],
  ['GET', /^\/social\/posts\/(\d+)\/comments$/, (m) => ({ comments: find(db.posts, m[1], 'Post').comments.map((c) => ({ id: c.id, content: c.content, createdAt: c.at, author: people[c.user] })) })],
  ['POST', /^\/social\/posts\/(\d+)\/comments$/, (m, q, b) => { find(db.posts, m[1], 'Post').comments.push({ id: id(), user: ME, content: b.content, at: now() }); return {}; }],
  ['GET', /^\/social\/communities$/, () => ({ communities: db.communities.map((c) => ({ ...c, posts: db.posts.filter((p) => p.communityId === c.id).length })) })],
  ['GET', /^\/social\/communities\/([\w-]+)$/, (m) => {
    const c = db.communities.find((x) => x.slug === m[1] || String(x.id) === m[1]);
    if (!c) throw new PreviewError('Community not found.', 404);
    const top = [['u4', 2400], ['u5', 1850], ['u6', 1520], ['u7', 1200], [ME, 640]].map(([u, points]) => ({ ...people[u], points }));
    return { community: { ...c, posts: db.posts.filter((p) => p.communityId === c.id).length }, topContributors: top };
  }],
  ['PUT', /^\/social\/communities\/(\d+)\/membership$/, (m, q, b) => { const c = find(db.communities, m[1], 'Community'); if (c.joined !== b.joined) c.members += b.joined ? 1 : -1; c.joined = b.joined; return {}; }],
  ['GET', /^\/social\/users\/([\w-]+)$/, (m) => {
    const p = people[m[1]];
    if (!p) throw new PreviewError('Student not found.', 404);
    return { user: { ...p, handle: m[1] === ME ? `@${db.profile.preferences.username}` : `@${p.name.toLowerCase().replace(/\s+/g, '_')}`, school: m[1] === ME ? db.profile.preferences.school : null, educationLevel: null, isPrivate: false, isMe: m[1] === ME, createdAt: ago(30 * DAY), ...followStats(m[1]) } };
  }],
  ['PUT', /^\/social\/users\/([\w-]+)\/follow$/, (m, q, b) => { const key = `${ME}>${m[1]}`; b.follow ? db.follows.add(key) : db.follows.delete(key); return {}; }],

  ['POST', /^\/tools\/solve$/, async () => { await wait(1500); return { solution: `**Problem:** Quadratic equation\n\n**Question:** 2x² + 5x − 3 = 0\n\n**Solution:**\n1. Identify coefficients: a = 2, b = 5, c = −3\n2. Discriminant = b² − 4ac = 25 + 24 = 49\n3. √49 = 7\n4. x = (−5 ± 7) / 4\n\n**Answer:** x = 0.5 or x = −3${AI_NOTE}` }; }],
  ['POST', /^\/tools\/translate$/, async (m, q, b) => { await wait(700); return { detectedLanguage: b.from && b.from !== 'auto' ? b.from : 'English', translation: `[${b.to}] ${b.text}`, explanation: b.explain ? `- Sample explanation of word choices (UI preview).${AI_NOTE}` : '' }; }],
  ['POST', /^\/tools\/summarize$/, async (m, q, b) => { await wait(900); return { summary: `### Summary\n${String(b.text).slice(0, 180)}…\n\n**Key points**\n- Main idea\n- Supporting detail\n- Conclusion${AI_NOTE}` }; }],
  ['POST', /^\/tools\/essay$/, async (m, q, b) => { await wait(900); return { result: `## Outline: ${String(b.text).slice(0, 80)}\n\n**Thesis:** A clear, arguable claim.\n\n1. Introduction - hook and context\n2. Argument one with evidence\n3. Argument two with evidence\n4. Counter-argument and rebuttal\n5. Conclusion${AI_NOTE}` }; }],
  ['POST', /^\/tools\/lecture-notes$/, async (m, q, b) => { await wait(900); return { notes: `# ${b.title}\n\n## Main points\n${String(b.transcript).slice(0, 300)}\n\n## Key takeaways\n- Review these notes tonight${AI_NOTE}` }; }],
];

/** Handle one API request like the real backend would. */
export async function handle(method, path, { query = {}, body } = {}) {
  await wait(120); // feel like a network call
  if (!db.signedIn && path !== '/me') throw new PreviewError('Please log in to continue.', 401);
  if (!db.signedIn) throw new PreviewError('Please log in to continue.', 401);
  for (const [m, re, fn] of routes) {
    const match = m === method && path.match(re);
    if (match) return { success: true, ...(await fn(match, query, body || {})) };
  }
  throw new PreviewError(`Preview has no sample for ${method} ${path}.`, 404);
}

export const previewAuth = {
  signIn: () => { db.signedIn = true; },
  signOut: () => { db.signedIn = false; },
  isSignedIn: () => db.signedIn,
};
