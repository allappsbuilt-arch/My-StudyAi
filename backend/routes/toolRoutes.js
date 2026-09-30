/** /api/tools - AI study tools */
const express = require('express');
const ctrl = require('../controllers/toolsController');
const { uploadScanImage } = require('../middleware/upload');
const { aiLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.use(aiLimiter);
router.post('/solve', uploadScanImage, ctrl.solve);
router.post('/translate', ctrl.translate);
router.post('/summarize', ctrl.summarize);
router.post('/essay', ctrl.essay);
router.post('/lecture-notes', ctrl.lectureNotes);

module.exports = router;
