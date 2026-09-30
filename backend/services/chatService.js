/** AI Tutor conversations stored in chat_history (the student's own rows). */
const crypto = require('crypto');
const { check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const aiService = require('./aiService');
const materialService = require('./materialService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY_TURNS = 20;

const exchange = (r) => ({ id: r.id, conversationId: r.conversation_id, message: r.message, response: r.response, createdAt: r.created_at });

function checkId(id) {
  if (!UUID_RE.test(String(id || ''))) throw new AppError('Invalid conversation id.', 400);
  return id;
}

async function chat(ctx, { message, conversationId, materialId }) {
  const text = String(message || '').trim();
  if (!text) throw new AppError('Message is required.', 400);
  if (text.length > 8000) throw new AppError('Message is too long.', 400);
  const convo = conversationId ? checkId(conversationId) : crypto.randomUUID();

  let material = null;
  if (materialId) {
    const { material: m, analysis } = await materialService.analysedText(ctx, Number(materialId));
    material = { title: analysis?.title || m.filename, summary: analysis?.summary, text: analysis?.extracted_text };
  }
  const recent = check(
    await ctx.db.from('chat_history').select('message, response').eq('user_id', ctx.userId).eq('conversation_id', convo).order('created_at', { ascending: false }).limit(HISTORY_TURNS),
    'Loading the conversation'
  );
  const response = await aiService.tutorReply(recent.reverse(), text, material);
  const saved = check(
    await ctx.db.from('chat_history').insert({ user_id: ctx.userId, conversation_id: convo, message: text, response }).select().single(),
    'Saving the chat'
  );
  return { conversationId: convo, exchange: exchange(saved) };
}

async function conversations(ctx) {
  const rows = check(
    await ctx.db.from('chat_history').select('conversation_id, message, created_at').eq('user_id', ctx.userId).order('created_at', { ascending: true }).limit(2000),
    'Loading conversations'
  );
  const map = new Map();
  for (const r of rows) {
    const c = map.get(r.conversation_id) || { conversationId: r.conversation_id, title: r.message.slice(0, 80), messageCount: 0, startedAt: r.created_at };
    c.messageCount += 1;
    c.lastMessageAt = r.created_at;
    map.set(r.conversation_id, c);
  }
  return [...map.values()].sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1)).slice(0, 50);
}

async function conversation(ctx, id) {
  const rows = check(
    await ctx.db.from('chat_history').select('*').eq('user_id', ctx.userId).eq('conversation_id', checkId(id)).order('created_at', { ascending: true }),
    'Loading the conversation'
  );
  return rows.map(exchange);
}

async function removeConversation(ctx, id) {
  check(await ctx.db.from('chat_history').delete().eq('user_id', ctx.userId).eq('conversation_id', checkId(id)), 'Deleting the conversation');
}

async function clear(ctx) {
  check(await ctx.db.from('chat_history').delete().eq('user_id', ctx.userId), 'Clearing chat history');
}

module.exports = { chat, conversations, conversation, removeConversation, clear };
