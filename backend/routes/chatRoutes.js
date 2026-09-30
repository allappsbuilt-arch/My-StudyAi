/** /api/ai - AI Tutor */
const express = require('express');
const { chat } = require('../controllers/studyController');
const { aiLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.post('/chat', aiLimiter, chat.send);
router.get('/conversations', chat.list);
router.delete('/conversations', chat.clear);
router.get('/conversations/:id', chat.get);
router.delete('/conversations/:id', chat.remove);

module.exports = router;
