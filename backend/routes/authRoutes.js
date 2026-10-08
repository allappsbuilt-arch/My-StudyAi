/**
 * /api/auth - sign-in for the mobile app, so the phone never needs a Supabase key.
 * The backend talks to Supabase Auth with its own service key and hands back the session tokens.
 * Public except POST /reset (needs a valid token). Rate limited per IP.
 */
const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { isolated, admin } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const { requireString, optionalString } = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
  })
);

/** Throw a Supabase Auth error as an AppError (message is shown to the student). */
function unwrap({ data, error }) {
  if (error) throw new AppError(error.message, Number(error.status) || 400, error.code);
  return data;
}

const sessionOf = (data) => ({
  session: data.session
    ? {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      }
    : null,
  user: data.user ? { id: data.user.id, email: data.user.email || '' } : null,
});

router.post('/register', async (req, res) => {
  const name = requireString(req.body.name, 'Name', { max: 80 });
  const email = requireString(req.body.email, 'Email', { max: 200 });
  const password = requireString(req.body.password, 'Password', { min: 8, max: 200 });
  const emailRedirectTo = optionalString(req.body.redirectTo, 'redirectTo', { max: 500 }) || undefined;
  const data = unwrap(await isolated().auth.signUp({ email, password, options: { data: { name }, emailRedirectTo } }));
  res.status(201).json({ success: true, ...sessionOf(data) });
});

router.post('/login', async (req, res) => {
  const email = requireString(req.body.email, 'Email', { max: 200 });
  const password = requireString(req.body.password, 'Password', { max: 200 });
  const data = unwrap(await isolated().auth.signInWithPassword({ email, password }));
  res.json({ success: true, ...sessionOf(data) });
});

router.post('/guest', async (req, res) => {
  const data = unwrap(await isolated().auth.signInAnonymously());
  res.json({ success: true, ...sessionOf(data) });
});

router.post('/refresh', async (req, res) => {
  const refresh_token = requireString(req.body.refresh_token, 'refresh_token', { max: 2000 });
  const data = unwrap(await isolated().auth.refreshSession({ refresh_token }));
  res.json({ success: true, ...sessionOf(data) });
});

router.post('/logout', async (req, res) => {
  const [, token] = (req.headers.authorization || '').split(' ');
  if (token) await admin().auth.admin.signOut(token).catch(() => {});
  res.json({ success: true });
});

router.post('/forgot', async (req, res) => {
  const email = requireString(req.body.email, 'Email', { max: 200 });
  const redirectTo = optionalString(req.body.redirectTo, 'redirectTo', { max: 500 }) || undefined;
  // Same answer whether or not the account exists
  await isolated().auth.resetPasswordForEmail(email, { redirectTo }).catch(() => {});
  res.json({ success: true, message: 'If an account exists for this email, a password reset link has been sent. Open it on this device.' });
});

router.post('/reset', protect, async (req, res) => {
  const password = requireString(req.body.password, 'Password', { min: 8, max: 200 });
  unwrap(await admin().auth.admin.updateUserById(req.user.id, { password }));
  res.json({ success: true });
});

module.exports = router;
