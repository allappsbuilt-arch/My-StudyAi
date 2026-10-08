/**
 * The student's login session on this device.
 * Sign-in happens through the MyStudyAI backend (/api/auth/*); the phone never holds a Supabase key.
 * Tokens are kept in AsyncStorage and refreshed through the backend shortly before they expire.
 * `session.auth` offers the few calls the app needs: getSession, onAuthStateChange, signOut, setSession.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Phones cannot use a dev-server proxy: point this at the backend (e.g. http://192.168.1.20:5000/api).
// The web preview opened on this computer (localhost) talks to the backend on localhost instead.
const onLocalWeb = Platform.OS === 'web' && typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
export const API_BASE = onLocalWeb ? 'http://localhost:5000/api' : process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const KEY = 'mystudyai.session';
const listeners = new Set();
let current; // undefined = not loaded yet, null = signed out
let refreshing = null;

const emit = (event) => listeners.forEach((fn) => fn(event, current));

async function load() {
  if (current !== undefined) return current;
  try {
    current = JSON.parse((await AsyncStorage.getItem(KEY)) || 'null');
  } catch {
    current = null;
  }
  return current;
}

async function save(next, event) {
  current = next;
  try {
    if (next) await AsyncStorage.setItem(KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(KEY);
  } catch { /* storage unavailable: the session lasts until the app closes */ }
  emit(event);
}

function refresh(s) {
  refreshing ||= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.session) {
        await save({ ...json.session }, 'TOKEN_REFRESHED');
        return current;
      }
      if (res.status >= 400 && res.status < 500) await save(null, 'SIGNED_OUT'); // refresh token no longer valid
      return null;
    } catch {
      return s; // offline: keep the old token, the next request fails with a clear message
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

const auth = {
  /** { data: { session } } - refreshes the token first when it is about to expire. */
  async getSession() {
    let s = await load();
    if (s && s.expires_at && s.expires_at * 1000 - Date.now() < 60000) s = await refresh(s);
    return { data: { session: s || null } };
  },
  onAuthStateChange(cb) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  /** Store the tokens returned by the backend (or taken from a password-reset link). */
  async setSession({ access_token, refresh_token, expires_at }) {
    await save({ access_token, refresh_token, expires_at: expires_at || Math.floor(Date.now() / 1000) + 3000 }, 'SIGNED_IN');
    return { data: { session: current }, error: null };
  },
  async signOut() {
    const s = await load();
    if (s) fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${s.access_token}` } }).catch(() => {});
    await save(null, 'SIGNED_OUT');
    return { error: null };
  },
};

export const session = { auth };
