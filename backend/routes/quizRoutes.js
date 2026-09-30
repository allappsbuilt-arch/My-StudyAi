/** /api/quiz */
const express = require('express');
const { quiz } = require('../controllers/studyController');
const { aiLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.post('/generate', aiLimiter, quiz.generate);
router.get('/history', quiz.history);
router.get('/attempt/:attemptId', quiz.attempt);
router.get('/:id', quiz.get);
router.post('/:id/submit', quiz.submit);

module.exports = router;
