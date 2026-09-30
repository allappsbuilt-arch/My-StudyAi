/** /api/me, /api/profile */
const express = require('express');
const ctrl = require('../controllers/profileController');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();
router.get('/me', ctrl.me);
router.get('/profile', ctrl.profile);
router.put('/profile', ctrl.update);
router.post('/profile/avatar', uploadAvatar, ctrl.avatar);
router.get('/profile/export', ctrl.exportData);

module.exports = router;
