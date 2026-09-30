/**
 * Supabase client for the browser - used ONLY for authentication
 * (sign-up, sign-in, sign-out, sessions, password reset, OAuth).
 * All data goes through the MyStudyAI backend (services/api.js).
 *
 * Frontend/.env.local:
 *   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *   VITE_SUPABASE_ANON_KEY=<anon / publishable key>
 *
 * Never put the service-role key in the frontend.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const looksReal = (v) => Boolean(v) && !/your[-_]|<.*>/i.test(v);

export const supabaseConfigured = looksReal(url) && looksReal(anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
