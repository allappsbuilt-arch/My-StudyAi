/** Socials: feed, posts, likes, comments, communities, follows, profile cards. */
const { ctxOf } = require('../lib/context');
const { requireId } = require('../middleware/validate');
const { AppError } = require('../middleware/errorHandler');
const socialService = require('../services/socialService');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const userIdParam = (v) => {
  if (!UUID_RE.test(String(v || ''))) throw new AppError('Invalid user id.', 400);
  return v;
};

module.exports = {
  feed: async (req, res) => {
    const { communityId, authorId, limit } = req.query;
    res.json({
      success: true,
      posts: await socialService.feed(ctxOf(req), {
        communityId: communityId ? requireId(communityId, 'community id') : undefined,
        authorId: authorId ? userIdParam(authorId) : undefined,
        limit,
      }),
    });
  },
  createPost: async (req, res) => {
    await socialService.createPost(ctxOf(req), req.body, req.file);
    res.status(201).json({ success: true, message: 'Posted!' });
  },
  removePost: async (req, res) => {
    await socialService.removePost(ctxOf(req), requireId(req.params.id));
    res.json({ success: true });
  },
  like: async (req, res) => {
    await socialService.setLike(ctxOf(req), requireId(req.params.id), req.body.liked !== false);
    res.json({ success: true });
  },
  comments: async (req, res) => res.json({ success: true, comments: await socialService.comments(ctxOf(req), requireId(req.params.id)) }),
  addComment: async (req, res) => {
    await socialService.addComment(ctxOf(req), requireId(req.params.id), req.body.content);
    res.status(201).json({ success: true });
  },
  communities: async (req, res) => res.json({ success: true, communities: await socialService.communities(ctxOf(req)) }),
  community: async (req, res) => res.json({ success: true, ...(await socialService.community(ctxOf(req), String(req.params.slug).slice(0, 80))) }),
  membership: async (req, res) => {
    await socialService.setMembership(ctxOf(req), requireId(req.params.id, 'community id'), req.body.joined !== false);
    res.json({ success: true });
  },
  userCard: async (req, res) => res.json({ success: true, user: await socialService.userCard(ctxOf(req), userIdParam(req.params.id)) }),
  follow: async (req, res) => {
    await socialService.setFollow(ctxOf(req), userIdParam(req.params.id), req.body.follow !== false);
    res.json({ success: true });
  },
};
