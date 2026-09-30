/**
 * Profiles: the signed-in student's profile, preferences, avatar and password.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { admin, check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const storage = require('./storageService');

const EDUCATION_LEVELS = ['Middle School', 'High School', 'Undergraduate', 'Postgraduate', 'Professional Exam', 'Self-Study'];

const DEFAULT_PREFERENCES = {
  darkMode: false, studyReminders: true, pushNotifications: true, onboarded: false, subjects: [], studyMethods: [], language: 'en', role: 'student',
  streakAlerts: true, reminderTime: '18:00', profileVisibility: 'public', showStudyStats: true, showOnlineStatus: true, username: '', school: '',
};

// Allowed preference keys and how to clean them
const PREF_RULES = {
  darkMode: 'bool', studyReminders: 'bool', pushNotifications: 'bool', onboarded: 'bool', streakAlerts: 'bool', showStudyStats: 'bool', showOnlineStatus: 'bool',
  subjects: 'list', studyMethods: 'list',
  language: ['en', 'hi', 'es'], role: ['student', 'teacher'], profileVisibility: ['public', 'private'],
  reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/, username: /^[a-z0-9_.]{3,30}$/, school: 'text',
};

function cleanPreferences(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AppError('Invalid preferences.', 400);
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const rule = PREF_RULES[key];
    if (!rule) continue;
    if (rule === 'bool') out[key] = Boolean(value);
    else if (rule === 'list') {
      if (!Array.isArray(value)) throw new AppError(`${key} must be a list.`, 400);
      out[key] = value.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim().slice(0, 60)).slice(0, 30);
    } else if (rule === 'text') out[key] = String(value || '').trim().slice(0, 120);
    else if (Array.isArray(rule)) {
      if (!rule.includes(value)) throw new AppError(`Invalid ${key}.`, 400);
      out[key] = value;
    } else if (rule instanceof RegExp) {
      if (key === 'username' && value === '') out[key] = '';
      else if (!rule.test(String(value))) throw new AppError(key === 'username' ? 'Username: 3-30 characters, lowercase letters, numbers, _ or .' : `Invalid ${key}.`, 400);
      else out[key] = String(value);
    }
  }
  return out;
}

function toUser(profile, authUser) {
  return {
    id: authUser.id,
    name: profile?.name || authUser.metadata?.name || 'Student',
    email: authUser.email || '',
    isGuest: Boolean(authUser.isAnonymous),
    avatarUrl: storage.publicUrl('avatars', profile?.avatar_path),
    educationLevel: profile?.education_level || null,
    preferences: { ...DEFAULT_PREFERENCES, ...(profile?.preferences || {}) },
    createdAt: profile?.created_at,
  };
}

/** The profile row, created on the fly if the sign-up trigger didn't run (e.g. users created before the migration). */
async function loadProfile(ctx) {
  let profile = check(await ctx.db.from('profiles').select('*').eq('id', ctx.userId).maybeSingle(), 'Loading your profile');
  if (!profile) {
    const name = ctx.user.metadata?.name || (ctx.user.email ? ctx.user.email.split('@')[0] : 'Student');
    const prefs = { ...DEFAULT_PREFERENCES, onboarded: ctx.user.isAnonymous };
    profile = check(await ctx.db.from('profiles').insert({ id: ctx.userId, name, preferences: prefs }).select().single(), 'Creating your profile');
  }
  return profile;
}

async function me(ctx) {
  return toUser(await loadProfile(ctx), ctx.user);
}

async function update(ctx, body) {
  const profile = await loadProfile(ctx);
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (name.length < 2) throw new AppError('Name must be at least 2 characters.', 400);
    patch.name = name.slice(0, 100);
  }
  if (body.educationLevel !== undefined) {
    if (body.educationLevel && !EDUCATION_LEVELS.includes(body.educationLevel)) throw new AppError('Invalid education level.', 400);
    patch.education_level = body.educationLevel || null;
  }
  if (body.preferences !== undefined) {
    patch.preferences = { ...DEFAULT_PREFERENCES, ...(profile.preferences || {}), ...cleanPreferences(body.preferences) };
  }
  if (body.removeAvatar) {
    await storage.remove('avatars', profile.avatar_path);
    patch.avatar_path = null;
  }
  if (body.newPassword) await changePassword(ctx, body.currentPassword, body.newPassword);
  const updated = Object.keys(patch).length
    ? check(await ctx.db.from('profiles').update(patch).eq('id', ctx.userId).select().single(), 'Saving your profile')
    : profile;
  return toUser(updated, ctx.user);
}

/** Verify the current password with Supabase Auth, then set the new one (service role). */
async function changePassword(ctx, currentPassword, newPassword) {
  if (ctx.user.isAnonymous || !ctx.user.email) throw new AppError('Guest accounts have no password.', 400);
  if (typeof newPassword !== 'string' || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new AppError('New password must be 8+ characters with letters and numbers.', 400);
  }
  const verifier = createClient(config.supabase.url, config.supabase.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await verifier.auth.signInWithPassword({ email: ctx.user.email, password: String(currentPassword || '') });
  if (error) throw new AppError('Your current password is incorrect.', 400);
  const res = await admin().auth.admin.updateUserById(ctx.userId, { password: newPassword });
  if (res.error) throw new AppError(`Could not change the password: ${res.error.message}`, 400);
}

async function uploadAvatar(ctx, file) {
  if (!file) throw new AppError('Choose a picture to upload.', 400);
  const profile = await loadProfile(ctx);
  const path = storage.pathFor(ctx.userId, file.originalname);
  await storage.upload('avatars', path, file.buffer, file.mimetype);
  await storage.remove('avatars', profile.avatar_path);
  const updated = check(await ctx.db.from('profiles').update({ avatar_path: path }).eq('id', ctx.userId).select().single(), 'Saving your picture');
  return toUser(updated, ctx.user);
}

module.exports = { me, update, uploadAvatar, loadProfile, toUser, DEFAULT_PREFERENCES };
