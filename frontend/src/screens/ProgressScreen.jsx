/** 15. Progress - totals, weekly study chart, quiz score trend, subject performance, activity. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FolderCheck, ListChecks, Target, Flame, Check, FileUp, Brain, Trophy, StickyNote, MessageCircle, Sparkles, Layers, Gamepad2, Award } from 'lucide-react';
import { progressApi, quizApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import { BarChart, LineChart, HBarList } from '../components/Charts';
import { ErrorState, Skeleton, EmptyState } from '../components/Feedback';
import { formatMinutes, timeAgo, formatDate } from '../utils/format';

const ACTIVITY_ICONS = { upload: FileUp, analysis: Brain, quiz: Trophy, note: StickyNote, chat: MessageCircle, deck: Layers, game: Gamepad2, streak: Flame, badge: Award };

export default function ProgressScreen() {
  const navigate = useNavigate();
  const [range, setRange] = useState(7);
  const overview = useApi(() => progressApi.overview({ activityLimit: 8 }), []);
  const weekly = useApi(() => progressApi.weekly(range), [range]);
  const history = useApi(() => quizApi.history(), []);

  if (overview.error) {
    return (
      <Page>
        <PageHeader title="Progress" eyebrow="Your learning" />
        <ErrorState message={overview.error} onRetry={overview.reload} />
      </Page>
    );
  }

  const o = overview.data;
  const days = weekly.data?.days || [];
  const chartDays = days.map((d) => ({
    ...d,
    label: range === 7 ? d.day : d.date.slice(8),
    tooltipLabel: formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' }),
  }));
  const scorePoints = (history.data?.attempts || [])
    .slice(0, 12)
    .reverse()
    .map((a) => ({ value: Math.round(a.percentage), label: `${a.topic.slice(0, 18)} · ${formatDate(a.completedAt, { day: 'numeric', month: 'short' })}` }));
  const last7 = days.slice(-7);

  return (
    <Page wide>
      <PageHeader eyebrow="Your learning" title="Progress" />

      {/* Streak hero */}
      {overview.loading ? (
        <Skeleton height={140} radius={22} />
      ) : (
        <div className="card card-hero">
          <div className="row-between">
            <div>
              <div className="small muted">Current streak</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                <span className="streak-number">{o.streak.current}</span>
                <span className="muted">days · best {o.streak.longest}</span>
              </div>
            </div>
            <div className="flame" style={{ background: 'rgba(255,255,255,.18)', boxShadow: 'none' }}>
              <Flame size={30} />
            </div>
          </div>
          <div className="row-between small" style={{ marginTop: 16 }}>
            <span className="muted">This week</span>
            <span className="bold">{formatMinutes(o.weekMinutes)}</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="stat-grid four" style={{ marginTop: 16 }}>
        {[
          { icon: Clock, label: 'Total study time', value: o ? formatMinutes(o.progress.studyTime) : null, cls: '' },
          { icon: FolderCheck, label: 'Completed materials', value: o?.progress.materialsCompleted, cls: 'success' },
          { icon: ListChecks, label: 'Completed quizzes', value: o?.progress.quizzesCompleted, cls: 'warning' },
          { icon: Target, label: 'Average quiz score', value: o ? `${Math.round(o.progress.averageScore)}%` : null, cls: '' },
        ].map((s) => (
          <div key={s.label} className="card stat">
            <span className={`icon-tile sm ${s.cls}`}><s.icon size={18} /></span>
            {s.value === null || s.value === undefined ? <Skeleton height={26} width={60} /> : <div className="value">{s.value}</div>}
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Week strip */}
      {last7.length === 7 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>This Week</h3>
          <div className="week-strip">
            {last7.map((d, i) => {
              const active = d.minutes || d.quizzes || d.uploads || d.chats;
              return (
                <div key={d.date} className={`day-pill ${active ? 'active' : ''} ${i === 6 ? 'today' : ''}`} title={`${d.date}: ${formatMinutes(d.minutes)}`}>
                  <span>{d.day}</span>
                  <span className="d-num">{Number(d.date.slice(8))}</span>
                  <span>{d.minutes ? formatMinutes(d.minutes) : '–'}</span>
                  {active ? <Check size={14} className="tick" /> : <span style={{ height: 14 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="two-col">
        <div>
          {/* Weekly progress chart */}
          <div className="card" style={{ marginTop: 16 }}>
            <div className="row-between" style={{ marginBottom: 18 }}>
              <div>
                <h3>Study time</h3>
                <div className="small text-2">
                  {weekly.data ? `${formatMinutes(weekly.data.totals.minutes)} in the last ${range} days · ${weekly.data.totals.activeDays} active days` : 'Loading…'}
                </div>
              </div>
              <div className="chips" style={{ padding: 0 }}>
                {[7, 30].map((r) => (
                  <button key={r} className={`chip ${range === r ? 'active' : ''}`} onClick={() => setRange(r)} style={{ padding: '6px 12px' }}>
                    {r}d
                  </button>
                ))}
              </div>
            </div>
            {weekly.loading ? (
              <Skeleton height={200} />
            ) : weekly.error ? (
              <ErrorState message={weekly.error} onRetry={weekly.reload} />
            ) : (
              <BarChart data={chartDays} valueKey="minutes" labelKey="label" todayIndex={chartDays.length - 1} formatValue={(v) => formatMinutes(v)} ariaLabel={`Study minutes per day for the last ${range} days`} />
            )}
          </div>

          {/* Quiz score trend */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Quiz scores</h3>
            <div className="small text-2" style={{ marginBottom: 12 }}>Your last {scorePoints.length || ''} quiz results</div>
            {history.loading ? (
              <Skeleton height={170} />
            ) : scorePoints.length < 1 ? (
              <EmptyState icon={Trophy} title="No quiz results yet" message="Take a quiz to see your score trend." action={<button className="btn sm" onClick={() => navigate('/quiz')}>Take a quiz</button>} />
            ) : (
              <LineChart points={scorePoints} ariaLabel="Quiz score percentage over your recent quizzes" />
            )}
          </div>
        </div>

        <div>
          {/* By subject */}
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginBottom: 14 }}>Average score by subject</h3>
            {o && o.scoreBySubject.length ? (
              <HBarList items={o.scoreBySubject.map((s) => ({ label: s.subject, value: Math.round(s.averageScore), sub: `${s.attempts} quiz${s.attempts === 1 ? '' : 'zes'}` }))} />
            ) : (
              <p className="small text-2">Complete quizzes in different subjects to compare your strengths.</p>
            )}
          </div>

          {/* Learning activity */}
          <div className="card list-card" style={{ marginTop: 16 }}>
            <h3 style={{ padding: '12px 12px 4px' }}>Learning activity</h3>
            {o && o.recentActivity.length === 0 && <p className="small text-2" style={{ padding: 12 }}>No activity yet.</p>}
            {o?.recentActivity.map((a, i) => {
              const Icon = ACTIVITY_ICONS[a.type] || Sparkles;
              return (
                <div key={`${a.type}-${a.refId}-${i}`} className="list-item">
                  <span className="icon-tile sm round"><Icon size={17} /></span>
                  <span className="grow">
                    <span className="small bold clamp-2" style={{ display: 'block' }}>{a.title}</span>
                    <span className="tiny muted">{timeAgo(a.at)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Page>
  );
}
