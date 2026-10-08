/**
 * All API routes. Everything below requires a valid Supabase access token (middleware/auth.js).
 */
const express = require('express');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.use('/auth', require('./authRoutes'));
router.use(protect, apiLimiter);

router.use('/', require('./profileRoutes'));
router.use('/', require('./progressRoutes'));
router.use('/', require('./practiceRoutes'));
router.use('/materials', require('./materialRoutes'));
router.use('/notes', require('./noteRoutes'));
router.use('/quiz', require('./quizRoutes'));
router.use('/ai', require('./chatRoutes'));
router.use('/social', require('./socialRoutes'));
router.use('/tools', require('./toolRoutes'));

module.exports = router;
