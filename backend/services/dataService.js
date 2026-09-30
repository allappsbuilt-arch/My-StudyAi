/** "Download my data": everything the student owns, as one JSON document. */
const { check } = require('../lib/supabase');

const OWNED_TABLES = [
  'notes', 'materials', 'study_sessions', 'study_tasks', 'flashcard_decks', 'flashcards', 'chat_history',
  'quizzes', 'quiz_attempts', 'posts', 'post_comments', 'post_likes', 'community_members', 'game_scores',
];

async function exportAll(ctx) {
  const out = {
    exportedAt: new Date().toISOString(),
    account: { id: ctx.userId, email: ctx.user.email },
    profile: check(await ctx.db.from('profiles').select('*').eq('id', ctx.userId).maybeSingle(), 'Exporting profile'),
  };
  for (const table of OWNED_TABLES) {
    out[table] = check(await ctx.db.from(table).select('*').eq('user_id', ctx.userId), `Exporting ${table}`);
  }
  out.follows = check(await ctx.db.from('follows').select('*').eq('follower_id', ctx.userId), 'Exporting follows');
  return out;
}

module.exports = { exportAll };
