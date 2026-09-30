/** Learning games: save scores, per-student stats and rank, leaderboard. */
const { check } = require('../lib/supabase');
const { AppError } = require('../middleware/errorHandler');
const progressService = require('./progressService');
const storage = require('./storageService');

const GAMES = Object.keys(progressService.GAME_NAMES);
// Upper bound per game round, so a tampered request can't top the leaderboard
const MAX_SCORE = 1000;

async function saveScore(ctx, { game, score, won }) {
  if (!GAMES.includes(game)) throw new AppError('Unknown game.', 400);
  const s = Math.round(Number(score));
  if (!Number.isFinite(s) || s < 0 || s > MAX_SCORE) throw new AppError('Invalid score.', 400);
  check(await ctx.db.from('game_scores').insert({ user_id: ctx.userId, game, score: s, won: Boolean(won) }), 'Saving the score');
}

async function allScores(ctx) {
  return check(await ctx.db.from('game_scores').select('user_id, game, score, won').limit(10000), 'Loading scores');
}

async function stats(ctx) {
  const [rows, overview] = await Promise.all([allScores(ctx), progressService.overview(ctx, { activityLimit: 1 })]);
  const mine = rows.filter((r) => r.user_id === ctx.userId);
  const totals = {};
  rows.forEach((r) => { totals[r.user_id] = (totals[r.user_id] || 0) + r.score; });
  const myPoints = totals[ctx.userId] || 0;
  const perGame = {};
  mine.forEach((r) => {
    const g = (perGame[r.game] ||= { played: 0, best: 0 });
    g.played += 1;
    g.best = Math.max(g.best, r.score);
  });
  const players = Object.fromEntries(GAMES.map((g) => [g, new Set(rows.filter((r) => r.game === g).map((r) => r.user_id)).size]));
  return {
    streak: overview.streak.current,
    wins: mine.filter((r) => r.won).length,
    played: mine.length,
    points: myPoints,
    rank: 1 + Object.values(totals).filter((p) => p > myPoints).length,
    perGame,
    players,
  };
}

async function leaderboard(ctx) {
  const rows = await allScores(ctx);
  const totals = {};
  rows.forEach((r) => { totals[r.user_id] = (totals[r.user_id] || 0) + r.score; });
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (!top.length) return [];
  const profiles = check(await ctx.db.from('profiles').select('id, name, avatar_path').in('id', top.map(([id]) => id)), 'Loading profiles');
  const byId = Object.fromEntries(profiles.map((p) => [p.id, { id: p.id, name: p.name, avatarUrl: storage.publicUrl('avatars', p.avatar_path) }]));
  return top.map(([id, points]) => ({ ...(byId[id] || { id, name: 'Student' }), points }));
}

module.exports = { saveScore, stats, leaderboard };
