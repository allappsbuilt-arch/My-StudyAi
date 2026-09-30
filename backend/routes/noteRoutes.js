/** /api/notes */
const express = require('express');
const { notes } = require('../controllers/studyController');

const router = express.Router();
router.get('/', notes.list);
router.post('/', notes.create);
router.get('/:id', notes.get);
router.put('/:id', notes.update);
router.delete('/:id', notes.remove);

module.exports = router;
