/**
 * Central configuration. Every setting comes from Backend/.env (see .env.example).
 * Import this file instead of reading process.env across the code.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};
const isPlaceholder = (v) => !v || /your[-_]|replace_with|<.*>/i.test(v);
const clean = (v) => (isPlaceholder(v) ? '' : String(v).trim());

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5000),

  // Browser origins allowed to call the API (comma-separated). localhost is always allowed in development.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim()).filter(Boolean),

  // Supabase: Project Settings -> API
  supabase: {
    url: clean(process.env.SUPABASE_URL),
    // Secret key: bypasses RLS. Server only - the backend's only Supabase key
    serviceRoleKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o',
    maxInputChars: toInt(process.env.AI_MAX_INPUT_CHARS, 400000),
  },

  upload: {
    maxMaterialMB: toInt(process.env.MAX_FILE_SIZE_MB, 50),
  },
};

config.isProduction = config.env === 'production';
config.supabase.configured = Boolean(config.supabase.url && config.supabase.serviceRoleKey);
config.supabase.missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(
  (k) => !config.supabase[{ SUPABASE_URL: 'url', SUPABASE_SERVICE_ROLE_KEY: 'serviceRoleKey' }[k]]
);

config.isAllowedOrigin = (origin) => {
  if (!origin) return true; // same-origin requests, curl
  if (config.clientUrls.includes(origin)) return true;
  return !config.isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

module.exports = config;
