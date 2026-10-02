/**
 * Supabase client for the app - used ONLY for authentication.
 * All data goes through the MyStudyAI backend (services/api.js).
 *
 * mobile/.env:
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const looksReal = (v) => Boolean(v) && !/your[-_]|<.*>/i.test(v);

export const supabaseConfigured = looksReal(url) && looksReal(anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, { auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;
