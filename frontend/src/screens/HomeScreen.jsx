/** Home dashboard - greeting bar, streak, quick actions, today's plan, continue learning, recent activity. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, User, Flame, Layers, ScanLine, Languages, NotebookPen, ListChecks, Upload, Sparkles, ChevronRight, Clock,
  MessageCircle, FileUp, Brain, Trophy, StickyNote, Gamepad2, ArrowUp, Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useApi } from '../hooks/useApi';
import { progressApi, materialApi, planApi, flashcardApi, localDate } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { Avatar, BotIcon } from '../components/Brand';
import { ErrorState, Skeleton, SkeletonList } from '../components/Feedback';
import { ProgressBar } from '../components/Progress';
import FileTypeIcon from '../components/FileTypeIcon';
import { AlertDialog } from '../components/Ui';
import AssistantSheet from '../components/AssistantSheet';
import { firstName, timeAgo } from '../utils/format';

const ACTIVITY_ICONS = { upload: FileUp, analysis: Brain, quiz: Trophy, note: StickyNote, chat: MessageCircle, deck: Layers, game: Gamepad2, streak: Flame, badge: Award };
const CHECKIN_KEY = 'mystudyai_checkin';

export default function HomeScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ask, setAsk] = useState('');
  const [streakDialog, setStreakDialog] = useState(false);
  const [assistant, setAssistant] = useState({ open: false, prompt: '' });

  const overview = useApi(() => progressApi.overview({ activityLimit: 6 }), []);
  const materials = useApi(() => materialApi.list(), []);
  const plan = useApi(() => planApi.overview(), []);
  const decks = useApi(() => flashcardApi.decks(), []);

  // Daily check-in: opening the app counts as today's activity and keeps the streak going
  useEffect(() => {
    const today = localDate();
    let last = null;
    try { last = localStorage.getItem(`${CHECKIN_KEY}_${user?.id}`); } catch { /* ignore */ }
    if (!user || last === today) return;
    progressApi
      .addStudyTime(1)
      .then(() => {
        try { localStorage.setItem(`${CHECKIN_KEY}_${user.id}`, today); } catch { /* ignore */ }
        setStreakDialog(true);
        overview.reload({ silent: true });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const p = overview.data;
  const pl = plan.data;

  const continueItems = [
    ...(decks.data?.decks || []).map((d) => ({
      key: `d${d.id}`, icon: <span className="icon-tile sm"><Layers size={18} /></span>, title: d.title, pct: d.mastery,
      at: d.lastStudiedAt || d.updatedAt, to: `/flashcards/${d.id}`,
    })),
    ...(materials.data?.materials || []).map((m) => ({
      key: `m${m.id}`, icon: <FileTypeIcon type={m.fileType} size="sm" />, title: m.filename,
      pct: m.hasAnalysis ? 100 : m.analysisStatus === 'not_started' ? 10 : 50, at: m.uploadedAt,
      to: m.hasAnalysis ? `/materials/${m.id}/summary` : `/materials/${m.id}/analysis`,
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 8);

  const submitAsk = (e) => {
    e.preventDefault();
    setAssistant({ open: true, prompt: ask.trim() });
    setAsk('');
  };

  const openActivity = (a) => {
    if (a.type === 'upload' || a.type === 'analysis') navigate(`/materials/${a.refId}/summary`);
    else if (a.type === 'quiz') navigate('/quiz/history');
    else if (a.type === 'note') navigate('/notes');
    else if (a.type === 'chat') navigate('/tutor', { state: { conversationId: a.meta } });
    else if (a.type === 'deck') navigate(`/flashcards/${a.refId}`);
    else if (a.type === 'game') navigate('/games');
    else if (a.type === 'streak' || a.type === 'badge') navigate('/progress');
  };

  const quick = [
    { label: t('nav.flashcards'), icon: Layers, to: '/flashcards' },
    { label: t('home.scan'), icon: ScanLine, to: '/scan' },
    { label: t('home.translate'), icon: Languages, to: '/translate' },
    { label: t('nav.notes'), icon: NotebookPen, to: '/notes' },
    { label: t('nav.quiz'), icon: ListChecks, to: '/quiz' },
    { label: t('f.upload'), icon: Upload, to: '/materials/upload' },
    { label: t('nav.tutor'), icon: Sparkles, to: '/tutor' },
  ];

  return (
    <Page wide>
      <header className="top-bar">
        <button className="avatar-btn" onClick={() => navigate('/profile')} aria-label={t('nav.profile')} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer' }}>
          <Avatar user={user} />
        </button>
        <div className="grow">
          <div className="hello">{t('home.welcome')}</div>
          <div className="name truncate">{firstName(user?.name)}</div>
        </div>
        <button className="icon-btn" onClick={() => navigate('/profile/notifications')} aria-label={t('profile.notifications')}>
          <Bell size={20} />
          {p && !p.streak.studiedToday && <span className="dot" />}
        </button>
        <button className="icon-btn" onClick={() => navigate('/profile')} aria-label={t('nav.profile')}>
          <User size={20} />
        </button>
      </header>

      <div className="two-col">
        <div>
          {/* Streak */}
          {overview.loading ? (
            <Skeleton height={168} radius={20} />
          ) : overview.error ? (
            <div className="card"><ErrorState message={overview.error} onRetry={overview.reload} /></div>
          ) : (
            <div className="card streak-card pop-in">
              <div className="row-between">
                <div>
                  <div className="small text-2">{t('home.currentStreak')}</div>
                  <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                    <span className="streak-number">{p.streak.current}</span>
                    <span className="text-2">{p.streak.current === 1 ? t('common.day') : t('common.days')}</span>
                  </div>
                </div>
                <div className="flame"><Flame size={32} /></div>
              </div>
              <div className="divider-line" />
              <div className="row-between">
                <div>
                  <div className="tiny muted">{t('home.longestStreak')}</div>
                  <div className="bold">{p.streak.longest} {p.streak.longest === 1 ? t('common.day') : t('common.days')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tiny muted">{t('home.today')}</div>
                  <div className="row small bold" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <span className={`status-dot ${p.streak.studiedToday ? '' : 'warning'}`} />
                    {p.streak.studiedToday ? t('common.done') : t('common.pending')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="section-title"><h2>{t('home.quickActions')}</h2></div>
          <div className="quick-grid scroll">
            {quick.map((a) => (
              <button key={a.to} className="quick-tile" onClick={() => navigate(a.to)}>
                <span className="icon-tile"><a.icon size={22} /></span>
                {a.label}
              </button>
            ))}
          </div>

          {/* Today's study plan */}
          <div style={{ marginTop: 16 }}>
            {plan.loading ? (
              <Skeleton height={190} radius={20} />
            ) : pl ? (
              <div className="card clickable" onClick={() => navigate('/plan')} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate('/plan')}>
                <div className="row-between">
                  <div>
                    <h3>{t('home.todaysPlan')}</h3>
                    <div className="small text-2">{t('plan.subjects', { n: pl.tasks.length })}</div>
                  </div>
                  <ChevronRight size={20} className="muted" />
                </div>
                {pl.tasks.length ? (
                  <>
                    <div className="row-between small" style={{ margin: '14px 0 8px' }}>
                      <span className="text-2">{t('home.progress')}</span>
                      <span className="bold" style={{ color: 'var(--primary)' }}>{pl.todayProgress}%</span>
                    </div>
                    <ProgressBar thin value={pl.todayProgress} label={t('home.progress')} />
                    <div style={{ marginTop: 10 }}>
                      {pl.tasks.slice(0, 4).map((task) => (
                        <div key={task.id} className={`subject-row ${task.done ? 'done' : ''}`}>
                          <span className="dot" />
                          <span className="name truncate">{task.title}</span>
                          <span className="mins">{task.minutes} {t('common.min')}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="row small" style={{ marginTop: 12, color: 'var(--primary)', fontWeight: 600 }}>
                    {t('home.noPlan')} · {t('home.planNow')}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div>
          {/* Continue learning */}
          <div className="section-title">
            <h2>{t('home.continueLearning')}</h2>
            <button className="link" onClick={() => navigate('/materials')}>{t('common.seeAll')}</button>
          </div>
          {materials.loading || decks.loading ? (
            <div className="h-scroll">
              <Skeleton height={150} width={172} radius={20} />
              <Skeleton height={150} width={172} radius={20} />
            </div>
          ) : continueItems.length === 0 ? (
            <button className="explore-row" onClick={() => navigate('/materials/upload')}>
              <span className="icon-tile"><Upload size={22} /></span>
              <span className="grow">
                <span className="title" style={{ display: 'block' }}>{t('home.uploadFirst')}</span>
                <span className="desc" style={{ display: 'block' }}>{t('home.uploadFirstSub')}</span>
              </span>
              <ChevronRight size={20} className="chev" />
            </button>
          ) : (
            <div className="h-scroll">
              {continueItems.map((c) => (
                <div key={c.key} className="card clickable continue-card" onClick={() => navigate(c.to)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(c.to)}>
                  {c.icon}
                  <div className="bold small clamp-2" style={{ marginTop: 12, minHeight: 38 }}>{c.title}</div>
                  <ProgressBar thin value={c.pct} label={t('home.progress')} />
                  <div className="tiny muted">{c.pct}%</div>
                  <div className="tiny muted row" style={{ gap: 4, marginTop: 6 }}>
                    <Clock size={12} /> {timeAgo(c.at)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent activity */}
          <div className="section-title">
            <h2>{t('home.recentActivity')}</h2>
            <button className="link" onClick={() => navigate('/profile/history')}>{t('common.seeAll')}</button>
          </div>
          {overview.loading ? (
            <SkeletonList count={3} height={60} />
          ) : p && p.recentActivity.length === 0 ? (
            <div className="card small text-2 center">{t('home.noActivity')}</div>
          ) : p ? (
            <div className="card list-card stagger">
              {p.recentActivity.map((a, i) => {
                const Icon = ACTIVITY_ICONS[a.type] || Sparkles;
                return (
                  <button key={`${a.type}-${a.refId}-${i}`} className="list-item" onClick={() => openActivity(a)}>
                    <span className="icon-tile sm round"><Icon size={17} /></span>
                    <span className="grow">
                      <span className="small clamp-2" style={{ display: 'block', fontWeight: 500 }}>{a.title}</span>
                      <span className="tiny muted">{timeAgo(a.at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Ask StudyAI */}
          <form className="ask-box" onSubmit={submitAsk} role="search" style={{ marginTop: 18 }}>
            <span className="bot" style={{ width: 34, height: 34, borderRadius: 10, background: '#0b1220', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <BotIcon size={22} />
            </span>
            <input value={ask} onChange={(e) => setAsk(e.target.value)} onFocus={() => !ask && setAssistant({ open: true, prompt: '' })} placeholder={t('home.askPlaceholder')} aria-label={t('home.askTitle')} />
            <button type="submit" className="icon-btn primary" aria-label={t('home.askTitle')}>
              <ArrowUp size={20} />
            </button>
          </form>
        </div>
      </div>

      <AssistantSheet open={assistant.open} initialPrompt={assistant.prompt} onClose={() => setAssistant({ open: false, prompt: '' })} />
      <AlertDialog open={streakDialog} title={`🎉 ${t('home.streakUpdated')}`} message={t('home.streakUpdatedMsg')} onClose={() => setStreakDialog(false)} />
    </Page>
  );
}
