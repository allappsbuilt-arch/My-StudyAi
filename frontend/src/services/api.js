/**
 * The frontend's only way to reach data.
 *
 *  - Authentication: Supabase Auth in the browser (lib/supabase.js).
 *  - Everything else: the MyStudyAI backend (/api/...), called with the student's Supabase
 *    access token. The backend runs the business logic and talks to Supabase.
 *
 * Screens import the grouped functions below and never call fetch or Supabase directly.
 */
import { supabase, supabaseConfigured } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Development-only UI preview (sample data, no Supabase): VITE_UI_PREVIEW=true in Frontend/.env,
 * or "Preview the UI" on the setup screen. `import.meta.env.DEV` is false in production builds,
 * so preview mode can never switch on there.
 */
const previewRequested = () => {
  if (String(import.meta.env.VITE_UI_PREVIEW || '').toLowerCase() === 'true') return true;
  try { return sessionStorage.getItem('mystudyai_preview') === '1'; } catch { return false; }
};
export const PREVIEW = import.meta.env.DEV && previewRequested();
let previewModule = null;
const preview = async () => (previewModule ||= await import('../dev/previewApi.js'));
export function exitPreview() {
  try { sessionStorage.removeItem('mystudyai_preview'); } catch { /* ignore */ }
  window.location.reload();
}
export function startPreview() {
  try { sessionStorage.setItem('mystudyai_preview', '1'); } catch { /* ignore */ }
  window.location.assign('/');
}

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
  const isForm = body instanceof FormData;
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
    xhr.onload = () => parse(new Response(xhr.responseText || null, { status: xhr.status, headers: { 'Content-Type': 'application/json' } })).then(resolve, reject);
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
/** In preview mode sign-in is simulated: any e-mail/password works and nothing leaves the browser. */
const previewAuth = async (action) => {
  const { previewAuth: pa } = await preview();
  pa[action]();
  return { session: { access_token: 'preview' }, user: { id: 'preview-me' } };
};

function auth() {
  if (!supabase) throw new ApiError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Frontend/.env.local.', 0, 'NOT_CONFIGURED');
  return supabase.auth;
}
const authOk = ({ data, error }) => {
  if (error) throw new ApiError(error.message, Number(error.status) || 400, error.code);
  return data;
};

export const authApi = {
  register: async ({ name, email, password }) =>
    PREVIEW ? previewAuth('signIn') : authOk(await auth().signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/home` } })),
  login: async ({ email, password }) => PREVIEW ? previewAuth('signIn') : authOk(await auth().signInWithPassword({ email, password })),
  logout: async () => PREVIEW ? previewAuth('signOut') : authOk(await auth().signOut()),
  guest: async () => PREVIEW ? previewAuth('signIn') : authOk(await auth().signInAnonymously()),
  /** Google / Apple sign-in (enable the provider in Supabase -> Authentication -> Sign In / Providers). */
  oauth: async (provider) => {
    if (PREVIEW) throw new ApiError('Google / Apple sign-in needs Supabase. In UI preview use e-mail with any password.', 400);
    return authOk(await auth().signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/home` } }));
  },
  forgotPassword: async (email) => {
    if (PREVIEW) return { message: 'UI preview: no e-mail is sent. Connect Supabase to use password reset.' };
    authOk(await auth().resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }));
    return { message: 'If an account exists for this email, a password reset link has been sent. Open it on this device.' };
  },
  resetPassword: async ({ password }) => authOk(await auth().updateUser({ password })),
};

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
export const userApi = {
  me: async () => (await get('/me')).user,
  getProfile: () => get('/profile'),
  updateProfile: (body) => put('/profile', body),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return post('/profile/avatar', form);
  },
};

export const dataApi = {
  /** Everything the student owns, downloaded as a JSON file. */
  exportAll: async () => {
    const data = await get('/profile/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `mystudyai-data-${localDate()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  },
  /** Clears this device's helpers (reminders, check-ins, banners) - not account data. */
  clearLocalCache: () => {
    let n = 0;
    try {
      for (const k of Object.keys(localStorage)) {
        if (/^mystudyai_(checkin|last_reminder)/.test(k)) { localStorage.removeItem(k); n += 1; }
      }
      sessionStorage.clear();
    } catch { /* storage unavailable */ }
    return n;
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
  upload: (file, { subject, description } = {}, onProgress, signal) => {
    const form = new FormData();
    form.append('file', file);
    if (subject) form.append('subject', subject);
    if (description) form.append('description', description);
    return uploadWithProgress('/materials', form, onProgress, signal);
  },
  list: (params) => get('/materials', params),
  get: (id) => get(`/materials/${id}`),
  remove: (id) => del(`/materials/${id}`),
  /** Opens the original file in a new tab (short-lived signed link from the backend). */
  open: async (id) => {
    const win = window.open('', '_blank');
    const { url } = await get(`/materials/${id}/file-url`);
    if (win) win.location.href = url;
    else window.location.href = url;
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
  createPost: ({ content, image, communityId }) => {
    const form = new FormData();
    if (content) form.append('content', content);
    if (image) form.append('image', image);
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
  solve: ({ image, question }) => {
    const form = new FormData();
    if (image) form.append('image', image);
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
