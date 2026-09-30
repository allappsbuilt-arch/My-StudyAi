/** /api/social */
const express = require('express');
const ctrl = require('../controllers/socialController');
const { uploadPostImage } = require('../middleware/upload');

const router = express.Router();
router.get('/feed', ctrl.feed);
router.post('/posts', uploadPostImage, ctrl.createPost);
router.delete('/posts/:id', ctrl.removePost);
router.put('/posts/:id/like', ctrl.like);
router.get('/posts/:id/comments', ctrl.comments);
router.post('/posts/:id/comments', ctrl.addComment);
router.get('/communities', ctrl.communities);
router.get('/communities/:slug', ctrl.community);
router.put('/communities/:id/membership', ctrl.membership);
router.get('/users/:id', ctrl.userCard);
router.put('/users/:id/follow', ctrl.follow);

module.exports = router;
