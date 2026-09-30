/** /api/flashcards, /api/games */
const express = require('express');
const { flashcards, games } = require('../controllers/practiceController');
const { aiLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.get('/flashcards/decks', flashcards.decks);
router.post('/flashcards/decks', flashcards.createDeck);
router.get('/flashcards/decks/:id', flashcards.deck);
router.put('/flashcards/decks/:id', flashcards.updateDeck);
router.delete('/flashcards/decks/:id', flashcards.removeDeck);
router.post('/flashcards/decks/:id/cards', flashcards.addCard);
router.put('/flashcards/cards/:id', flashcards.updateCard);
router.delete('/flashcards/cards/:id', flashcards.removeCard);
router.post('/flashcards/cards/:id/review', flashcards.review);
router.post('/flashcards/generate', aiLimiter, flashcards.generate);

router.get('/games/stats', games.stats);
router.get('/games/leaderboard', games.leaderboard);
router.get('/games/pairs', games.pairs);
router.post('/games/scores', games.saveScore);

module.exports = router;
