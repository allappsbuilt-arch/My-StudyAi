/**
 * Supabase clients for the backend.
 *
 *  - admin():        service-role client. Bypasses Row Level Security - use ONLY for privileged work
 *                    (verifying tokens, quiz answer keys, AI results, storage). Always filter by the user id.
 *  - forUser():      same service-role client (no anon key is used). Services scope every query by user id.
 *  - check():        unwraps { data, error } and turns errors into friendly AppErrors.
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

function assertConfigured() {
  if (!config.supabase.configured) {
    throw new AppError(
      `The server is not connected to Supabase. Add ${config.supabase.missing.join(', ')} to Backend/.env and restart.`,
      503,
      undefined,
      'SUPABASE_NOT_CONFIGURED'
    );
  }
}

let adminClient = null;
function admin() {
  assertConfigured();
  if (!adminClient) adminClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, NO_SESSION);
  return adminClient;
}

/** The backend uses only the service-role key. Every query MUST filter by the signed-in user's id. */
function forUser() {
  return admin();
}

/** A fresh, throw-away service-key client (used where a client must not be shared, e.g. password checks). */
function isolated() {
  assertConfigured();
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, NO_SESSION);
}

/** Unwrap a Supabase response. `what` names the operation for logs and messages. */
function check({ data, error, count }, what = 'Database request', { withCount = false } = {}) {
  if (error) {
    const status = Number(error.status) || 0;
    if (error.code === 'PGRST116') throw new AppError(`${what}: not found.`, 404);
    if (error.code === '23505') throw new AppError('That already exists.', 409);
    if (error.code === '42501' || /row-level security/i.test(error.message)) throw new AppError('You do not have permission to do that.', 403);
    if (error.code === '42P01' || /relation .* does not exist|schema cache/i.test(error.message)) {
      console.error(`[supabase] ${what}: ${error.message} - run the migrations in backend/supabase/migrations.`);
      throw new AppError('The database is not set up yet. Run the Supabase migrations (see backend/supabase/README.md).', 503, undefined, 'DB_NOT_MIGRATED');
    }
    console.error(`[supabase] ${what} failed:`, error.message);
    throw new AppError(`${what} failed. Please try again.`, status >= 400 && status < 500 ? status : 502);
  }
  return withCount ? { data, count } : data;
}

/** Health check: can we reach the database with the service role? */
async function ping() {
  if (!config.supabase.configured) return { ok: false, reason: 'not_configured' };
  try {
    const { error } = await admin().from('communities').select('id').limit(1);
    if (error) return { ok: false, reason: /does not exist|schema cache/i.test(error.message) ? 'not_migrated' : 'error' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

module.exports = { admin, forUser, isolated, check, ping };
