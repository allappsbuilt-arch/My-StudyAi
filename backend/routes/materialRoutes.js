/** /api/materials - uploads, list, details, file links, AI analysis */
const express = require('express');
const { materials } = require('../controllers/studyController');
const { uploadMaterial } = require('../middleware/upload');
const { aiLimiter } = require('../middleware/rateLimits');

const router = express.Router();
router.get('/', materials.list);
router.post('/', uploadMaterial, materials.upload);
router.get('/:id', materials.get);
router.delete('/:id', materials.remove);
router.get('/:id/file-url', materials.fileUrl);
router.get('/:id/analysis', materials.analysis);
router.post('/:id/analysis', aiLimiter, materials.startAnalysis);

module.exports = router;
