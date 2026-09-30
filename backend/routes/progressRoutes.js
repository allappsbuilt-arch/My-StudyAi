/** /api/progress, /api/plan */
const express = require('express');
const { progress, plan } = require('../controllers/studyController');

const router = express.Router();
router.get('/progress', progress.overview);
router.get('/progress/weekly', progress.weekly);
router.post('/progress/study-time', progress.studyTime);
router.get('/plan', plan.overview);
router.post('/plan/tasks', plan.create);
router.patch('/plan/tasks/:id', plan.update);
router.delete('/plan/tasks/:id', plan.remove);

module.exports = router;
