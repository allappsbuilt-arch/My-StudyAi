/**
 * Flashcard sets and cards with SM-2 style spaced repetition.
 * grade: 0 = again, 1 = hard, 2 = good, 3 = easy
 */
const { check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const aiService = require('./aiService');
const materialService = require('./materialService');

const cardToPublic = (c) => ({
  id: c.id, deckId: c.deck_id, front: c.front, back: c.back, interval: c.interval_days, repetitions: c.repetitions, ease: Number(c.ease), dueAt: c.due_at, reviewedAt: c.reviewed_at,
});

function deckToPublic(d, cards) {
  const now = new Date().toISOString();
  const mine = cards.filter((c) => String(c.deck_id) === String(d.id));
  const mastered = mine.filter((c) => c.interval_days >= 7).length;
  const last = mine.map((c) => c.reviewed_at).filter(Boolean).sort().pop() || null;
  return {
    id: d.id, title: d.title, description: d.description, subject: d.subject, tags: d.tags || [], materialId: d.material_id,
    cardCount: mine.length, dueCount: mine.filter((c) => c.due_at <= now).length, masteredCount: mastered,
    mastery: mine.length ? Math.round((mastered / mine.length) * 100) : 0, lastStudiedAt: last, createdAt: d.created_at, updatedAt: d.updated_at,
  };
}

function readCard(c) {
  const front = String(c?.front || '').trim();
  const back = String(c?.back || '').trim();
  if (!front || !back) throw new AppError('Each card needs a front and a back.', 400);
  return { front: front.slice(0, 1000), back: back.slice(0, 2000) };
}

function readDeck(body) {
  const title = String(body.title || '').trim();
  const subject = String(body.subject || '').trim();
  if (!title) throw new AppError('Title is required.', 400);
  if (!subject) throw new AppError('Choose a subject.', 400);
  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 10) : [];
  return { title: title.slice(0, 150), description: String(body.description || '').trim() || null, subject: subject.slice(0, 100), tags };
}

async function getDeckRow(ctx, id) {
  const d = check(await ctx.db.from('flashcard_decks').select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle(), 'Loading the set');
  if (!d) throw new AppError('Flashcard set not found.', 404);
  return d;
}

async function listDecks(ctx) {
  const [decks, cards] = await Promise.all([
    ctx.db.from('flashcard_decks').select('*').eq('user_id', ctx.userId).then((r) => check(r, 'Loading sets')),
    ctx.db.from('flashcards').select('deck_id, interval_days, due_at, reviewed_at').eq('user_id', ctx.userId).then((r) => check(r, 'Loading cards')),
  ]);
  return decks.map((d) => deckToPublic(d, cards)).sort((a, b) => ((b.lastStudiedAt || b.updatedAt) > (a.lastStudiedAt || a.updatedAt) ? 1 : -1));
}

async function getDeck(ctx, id) {
  const d = await getDeckRow(ctx, id);
  const cards = check(await ctx.db.from('flashcards').select('*').eq('deck_id', id).eq('user_id', ctx.userId).order('id'), 'Loading cards');
  return { deck: deckToPublic(d, cards), cards: cards.map(cardToPublic) };
}

async function createDeck(ctx, body) {
  const deck = readDeck(body);
  const cards = (Array.isArray(body.cards) ? body.cards : []).slice(0, 500).map(readCard);
  let materialId = null;
  if (body.materialId) {
    materialId = Number(body.materialId);
    await materialService.analysedText(ctx, materialId); // ownership check
  }
  const d = check(await ctx.db.from('flashcard_decks').insert({ ...deck, user_id: ctx.userId, material_id: materialId }).select().single(), 'Saving the set');
  if (cards.length) check(await ctx.db.from('flashcards').insert(cards.map((c) => ({ ...c, deck_id: d.id, user_id: ctx.userId }))), 'Saving cards');
  return { id: d.id };
}

async function updateDeck(ctx, id, body) {
  await getDeckRow(ctx, id);
  check(await ctx.db.from('flashcard_decks').update(readDeck(body)).eq('id', id).eq('user_id', ctx.userId), 'Saving the set');
}

async function removeDeck(ctx, id) {
  check(await ctx.db.from('flashcard_decks').delete().eq('id', id).eq('user_id', ctx.userId), 'Deleting the set');
}

async function addCard(ctx, deckId, body) {
  await getDeckRow(ctx, deckId);
  const c = check(await ctx.db.from('flashcards').insert({ ...readCard(body), deck_id: deckId, user_id: ctx.userId }).select().single(), 'Saving the card');
  await ctx.db.from('flashcard_decks').update({ updated_at: new Date().toISOString() }).eq('id', deckId).eq('user_id', ctx.userId);
  return cardToPublic(c);
}

async function getCardRow(ctx, id) {
  const c = check(await ctx.db.from('flashcards').select('*').eq('id', id).eq('user_id', ctx.userId).maybeSingle(), 'Loading the card');
  if (!c) throw new AppError('Card not found.', 404);
  return c;
}

async function updateCard(ctx, id, body) {
  await getCardRow(ctx, id);
  return cardToPublic(check(await ctx.db.from('flashcards').update(readCard(body)).eq('id', id).eq('user_id', ctx.userId).select().single(), 'Saving the card'));
}

async function removeCard(ctx, id) {
  check(await ctx.db.from('flashcards').delete().eq('id', id).eq('user_id', ctx.userId), 'Deleting the card');
}

/** SM-2 review: schedule the card's next due date from the grade. */
async function review(ctx, id, grade) {
  const g = Number(grade);
  if (![0, 1, 2, 3].includes(g)) throw new AppError('Grade must be 0-3.', 400);
  const card = await getCardRow(ctx, id);
  let ease = Number(card.ease) || 2.5;
  let interval = card.interval_days || 0;
  let repetitions = card.repetitions || 0;
  if (g === 0) {
    repetitions = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = g === 3 ? 3 : 1;
    else if (repetitions === 2) interval = g === 1 ? 3 : 6;
    else interval = Math.round(interval * (g === 1 ? 1.2 : ease) * (g === 3 ? 1.3 : 1));
    ease = Math.max(1.3, ease + [0, -0.15, 0, 0.15][g]);
  }
  const due = new Date(Date.now() + (interval ? interval * 86400000 : 60000)).toISOString();
  return cardToPublic(
    check(
      await ctx.db
        .from('flashcards')
        .update({ ease: Math.round(ease * 100) / 100, interval_days: interval, repetitions, due_at: due, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.userId)
        .select()
        .single(),
      'Saving the review'
    )
  );
}

/** AI flashcards from a topic or an analysed material (returned for review, not saved). */
async function generate(ctx, body) {
  const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 3), 40);
  let topic = String(body.topic || '').trim();
  const subject = String(body.subject || '').trim() || null;
  let materialText;
  if (body.materialId) {
    const { analysis } = await materialService.analysedText(ctx, Number(body.materialId));
    if (!analysis) throw new AppError('Analyse this material with AI first, then create flashcards from it.', 400);
    materialText = analysis.extracted_text || analysis.summary;
    topic = topic || analysis.title;
  }
  if (!topic) throw new AppError('Topic is required.', 400);
  const cards = await aiService.generateFlashcards({ topic: topic.slice(0, 200), subject, count, materialText });
  return { topic, subject, cards };
}

/** Random term/definition pairs from the student's own cards (for the Matching and Memory games). */
async function randomPairs(ctx, limit = 6) {
  const cards = check(await ctx.db.from('flashcards').select('front, back').eq('user_id', ctx.userId).limit(500), 'Loading cards');
  return cards
    .filter((c) => c.front.length <= 60 && c.back.length <= 140)
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(Math.max(Number(limit) || 6, 2), 12))
    .map((c) => ({ term: c.front, definition: c.back }));
}

module.exports = { listDecks, getDeck, createDeck, updateDeck, removeDeck, addCard, updateCard, removeCard, review, generate, randomPairs };
