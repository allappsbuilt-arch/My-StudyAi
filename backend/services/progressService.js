/**
 * Progress: totals, streaks, weekly charts, recent activity, achievements, study-time tracking.
 * All dates follow the student's local calendar (ctx.offset).
 */
const { check } = require('../lib/supabase');
const { localDate, localHour, addDays, weekdayOf, localDateTime } = require('../lib/context');

const GAME_NAMES = { matching: 'Matching Game', battle: 'Quiz Battle', streak: 'Streak Challenge', memory: 'Memory Cards', spelling: 'Spelling Bee', mathrush: 'Math Rush' };

async function loadActivity(ctx) {
  const q = (table, cols, extra = (x) => x) => extra(ctx.db.from(table).select(cols).eq('user_id', ctx.userId)).then((r) => check(r, `Loading ${table}`));
  const [sessions, attempts, quizzes, materials, analyses, notes, chats, decks, cards, games] = await Promise.all([
    q('study_sessions', 'study_date, minutes'),
    q('quiz_attempts', 'quiz_id, percentage, completed_at'),
    q('quizzes', 'id, subject, topic'),
    q('materials', 'id, filename, file_type, uploaded_at'),
    q('analysis_results', 'material_id, title, created_at'),
    q('notes', 'id, title, subject, created_at'),
    q('chat_history', 'conversation_id, message, created_at', (b) => b.order('created_at', { ascending: false }).limit(1000)),
    q('flashcard_decks', 'id, title, subject, created_at'),
    q('flashcards', 'reviewed_at'),
    q('game_scores', 'game, score, won, played_at'),
  ]);
  return { sessions, attempts, quizzes, materials, analyses, notes, chats, decks, cards, games };
}

function computeStreaks(dateSet, today) {
  let current = 0;
  let cursor = dateSet.has(today) ? today : addDays(today, -1);
  while (dateSet.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  let longest = 0;
  let run = 0;
  let prev = null;
  [...dateSet].sort().forEach((d) => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  });
  return { current, longest, studiedToday: dateSet.has(today) };
}

function activeDates(ctx, a) {
  const ld = (v) => localDate(ctx.offset, v);
  return new Set([
    ...a.sessions.filter((s) => s.minutes > 0).map((s) => s.study_date),
    ...a.attempts.map((x) => ld(x.completed_at)),
    ...a.materials.map((x) => ld(x.uploaded_at)),
    ...a.chats.map((x) => ld(x.created_at)),
    ...a.cards.filter((c) => c.reviewed_at).map((c) => ld(c.reviewed_at)),
    ...a.games.map((g) => ld(g.played_at)),
  ]);
}

/** Streak milestones and badges earned from the student's own activity. */
function achievements(ctx, dateSet, a) {
  const out = [];
  let run = 0;
  let prev = null;
  [...dateSet].sort().forEach((d) => {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    prev = d;
    if ([3, 7, 14, 30, 50, 100, 365].includes(run)) out.push({ type: 'streak', refId: `streak-${d}`, title: `${run} day study streak achieved! 🔥`, meta: null, at: localDateTime(ctx.offset, d) });
  });
  const stamps = [
    ...a.attempts.map((x) => x.completed_at), ...a.materials.map((x) => x.uploaded_at), ...a.chats.map((x) => x.created_at),
    ...a.notes.map((x) => x.created_at), ...a.decks.map((x) => x.created_at), ...a.games.map((x) => x.played_at),
    ...a.cards.map((c) => c.reviewed_at).filter(Boolean),
  ].sort();
  const first = (list) => [...list].sort()[0];
  const badge = (name, at) => at && out.push({ type: 'badge', refId: `badge-${name}`, title: `Earned "${name}" badge`, meta: null, at });
  badge('Early Bird', stamps.find((ts) => localHour(ctx.offset, ts) < 8));
  badge('Night Owl', stamps.find((ts) => localHour(ctx.offset, ts) >= 23));
  badge('Quiz Starter', first(a.attempts.map((x) => x.completed_at)));
  badge('Perfect Score', first(a.attempts.filter((x) => Number(x.percentage) === 100).map((x) => x.completed_at)));
  badge('Card Creator', first(a.decks.map((x) => x.created_at)));
  badge('Game Winner', first(a.games.filter((g) => g.won).map((g) => g.played_at)));
  return out;
}

function weeklyFrom(ctx, a, days) {
  const today = localDate(ctx.offset);
  const from = addDays(today, -(days - 1));
  const minutes = Object.fromEntries(a.sessions.map((s) => [s.study_date, s.minutes]));
  const bucket = (list, col) => {
    const out = {};
    list.forEach((r) => (out[localDate(ctx.offset, r[col])] ||= []).push(r));
    return out;
  };
  const quizzes = bucket(a.attempts, 'completed_at');
  const uploads = bucket(a.materials, 'uploaded_at');
  const chats = bucket(a.chats, 'created_at');
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    const qs = quizzes[d] || [];
    return {
      date: d,
      day: weekdayOf(d),
      minutes: minutes[d] || 0,
      quizzes: qs.length,
      averageScore: qs.length ? Math.round((qs.reduce((s, x) => s + Number(x.percentage), 0) / qs.length) * 10) / 10 : null,
      uploads: (uploads[d] || []).length,
      chats: new Set((chats[d] || []).map((c) => c.conversation_id)).size,
    };
  });
}

async function overview(ctx, { activityLimit = 10 } = {}) {
  const a = await loadActivity(ctx);
  const today = localDate(ctx.offset);
  const dates = activeDates(ctx, a);
  const quizById = Object.fromEntries(a.quizzes.map((q) => [q.id, q]));
  const materialById = Object.fromEntries(a.materials.map((m) => [m.id, m]));

  const bySubject = {};
  a.attempts.forEach((x) => {
    const s = quizById[x.quiz_id]?.subject;
    if (s) (bySubject[s] ||= []).push(Number(x.percentage));
  });
  const firstChat = {};
  a.chats.forEach((c) => { firstChat[c.conversation_id] = c; }); // newest-first list: last write = first message

  const limit = Math.min(Math.max(Number(activityLimit) || 10, 1), 100);
  const activity = [
    ...a.materials.map((m) => ({ type: 'upload', refId: m.id, title: `Uploaded ${m.filename}`, meta: m.file_type, at: m.uploaded_at })),
    ...a.analyses.map((x) => ({ type: 'analysis', refId: x.material_id, title: `AI analysed ${materialById[x.material_id]?.filename || x.title || 'a file'}`, meta: null, at: x.created_at })),
    ...a.attempts.map((x) => ({ type: 'quiz', refId: x.quiz_id, title: `Scored ${Math.round(x.percentage)}% on ${quizById[x.quiz_id]?.topic || 'a'} quiz`, meta: quizById[x.quiz_id]?.subject, at: x.completed_at })),
    ...a.notes.map((n) => ({ type: 'note', refId: n.id, title: `Created note: ${n.title}`, meta: n.subject, at: n.created_at })),
    ...Object.values(firstChat).map((c) => ({ type: 'chat', refId: c.conversation_id, title: `Asked AI Tutor: ${c.message.slice(0, 60)}`, meta: c.conversation_id, at: c.created_at })),
    ...a.decks.map((d) => ({ type: 'deck', refId: d.id, title: `Created flashcards: ${d.title}`, meta: d.subject, at: d.created_at })),
    ...a.games.map((g) => ({ type: 'game', refId: g.game, title: `${g.won ? 'Won' : 'Played'} ${GAME_NAMES[g.game] || g.game} · ${g.score} pts`, meta: g.game, at: g.played_at })),
    ...achievements(ctx, dates, a),
  ]
    .sort((x, y) => (x.at < y.at ? 1 : -1))
    .slice(0, limit);

  const week = weeklyFrom(ctx, a, 7);
  const avg = a.attempts.length ? a.attempts.reduce((s, x) => s + Number(x.percentage), 0) / a.attempts.length : 0;
  return {
    progress: {
      studyTime: a.sessions.reduce((s, x) => s + x.minutes, 0),
      materialsCompleted: a.analyses.length,
      quizzesCompleted: a.attempts.length,
      averageScore: Math.round(avg * 100) / 100,
    },
    streak: computeStreaks(dates, today),
    today: week[week.length - 1],
    weekMinutes: week.reduce((s, d) => s + d.minutes, 0),
    cardsStudied: a.cards.filter((c) => c.reviewed_at).length,
    scoreBySubject: Object.entries(bySubject).map(([subject, list]) => ({
      subject, attempts: list.length, averageScore: Math.round((list.reduce((s, v) => s + v, 0) / list.length) * 10) / 10,
    })),
    recentActivity: activity,
  };
}

async function weekly(ctx, days = 7) {
  const a = await loadActivity(ctx);
  const data = weeklyFrom(ctx, a, Math.min(Math.max(Number(days) || 7, 7), 30));
  return {
    days: data,
    totals: {
      minutes: data.reduce((s, d) => s + d.minutes, 0),
      quizzes: data.reduce((s, d) => s + d.quizzes, 0),
      uploads: data.reduce((s, d) => s + d.uploads, 0),
      chats: data.reduce((s, d) => s + d.chats, 0),
      activeDays: data.filter((d) => d.minutes || d.quizzes || d.uploads || d.chats).length,
    },
  };
}

/** Add studied minutes to today's row (1-15 per call, sent by the app's activity timer). */
async function addStudyTime(ctx, minutes) {
  const date = localDate(ctx.offset);
  const row = check(await ctx.db.from('study_sessions').select('minutes').eq('user_id', ctx.userId).eq('study_date', date).maybeSingle(), 'Loading study time');
  check(
    await ctx.db.from('study_sessions').upsert({ user_id: ctx.userId, study_date: date, minutes: (row?.minutes || 0) + minutes }, { onConflict: 'user_id,study_date' }),
    'Saving study time'
  );
}

/** Subjects the student works with (notes, quizzes, materials, flashcard sets). */
async function courses(ctx) {
  const lists = await Promise.all(
    ['notes', 'quizzes', 'materials', 'flashcard_decks'].map((t) => ctx.db.from(t).select('subject').eq('user_id', ctx.userId).then((r) => check(r, `Loading ${t}`)))
  );
  const counts = {};
  lists.flat().forEach(({ subject }) => subject && (counts[subject] = (counts[subject] || 0) + 1));
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([subject, items]) => ({ subject, items }));
}

module.exports = { overview, weekly, addStudyTime, courses, GAME_NAMES };
