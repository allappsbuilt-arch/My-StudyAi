/** Per-student rate limits (applied after authentication, keyed by user id). */
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const byUser = (req) => (req.user?.id ? `user-${req.user.id}` : ipKeyGenerator(req.ip));

// General API use: generous, stops runaway loops
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  keyGenerator: byUser,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down for a moment.' },
});

// AI calls cost money: max 30 per minute per student
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: byUser,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'You are sending AI requests too quickly. Please wait a moment.' },
});

module.exports = { apiLimiter, aiLimiter };
