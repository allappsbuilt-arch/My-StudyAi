/** Flashcards (spaced repetition + AI generation) and learning games. */
const { ctxOf } = require('../lib/context');
const { requireId } = require('../middleware/validate');
const flashcardService = require('../services/flashcardService');
const gameService = require('../services/gameService');

const flashcards = {
  decks: async (req, res) => res.json({ success: true, decks: await flashcardService.listDecks(ctxOf(req)) }),
  deck: async (req, res) => res.json({ success: true, ...(await flashcardService.getDeck(ctxOf(req), requireId(req.params.id))) }),
  createDeck: async (req, res) => res.status(201).json({ success: true, deck: await flashcardService.createDeck(ctxOf(req), req.body) }),
  updateDeck: async (req, res) => {
    await flashcardService.updateDeck(ctxOf(req), requireId(req.params.id), req.body);
    res.json({ success: true });
  },
  removeDeck: async (req, res) => {
    await flashcardService.removeDeck(ctxOf(req), requireId(req.params.id));
    res.json({ success: true });
  },
  addCard: async (req, res) => res.status(201).json({ success: true, card: await flashcardService.addCard(ctxOf(req), requireId(req.params.id), req.body) }),
  updateCard: async (req, res) => res.json({ success: true, card: await flashcardService.updateCard(ctxOf(req), requireId(req.params.id), req.body) }),
  removeCard: async (req, res) => {
    await flashcardService.removeCard(ctxOf(req), requireId(req.params.id));
    res.json({ success: true });
  },
  review: async (req, res) => res.json({ success: true, card: await flashcardService.review(ctxOf(req), requireId(req.params.id), req.body.grade) }),
  generate: async (req, res) => res.json({ success: true, ...(await flashcardService.generate(ctxOf(req), req.body)) }),
};

const games = {
  saveScore: async (req, res) => {
    await gameService.saveScore(ctxOf(req), req.body);
    res.status(201).json({ success: true });
  },
  stats: async (req, res) => res.json({ success: true, ...(await gameService.stats(ctxOf(req))) }),
  leaderboard: async (req, res) => res.json({ success: true, leaderboard: await gameService.leaderboard(ctxOf(req)) }),
  pairs: async (req, res) => res.json({ success: true, pairs: await flashcardService.randomPairs(ctxOf(req), req.query.limit) }),
};

module.exports = { flashcards, games };
