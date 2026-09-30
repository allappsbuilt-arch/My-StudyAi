/**
 * MyStudyAI backend entry point.
 *   npm run dev   (auto-restarts on changes)
 *   npm start     (production)
 */
const config = require('./config');
const app = require('./app');
const aiService = require('./services/aiService');
const extractService = require('./services/extractService');
const materialService = require('./services/materialService');
const { ping } = require('./lib/supabase');

const server = app.listen(config.port, async () => {
  console.log(`\nMyStudyAI API running at http://localhost:${config.port}/api  (health: /api/health)`);

  if (!config.supabase.configured) {
    console.warn(`[supabase] Missing in Backend/.env: ${config.supabase.missing.join(', ')}. The API answers 503 until they are set.`);
  } else {
    const db = await ping();
    if (db.ok) {
      console.log('[supabase] Connected.');
      materialService.failInterruptedJobs().catch(() => {});
    } else if (db.reason === 'not_migrated') {
      console.warn('[supabase] Connected, but the tables are missing. Apply backend/supabase/migrations (see backend/supabase/README.md).');
    } else {
      console.warn('[supabase] Could not reach Supabase. Check SUPABASE_URL / keys and your internet connection.');
    }
  }
  if (!aiService.isConfigured()) console.warn('[ai] No AI_API_KEY in Backend/.env - AI features are disabled until you add one.');
  if (!extractService.hasFfmpeg()) console.warn('[ai] ffmpeg not found - video frames cannot be extracted (videos use their description).');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[server] Port ${config.port} is already in use - another copy of the backend is probably running.\n`);
    process.exit(1);
  }
  throw err;
});

// Graceful shutdown (Ctrl+C, container stop)
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
