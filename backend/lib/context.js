/**
 * Request context passed from controllers to services:
 *   { userId, user, db, offset }
 * `db` is the per-user Supabase client (RLS applies); `offset` is the student's UTC offset in minutes
 * (east positive, e.g. India = 330), sent by the app as "X-Timezone-Offset" (JS getTimezoneOffset sign).
 */
function ctxOf(req) {
  let js = parseInt(req.headers['x-timezone-offset'], 10);
  if (!Number.isFinite(js) || Math.abs(js) > 14 * 60) js = 0;
  return { userId: req.user.id, user: req.user, db: req.db, offset: -js };
}

// ---- dates in the student's local calendar ----
const DAY = 86400000;

/** YYYY-MM-DD of a timestamp in the student's time zone. */
function localDate(offset, value = new Date()) {
  return new Date(new Date(value).getTime() + offset * 60000).toISOString().slice(0, 10);
}
/** Local hour (0-23) of a timestamp. */
function localHour(offset, value) {
  return new Date(new Date(value).getTime() + offset * 60000).getUTCHours();
}
function addDays(iso, n) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}
function weekdayOf(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}
/** Monday = 0 ... Sunday = 6 */
function weekdayIndex(iso) {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}
/** ISO timestamp for a local date at a local hour (for synthetic events like streak milestones). */
function localDateTime(offset, iso, hour = 21) {
  return new Date(Date.parse(`${iso}T${String(hour).padStart(2, '0')}:00:00Z`) - offset * 60000).toISOString();
}

module.exports = { ctxOf, localDate, localHour, addDays, weekdayOf, weekdayIndex, localDateTime };
