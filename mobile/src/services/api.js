/**
 * The frontend's only way to reach data.
 *
 *  - Authentication: Supabase Auth in the browser (lib/supabase.js).
 *  - Everything else: the MyStudyAI backend (/api/...), called with the student's Supabase
 *    access token. The backend runs the business logic and talks to Supabase.
 *
 * Screens import the grouped functions below and never call fetch or Supabase directly.
 */
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase, supabaseConfigured } from '../lib/supabase';

// Phones cannot use a dev-server proxy: point this at the AI server (e.g. http://192.168.1.20:5000/api).
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';
const authRedirect = (path) => Linking.createURL(path);

/**
 * UI preview (development only): sample data instead of Supabase + backend, nothing is saved.
 * Set EXPO_PUBLIC_UI_PREVIEW=true in mobile/.env. `__DEV__` is false in release builds,
 * so preview mode can never switch on in a store build.
 */
export const PREVIEW = __DEV__ && String(process.env.EXPO_PUBLIC_UI_PREVIEW || '').toLowerCase() === 'true';
let previewModule = null;
const preview = async () => (previewModule ||= await import('../dev/previewApi.js'));
const previewAuth = async (action) => {
  const { previewAuth: pa } = await preview();
  pa[action]();
  return { session: { access_token: 'preview' }, user: { id: 'preview-me' } };
};

/** FormData stand-in for preview mode (React Native's FormData has no .get). */
class PreviewForm {
  constructor() { this.m = new Map(); }
  append(k, v) { this.m.set(k, v); }
  get(k) { return this.m.get(k); }
}
const newForm = () => (PREVIEW ? new PreviewForm() : new FormData());

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let onUnauthorized = null;
/** AuthContext registers a callback so an expired session logs the student out. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function accessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function headers(extra = {}) {
  const token = await accessToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Timezone-Offset': String(new Date().getTimezoneOffset()),
    ...extra,
  };
}

async function parse(res) {
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized) onUnauthorized();
    if (!json) throw new ApiError('Cannot reach the MyStudyAI server. Start it with "npm run dev" in the Backend folder.', res.status, 'OFFLINE');
    throw new ApiError(json.message || 'Something went wrong.', res.status, json.code);
  }
  return json;
}

/** JSON / multipart request to the backend. */
async function request(method, path, { body, query, timeout = 60000 } = {}) {
  if (PREVIEW) {
    try {
      return await (await preview()).handle(method, path, { query, body });
    } catch (err) {
      if (err.status === 401 && onUnauthorized) onUnauthorized();
      throw new ApiError(err.message, err.status || 400);
    }
  }
  const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}` : '';
  const isForm = !PREVIEW && body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_BASE}${path}${qs}`, {
      method,
      headers: await headers(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: controller.signal,
    });
    return await parse(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') throw new ApiError('The request took too long. Please try again.', 408, 'TIMEOUT');
    throw new ApiError('Cannot reach the MyStudyAI server. Start it with "npm run dev" in the Backend folder.', 0, 'OFFLINE');
  } finally {
    clearTimeout(timer);
  }
}

const AI_TIMEOUT = 180000;
const get = (path, query, opts) => request('GET', path, { query, ...opts });
const post = (path, body, opts) => request('POST', path, { body, ...opts });
const put = (path, body, opts) => request('PUT', path, { body, ...opts });
const patch = (path, body) => request('PATCH', path, { body });
const del = (path) => request('DELETE', path);

/**
 * Add a picked file ({ uri, name, type }) to a FormData body.
 * Native: React Native streams the file from its uri. Web preview: the uri is fetched into a Blob.
 */
async function appendFile(form, field, file) {
  if (PREVIEW) {
    form.append(field, file);
  } else if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name || 'upload');
  } else {
    form.append(field, { uri: file.uri, name: file.name || 'upload', type: file.type || file.mimeType || 'application/octet-stream' });
  }
}

/** Upload with real progress events and cancel support (XHR). */
async function uploadWithProgress(path, form, onProgress, signal) {
  if (PREVIEW) {
    for (const p of [15, 40, 70, 100]) {
      if (signal?.aborted) throw Object.assign(new ApiError('Upload cancelled.', 0), { code: 'ERR_CANCELED' });
      onProgress?.(p);
      await new Promise((r) => setTimeout(r, 250));
    }
    return request('POST', path, { body: form });
  }
  const hdrs = await headers();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${path}`);
    Object.entries(hdrs).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let json = null;
      try { json = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && json) return resolve(json);
      if (xhr.status === 401 && onUnauthorized) onUnauthorized();
      reject(new ApiError(json?.message || 'Upload failed. Check your connection and try again.', xhr.status, json?.code));
    };
    xhr.onerror = () => reject(new ApiError('Upload failed. Check your connection and try again.', 0, 'OFFLINE'));
    xhr.onabort = () => reject(Object.assign(new ApiError('Upload cancelled.', 0), { code: 'ERR_CANCELED' }));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });
}

const FRIENDLY = [
  [/invalid login credentials/i, 'Incorrect email or password.'],
  [/user already registered/i, 'An account with this email already exists. Please log in instead.'],
  [/email not confirmed/i, 'Please confirm your email first - check your inbox for the link from Supabase.'],
  [/password should be at least/i, 'Password must be at least 8 characters.'],
  [/anonymous sign-ins are disabled/i, 'Guest sign-in is turned off in Supabase (Authentication -> Sign In / Providers -> Allow anonymous sign-ins).'],
  [/provider is not enabled|unsupported provider/i, 'This sign-in option is not enabled in Supabase yet (Authentication -> Sign In / Providers).'],
  [/failed to fetch|network ?error|load failed/i, 'Cannot reach the server. Check your internet connection.'],
  [/jwt expired|auth session missing/i, 'Your session has expired. Please log in again.'],
];

/** Friendly message for any error thrown by the functions below. */
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback;
  const msg = err.message || String(err);
  for (const [re, text] of FRIENDLY) if (re.test(msg)) return text;
  return msg || fallback;
}

/** Local calendar date (YYYY-MM-DD) on this device. */
export function localDate(value = new Date()) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** @username shown on profiles: the chosen MyStudy ID, else the e-mail name. */
export function handleOf(user) {
  const u = user?.preferences?.username || (user?.email || '').split('@')[0] || 'student';
  return `@${u.toLowerCase().replace(/[^a-z0-9_.]/g, '')}`;
}

export const GAME_NAMES = {
  matching: 'Matching Game', battle: 'Quiz Battle', streak: 'Streak Challenge', memory: 'Memory Cards', spelling: 'Spelling Bee', mathrush: 'Math Rush',
};

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------
export const systemApi = {
  health: async () => {
    if (PREVIEW) return { success: true, supabaseReady: true, aiConfigured: true, preview: true };
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },
};

// ---------------------------------------------------------------------------
// Auth (Supabase Auth in the browser)
// ---------------------------------------------------------------------------
function auth() {
  if (!supabase) throw new ApiError('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to mobile/.env.', 0, 'NOT_CONFIGURED');
  return supabase.auth;
}
const authOk = ({ data, error }) => {
  if (error) throw new ApiError(error.message, Number(error.status) || 400, error.code);
  return data;
};

export const authApi = {
  register: async ({ name, email, password }) =>
    PREVIEW ? previewAuth('signIn') : authOk(await auth().signUp({ email, password, options: { data: { name }, emailRedirectTo: authRedirect('home') } })),
  login: async ({ email, password }) => PREVIEW ? previewAuth('signIn') : authOk(await auth().signInWithPassword({ email, password })),
  logout: async () => PREVIEW ? previewAuth('signOut') : authOk(await auth().signOut()),
  guest: async () => PREVIEW ? previewAuth('signIn') : authOk(await auth().signInAnonymously()),
  /** Google / Apple sign-in (enable the provider in Supabase -> Authentication -> Sign In / Providers). */
  oauth: async (provider) => {
    if (PREVIEW) throw new ApiError('Google / Apple sign-in needs Supabase. In UI preview use e-mail with any password.', 400);
    const WebBrowser = await import('expo-web-browser');
    const redirectTo = authRedirect('home');
    const { data, error } = await auth().signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw new ApiError(error.message, Number(error.status) || 400, error.code);
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success') await authApi.sessionFromUrl(res.url);
    return res;
  },
  forgotPassword: async (email) => {
    if (PREVIEW) return { message: 'UI preview: no e-mail is sent. Connect Supabase to use password reset.' };
    authOk(await auth().resetPasswordForEmail(email, { redirectTo: authRedirect('reset-password') }));
    return { message: 'If an account exists for this email, a password reset link has been sent. Open it on this device.' };
  },
  resetPassword: async ({ password }) => authOk(await auth().updateUser({ password })),
  /** Sets the session from a Supabase recovery / confirmation link opened in the app. */
  sessionFromUrl: async (url) => {
    const params = new URLSearchParams((url.split('#')[1] || url.split('?')[1] || ''));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return null;
    return authOk(await auth().setSession({ access_token, refresh_token }));
  },
};

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
export const userApi = {
  me: async () => (await get('/me')).user,
  getProfile: () => get('/profile'),
  updateProfile: (body) => put('/profile', body),
  uploadAvatar: async (file) => {
    const form = newForm();
    await appendFile(form, 'avatar', file);
    return post('/profile/avatar', form);
  },
};

export const dataApi = {
  /** Everything the student owns, shared as a JSON file. */
  exportAll: async () => {
    const data = await get('/profile/export');
    const FileSystem = await import('expo-file-system');
    const Sharing = await import('expo-sharing');
    const file = new FileSystem.File(FileSystem.Paths.cache, `mystudyai-data-${localDate()}.json`);
    file.create({ overwrite: true });
    file.write(JSON.stringify(data, null, 2));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    return file.uri;
  },
  /** Clears this device's helpers (reminders, check-ins) - not account data. */
  clearLocalCache: async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => /^mystudyai_(checkin|last_reminder)/.test(k));
    if (keys.length) await AsyncStorage.multiRemove(keys);
    return keys.length;
  },
};

// ---------------------------------------------------------------------------
// AI Tutor
// ---------------------------------------------------------------------------
export const aiApi = {
  chat: (body) => post('/ai/chat', body, { timeout: AI_TIMEOUT }),
  conversations: () => get('/ai/conversations'),
  conversation: (id) => get(`/ai/conversations/${id}`),
  deleteConversation: (id) => del(`/ai/conversations/${id}`),
  clearHistory: () => del('/ai/conversations'),
};

// ---------------------------------------------------------------------------
// Materials + AI analysis
// ---------------------------------------------------------------------------
export const materialApi = {
  upload: async (file, { subject, description } = {}, onProgress, signal) => {
    const form = newForm();
    await appendFile(form, 'file', file);
    if (subject) form.append('subject', subject);
    if (description) form.append('description', description);
    return uploadWithProgress('/materials', form, onProgress, signal);
  },
  list: (params) => get('/materials', params),
  get: (id) => get(`/materials/${id}`),
  remove: (id) => del(`/materials/${id}`),
  /** Opens the original file (short-lived signed link from the backend). */
  open: async (id) => {
    const { url } = await get(`/materials/${id}/file-url`);
    await Linking.openURL(url);
  },
};

export const analysisApi = {
  start: (materialId) => post(`/materials/${materialId}/analysis`, {}),
  get: (materialId) => get(`/materials/${materialId}/analysis`),
};

// ---------------------------------------------------------------------------
// Notes, quizzes, progress, study plan
// ---------------------------------------------------------------------------
export const notesApi = {
  list: (params) => get('/notes', params),
  get: (id) => get(`/notes/${id}`),
  create: (body) => post('/notes', body),
  update: (id, body) => put(`/notes/${id}`, body),
  remove: (id) => del(`/notes/${id}`),
};

export const quizApi = {
  generate: (body) => post('/quiz/generate', body, { timeout: AI_TIMEOUT }),
  get: (id) => get(`/quiz/${id}`),
  submit: (id, body) => post(`/quiz/${id}/submit`, body),
  attempt: (attemptId) => get(`/quiz/attempt/${attemptId}`),
  history: () => get('/quiz/history'),
};

export const progressApi = {
  overview: (params) => get('/progress', params),
  weekly: (days = 7) => get('/progress/weekly', { days }),
  addStudyTime: (minutes) => post('/progress/study-time', { minutes }),
};

export const planApi = {
  overview: () => get('/plan'),
  create: async (body) => (await post('/plan/tasks', body)).task,
  update: async (id, body) => (await patch(`/plan/tasks/${id}`, body)).task,
  remove: (id) => del(`/plan/tasks/${id}`),
};

// ---------------------------------------------------------------------------
// Flashcards + games
// ---------------------------------------------------------------------------
export const flashcardApi = {
  decks: () => get('/flashcards/decks'),
  deck: (id) => get(`/flashcards/decks/${id}`),
  createDeck: (body) => post('/flashcards/decks', body),
  updateDeck: (id, body) => put(`/flashcards/decks/${id}`, body),
  removeDeck: (id) => del(`/flashcards/decks/${id}`),
  addCard: async (deckId, card) => (await post(`/flashcards/decks/${deckId}/cards`, card)).card,
  updateCard: async (id, card) => (await put(`/flashcards/cards/${id}`, card)).card,
  removeCard: (id) => del(`/flashcards/cards/${id}`),
  /** grade: 0 = again, 1 = hard, 2 = good, 3 = easy (scheduling happens on the server) */
  review: async (card, grade) => (await post(`/flashcards/cards/${card.id}/review`, { grade })).card,
};

export const gameApi = {
  saveScore: (body) => post('/games/scores', body),
  stats: () => get('/games/stats'),
  leaderboard: async () => (await get('/games/leaderboard')).leaderboard,
  /** Term/definition pairs from the student's own flashcards (Matching / Memory). */
  myPairs: async (limit = 6) => (await get('/games/pairs', { limit })).pairs,
};

// ---------------------------------------------------------------------------
// Socials
// ---------------------------------------------------------------------------
export const socialApi = {
  feed: (params = {}) => get('/social/feed', params),
  createPost: async ({ content, image, communityId }) => {
    const form = newForm();
    if (content) form.append('content', content);
    if (image) await appendFile(form, 'image', image);
    if (communityId) form.append('communityId', communityId);
    return post('/social/posts', form);
  },
  removePost: (id) => del(`/social/posts/${id}`),
  /** `liked` is the current state: calling it toggles. */
  toggleLike: (postId, liked) => put(`/social/posts/${postId}/like`, { liked: !liked }),
  comments: async (postId) => (await get(`/social/posts/${postId}/comments`)).comments,
  addComment: (postId, content) => post(`/social/posts/${postId}/comments`, { content }),
  communities: async () => (await get('/social/communities')).communities,
  community: (slug) => get(`/social/communities/${encodeURIComponent(slug)}`),
  /** `joined` is the current state: calling it toggles. */
  toggleMembership: (communityId, joined) => put(`/social/communities/${communityId}/membership`, { joined: !joined }),
  userCard: async (userId) => (await get(`/social/users/${userId}`)).user,
  userStats: async (userId) => (await get(`/social/users/${userId}`)).user,
  /** `following` is the current state: calling it toggles. */
  toggleFollow: (userId, following) => put(`/social/users/${userId}/follow`, { follow: !following }),
};

// ---------------------------------------------------------------------------
// AI study tools
// ---------------------------------------------------------------------------
export const toolsApi = {
  solve: async ({ image, question }) => {
    const form = newForm();
    if (image) await appendFile(form, 'image', image);
    if (question) form.append('question', question);
    return post('/tools/solve', form, { timeout: AI_TIMEOUT });
  },
  translate: (body) => post('/tools/translate', body, { timeout: AI_TIMEOUT }),
  summarize: (body) => post('/tools/summarize', body, { timeout: AI_TIMEOUT }),
  essay: (body) => post('/tools/essay', body, { timeout: AI_TIMEOUT }),
  lectureNotes: (body) => post('/tools/lecture-notes', body, { timeout: AI_TIMEOUT }),
  flashcards: (body) => post('/flashcards/generate', body, { timeout: AI_TIMEOUT }),
};

export { supabaseConfigured };
