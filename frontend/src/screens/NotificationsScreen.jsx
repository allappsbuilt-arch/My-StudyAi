/**
 * Notifications - live updates built from the student's real data
 * (streak reminder, finished/failed analyses, quizzes waiting) + notification settings.
 */
import { useNavigate } from 'react-router-dom';
import { Bell, Flame, CheckCircle2, AlertTriangle, ListChecks, BellRing, Clock } from 'lucide-react';
import { progressApi, materialApi, quizApi, getErrorMessage } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import { Toggle } from '../components/FormFields';
import { EmptyState, SkeletonList, ErrorState } from '../components/Feedback';
import { timeAgo } from '../utils/format';

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const prefs = user?.preferences || {};

  const { data, loading, error, reload } = useApi(async () => {
    const [overview, materials, quizzes] = await Promise.all([progressApi.overview({ activityLimit: 1 }), materialApi.list(), quizApi.history()]);
    return { overview, materials: materials.materials, pending: quizzes.notAttempted };
  }, []);

  const items = [];
  if (data) {
    if (prefs.studyReminders && !data.overview.streak.studiedToday) {
      items.push({
        icon: Flame,
        tone: 'warning',
        title: data.overview.streak.current ? `Keep your ${data.overview.streak.current}-day streak alive!` : 'Start a study streak today',
        text: 'Study for a few minutes, take a quiz or ask the AI Tutor.',
        to: '/quiz',
      });
    }
    data.materials.slice(0, 20).forEach((m) => {
      if (m.analysisStatus === 'completed') items.push({ icon: CheckCircle2, tone: 'success', title: 'Study guide ready', text: m.filename, to: `/materials/${m.id}/summary`, at: m.uploadedAt });
      if (m.analysisStatus === 'failed') items.push({ icon: AlertTriangle, tone: 'danger', title: 'Analysis failed', text: `${m.filename} — tap to retry`, to: `/materials/${m.id}/analysis`, at: m.uploadedAt });
    });
    data.pending.slice(0, 5).forEach((q) => items.push({ icon: ListChecks, tone: '', title: 'Quiz waiting for you', text: `${q.topic} · ${q.totalQuestions} questions`, to: `/quiz/${q.id}`, at: q.createdAt }));
  }

  const setPref = async (key, value) => {
    try {
      if (key === 'pushNotifications' && value && 'Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      await updateUser({ preferences: { [key]: value } });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Page>
      <PageHeader back="/profile" title="Notifications" />

      <div className="settings-group-title">Preferences</div>
      <div className="card list-card">
        <div className="list-item">
          <span className="icon-tile sm"><Clock size={18} /></span>
          <span className="grow">
            <span className="bold" style={{ display: 'block' }}>Study Reminders</span>
            <span className="tiny muted">Remind me when I haven’t studied today</span>
          </span>
          <Toggle checked={Boolean(prefs.studyReminders)} onChange={(v) => setPref('studyReminders', v)} label="Study reminders" />
        </div>
        <div className="list-item">
          <span className="icon-tile sm"><BellRing size={18} /></span>
          <span className="grow">
            <span className="bold" style={{ display: 'block' }}>Push Notifications</span>
            <span className="tiny muted">Browser notification for your daily reminder</span>
          </span>
          <Toggle checked={Boolean(prefs.pushNotifications)} onChange={(v) => setPref('pushNotifications', v)} label="Push notifications" />
        </div>
      </div>

      <div className="settings-group-title">Updates</div>
      {loading ? (
        <SkeletonList count={3} height={64} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState icon={Bell} title="You’re all caught up" message="New updates about your materials and quizzes will appear here." />
      ) : (
        <div className="card list-card">
          {items.map((n, i) => (
            <button key={i} className="list-item" onClick={() => navigate(n.to)}>
              <span className={`icon-tile sm round ${n.tone}`}><n.icon size={17} /></span>
              <span className="grow">
                <span className="small bold" style={{ display: 'block' }}>{n.title}</span>
                <span className="tiny muted clamp-2">{n.text}{n.at ? ` · ${timeAgo(n.at)}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}
