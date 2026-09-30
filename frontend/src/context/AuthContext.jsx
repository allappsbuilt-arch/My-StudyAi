/**
 * Authentication state for the whole app.
 * Sign-in/sessions: Supabase Auth in the browser. Profile data: the MyStudyAI backend.
 *
 *  const { user, isAuthenticated, login, register, logout, refreshUser, updateUser, setUser } = useAuth();
 *
 * On start-up the saved Supabase session is restored and the student's profile row
 * is loaded (the splash screen shows meanwhile). Theme and language follow the
 * profile preferences, so they are the same on every device.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { authApi, userApi, systemApi, setUnauthorizedHandler, PREVIEW } from '../services/api';
import { useTheme } from './ThemeContext';
import { useI18n } from './I18nContext';

const AuthContext = createContext(null);

// Frontend/.env: VITE_SKIP_LOGIN=true opens the app straight on Home as a guest student
// (Supabase: enable Authentication -> Sign In / Providers -> "Allow anonymous sign-ins").
export const SKIP_LOGIN = String(import.meta.env.VITE_SKIP_LOGIN || 'false').toLowerCase() === 'true';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(true); // false = AI server has no AI_API_KEY
  const [skipError, setSkipError] = useState(''); // skip-login mode could not sign in
  // '' | frontend_env | backend_offline | not_configured | not_migrated | unreachable
  const [setupIssue, setSetupIssue] = useState('');
  const { setTheme } = useTheme();
  const { setLang } = useI18n();
  const loadingRef = useRef(false);

  const applyUser = useCallback(
    (u) => {
      setUser(u);
      if (u?.preferences) {
        setTheme(u.preferences.darkMode ? 'dark' : 'light');
        if (u.preferences.language) setLang(u.preferences.language);
      }
    },
    [setTheme, setLang]
  );

  const loadUser = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      applyUser(await userApi.me());
    } catch {
      setUser(null);
    } finally {
      loadingRef.current = false;
    }
  }, [applyUser]);

  // Restore the session on page load, then follow sign-in / sign-out events
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();
    const finish = () => setTimeout(() => !cancelled && setInitializing(false), Math.max(0, 1200 - (Date.now() - started)));
    if (PREVIEW) {
      // UI preview (development only): sample data, no Supabase
      userApi.me().then((u) => !cancelled && applyUser(u)).catch(() => {}).finally(finish);
      return () => { cancelled = true; };
    }
    if (!supabaseConfigured) {
      setSetupIssue('frontend_env');
      finish();
      return () => { cancelled = true; };
    }
    (async () => {
      // Is the backend up and connected to Supabase?
      try {
        const h = await systemApi.health();
        if (!cancelled) setAiConfigured(h.aiConfigured !== false);
        if (!h.supabaseReady) {
          if (!cancelled) setSetupIssue(h.supabaseIssue || 'unreachable');
          return finish();
        }
      } catch {
        if (!cancelled) setSetupIssue('backend_offline');
        return finish();
      }

      const { data } = await supabase.auth.getSession();
      if (data.session && !cancelled) await loadUser();
      else if (SKIP_LOGIN && !cancelled) {
        // Skip-login mode: sign in as a guest student and go straight to Home
        loadingRef.current = true; // the SIGNED_IN event must not load the profile twice
        try {
          await authApi.guest();
          let u = await userApi.me();
          if (!u.preferences.onboarded) u = (await userApi.updateProfile({ preferences: { onboarded: true } })).user;
          if (!cancelled) applyUser(u);
        } catch (err) {
          if (!cancelled) setSkipError(/anonymous/i.test(err.message || '') ? 'anonymous_disabled' : err.message || 'failed');
        } finally {
          loadingRef.current = false;
        }
      }
      finish(); // the splash plays for at least ~1.2s
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) setUser(null);
      else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') setTimeout(loadUser, 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadUser]);

  // Expired session anywhere in the app -> back to login
  useEffect(() => {
    setUnauthorizedHandler(() => (PREVIEW ? setUser(null) : supabase?.auth.signOut()));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(
    async (email, password) => {
      await authApi.login({ email, password });
      const u = await userApi.me();
      applyUser(u);
      return u;
    },
    [applyUser]
  );

  /** Returns { user } or { needsConfirmation: true } when Supabase requires e-mail confirmation. */
  const register = useCallback(
    async ({ name, email, password }) => {
      const res = await authApi.register({ name, email, password });
      if (!res.session) return { needsConfirmation: true };
      const u = await userApi.me();
      applyUser(u);
      return { user: u };
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if the server is unreachable, log out locally
    }
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const res = await userApi.getProfile();
    applyUser(res.user);
    return res;
  }, [applyUser]);

  const updateUser = useCallback(
    async (body) => {
      const res = await userApi.updateProfile(body);
      applyUser(res.user);
      return res.user;
    },
    [applyUser]
  );

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), initializing, setupIssue, skipLogin: SKIP_LOGIN, skipError, aiConfigured, login, register, logout, refreshUser, updateUser, setUser: applyUser }),
    [user, initializing, setupIssue, skipError, aiConfigured, login, register, logout, refreshUser, updateUser, applyUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
