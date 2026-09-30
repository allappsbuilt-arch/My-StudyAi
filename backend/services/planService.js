/** Study plan: today's tasks and the current Monday-Sunday week. */
const { check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const { localDate, addDays, weekdayOf, weekdayIndex } = require('../lib/context');

const toPublic = (t) => ({ id: t.id, title: t.title, topic: t.topic, minutes: t.minutes, date: t.task_date, done: t.done });

async function overview(ctx) {
  const today = localDate(ctx.offset);
  const monday = addDays(today, -weekdayIndex(today));
  const sunday = addDays(monday, 6);
  const [tasks, sessions] = await Promise.all([
    ctx.db.from('study_tasks').select('*').eq('user_id', ctx.userId).gte('task_date', monday).lte('task_date', sunday).order('created_at', { ascending: true }).then((r) => check(r, 'Loading tasks')),
    ctx.db.from('study_sessions').select('study_date, minutes').eq('user_id', ctx.userId).gte('study_date', monday).lte('study_date', sunday).then((r) => check(r, 'Loading study time')),
  ]);
  const all = tasks.map(toPublic);
  const minutes = Object.fromEntries(sessions.map((s) => [s.study_date, s.minutes]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const dayTasks = all.filter((t) => t.date === date);
    return {
      date, day: weekdayOf(date), dayNum: Number(date.slice(8)), minutes: minutes[date] || 0,
      planned: dayTasks.reduce((s, t) => s + t.minutes, 0), done: dayTasks.filter((t) => t.done).length, total: dayTasks.length, isToday: date === today,
    };
  });
  const todays = all.filter((t) => t.date === today);
  const [y, m, d] = today.split('-').map(Number);
  return {
    today,
    tasks: todays,
    week,
    subjects: new Set(all.map((t) => t.title)).size,
    activeDays: new Set(all.map((t) => t.date)).size,
    progress: all.length ? Math.round((all.filter((t) => t.done).length / all.length) * 100) : 0,
    todayProgress: todays.length ? Math.round((todays.filter((t) => t.done).length / todays.length) * 100) : 0,
    daysLeftInMonth: new Date(Date.UTC(y, m, 0)).getUTCDate() - d,
  };
}

async function create(ctx, { title, topic, minutes, date }) {
  const name = String(title || '').trim();
  if (!name) throw new AppError('Subject is required.', 400);
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : localDate(ctx.offset);
  const mins = Math.min(Math.max(parseInt(minutes, 10) || 30, 5), 600);
  return toPublic(
    check(
      await ctx.db.from('study_tasks').insert({ user_id: ctx.userId, title: name.slice(0, 120), topic: String(topic || '').trim().slice(0, 200) || null, minutes: mins, task_date: day }).select().single(),
      'Saving the task'
    )
  );
}

async function update(ctx, id, body) {
  const patch = {};
  if (body.done !== undefined) patch.done = Boolean(body.done);
  if (body.title !== undefined) patch.title = String(body.title).trim().slice(0, 120);
  if (body.topic !== undefined) patch.topic = String(body.topic || '').trim().slice(0, 200) || null;
  if (body.minutes !== undefined) patch.minutes = Math.min(Math.max(parseInt(body.minutes, 10) || 30, 5), 600);
  if (!Object.keys(patch).length) throw new AppError('Nothing to update.', 400);
  const t = check(await ctx.db.from('study_tasks').update(patch).eq('id', id).eq('user_id', ctx.userId).select().maybeSingle(), 'Saving the task');
  if (!t) throw new AppError('Task not found.', 404);
  return toPublic(t);
}

async function remove(ctx, id) {
  check(await ctx.db.from('study_tasks').delete().eq('id', id).eq('user_id', ctx.userId), 'Deleting the task');
}

module.exports = { overview, create, update, remove };
