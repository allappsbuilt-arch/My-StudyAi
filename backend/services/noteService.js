/** Notes: create, read, update, delete, search, filter by subject (the student's own rows only). */
const { check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');

const toPublic = (n) => ({ id: n.id, title: n.title, subject: n.subject, content: n.content, createdAt: n.created_at, updatedAt: n.updated_at });

function read(body) {
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title) throw new AppError('Title is required.', 400);
  if (!content) throw new AppError('Content is required.', 400);
  if (content.length > 200000) throw new AppError('The note is too long.', 400);
  return { title: title.slice(0, 200), subject: String(body.subject || '').trim().slice(0, 100) || null, content };
}

async function list(ctx, { search, subject }) {
  let q = ctx.db.from('notes').select('*').eq('user_id', ctx.userId).order('updated_at', { ascending: false });
  if (subject) q = q.eq('subject', subject);
  if (search) {
    const s = search.replace(/[%,()]/g, '');
    q = q.or(`title.ilike.%${s}%,content.ilike.%${s}%,subject.ilike.%${s}%`);
  }
  return check(await q, 'Loading notes').map(toPublic);
}

async function get(ctx, id) {
  const n = check(await ctx.db.from('notes').select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle(), 'Loading the note');
  if (!n) throw new AppError('Note not found.', 404);
  return toPublic(n);
}

async function create(ctx, body) {
  return toPublic(check(await ctx.db.from('notes').insert({ ...read(body), user_id: ctx.userId }).select().single(), 'Saving the note'));
}

async function update(ctx, id, body) {
  const n = check(await ctx.db.from('notes').update(read(body)).eq('id', id).eq('user_id', ctx.userId).select().maybeSingle(), 'Saving the note');
  if (!n) throw new AppError('Note not found.', 404);
  return toPublic(n);
}

async function remove(ctx, id) {
  check(await ctx.db.from('notes').delete().eq('id', id).eq('user_id', ctx.userId), 'Deleting the note');
}

module.exports = { list, get, create, update, remove };
