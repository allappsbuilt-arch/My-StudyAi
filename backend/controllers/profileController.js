/** /api/me, /api/profile - the signed-in student's account. */
const { ctxOf } = require('../lib/context');
const profileService = require('../services/profileService');
const progressService = require('../services/progressService');
const socialService = require('../services/socialService');
const dataService = require('../services/dataService');

// GET /api/me  -> { user }   (fast: used on sign-in)
async function me(req, res) {
  res.json({ success: true, user: await profileService.me(ctxOf(req)) });
}

// GET /api/profile  -> { user, stats, courses, social }
async function profile(req, res) {
  const ctx = ctxOf(req);
  const [user, overview, courses, social] = await Promise.all([
    profileService.me(ctx),
    progressService.overview(ctx, { activityLimit: 1 }),
    progressService.courses(ctx),
    socialService.userStats(ctx, ctx.userId),
  ]);
  res.json({ success: true, user, stats: { ...overview.progress, streak: overview.streak.current, cards: overview.cardsStudied }, courses, social });
}

// PUT /api/profile  { name?, educationLevel?, preferences?, removeAvatar?, currentPassword?, newPassword? }
async function update(req, res) {
  res.json({ success: true, message: 'Profile updated.', user: await profileService.update(ctxOf(req), req.body) });
}

// POST /api/profile/avatar  (multipart: avatar)
async function avatar(req, res) {
  res.json({ success: true, user: await profileService.uploadAvatar(ctxOf(req), req.file) });
}

// GET /api/profile/export  -> JSON download
async function exportData(req, res) {
  const data = await dataService.exportAll(ctxOf(req));
  res.setHeader('Content-Disposition', `attachment; filename="mystudyai-data-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(data);
}

module.exports = { me, profile, update, avatar, exportData };
