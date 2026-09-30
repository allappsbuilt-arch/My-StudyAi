/** Games hub - streak / wins / rank, featured games, more games and the leaderboard. */
import { useNavigate } from 'react-router-dom';
import { Trophy, Flame, Medal, Grid2x2, Swords, Layers, SpellCheck, Calculator, ChevronRight, Users, Gauge } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { gameApi, GAME_NAMES } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { Avatar } from '../components/Brand';
import { Skeleton } from '../components/Feedback';

export const GAMES = {
  matching: { icon: Grid2x2, desc: 'Match terms with definitions', level: 'Easy' },
  battle: { icon: Swords, desc: 'Race the clock on quick questions', level: 'Medium' },
  streak: { icon: Flame, desc: 'Answer in a row without a miss', level: 'Medium' },
  memory: { icon: Layers, desc: 'Test your memory', level: 'Easy' },
  spelling: { icon: SpellCheck, desc: 'Improve vocabulary', level: 'Medium' },
  mathrush: { icon: Calculator, desc: 'Quick math drills', level: 'Hard' },
};

export default function GamesScreen() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const stats = useApi(() => gameApi.stats(), []);
  const board = useApi(() => gameApi.leaderboard(), []);
  const s = stats.data;

  const featured = ['matching', 'battle'];
  const more = ['streak', 'memory', 'spelling', 'mathrush'];

  return (
    <Page wide>
      <header className="top-bar">
        <div className="grow name" style={{ fontSize: '1.35rem' }}>{t('games.title')}</div>
        <button className="icon-btn" onClick={() => document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' })} aria-label={t('games.leaderboard')}>
          <Trophy size={20} />
        </button>
      </header>

      {stats.loading ? (
        <Skeleton height={112} radius={20} />
      ) : (
        <div className="card stat-strip pop-in">
          <div><span className="icon-tile sm"><Flame size={18} /></span><span className="v">{s?.streak ?? 0}</span><span className="l">{t('games.dayStreak')}</span></div>
          <div><span className="icon-tile sm"><Trophy size={18} /></span><span className="v">{s?.wins ?? 0}</span><span className="l">{t('games.wins')}</span></div>
          <div><span className="icon-tile sm"><Medal size={18} /></span><span className="v">#{s?.rank ?? '–'}</span><span className="l">{t('games.rank')}</span></div>
        </div>
      )}

      <div className="section-title"><h2>{t('games.featured')}</h2></div>
      <div className="stack stagger">
        {featured.map((g) => {
          const G = GAMES[g];
          return (
            <button key={g} className="explore-row" onClick={() => navigate(`/games/${g}`)}>
              <span className="icon-tile"><G.icon size={22} /></span>
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>{GAME_NAMES[g]}</span>
                <span className="desc" style={{ display: 'block' }}>{G.desc}</span>
                <span className="meta-line">
                  <span><Users size={12} /> {s?.players?.[g] ?? 0} {t('common.playing')}</span>
                  <span><Gauge size={12} /> {G.level}</span>
                  {s?.perGame?.[g] && <span><Trophy size={12} /> {t('games.best')} {s.perGame[g].best}</span>}
                </span>
              </span>
              <ChevronRight size={20} className="chev" />
            </button>
          );
        })}
      </div>

      <div className="section-title"><h2>{t('games.more')}</h2></div>
      <div className="game-grid stagger">
        {more.map((g) => {
          const G = GAMES[g];
          return (
            <button key={g} className="game-tile" onClick={() => navigate(`/games/${g}`)}>
              <span className="icon-tile"><G.icon size={22} /></span>
              <span className="t">{GAME_NAMES[g]}</span>
              <span className="d">{G.desc}</span>
              {s?.perGame?.[g] && <span className="badge">{t('games.best')} {s.perGame[g].best}</span>}
            </button>
          );
        })}
      </div>

      <div className="section-title" id="leaderboard"><h2>{t('games.leaderboard')}</h2></div>
      <div className="card list-card">
        {board.loading ? (
          <Skeleton height={60} />
        ) : !board.data?.length ? (
          <p className="small text-2 center" style={{ padding: 16 }}>Play a game to get on the leaderboard!</p>
        ) : (
          board.data.map((p, i) => (
            <div key={p.id} className="list-item" style={p.id === user?.id ? { background: 'var(--primary-soft)' } : undefined}>
              <span className="bold" style={{ width: 22, textAlign: 'center' }}>{i + 1}</span>
              <Avatar user={p} size="sm" />
              <span className="grow bold truncate">{p.name}{p.id === user?.id ? ' (you)' : ''}</span>
              <span className="small bold" style={{ color: 'var(--primary)' }}>{p.points} pts</span>
            </div>
          ))
        )}
      </div>
    </Page>
  );
}
