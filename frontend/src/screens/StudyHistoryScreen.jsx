/** Study history - everything the student has done, newest first. */
import { useNavigate } from 'react-router-dom';
import { History, FileUp, Brain, Trophy, StickyNote, MessageCircle, Sparkles, Layers, Gamepad2, Flame, Award } from 'lucide-react';
import { progressApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { formatDateTime } from '../utils/format';

const ICONS = { upload: FileUp, analysis: Brain, quiz: Trophy, note: StickyNote, chat: MessageCircle, deck: Layers, game: Gamepad2, streak: Flame, badge: Award };

export default function StudyHistoryScreen() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => progressApi.overview({ activityLimit: 50 }), []);
  const items = data?.recentActivity || [];

  const open = (a) => {
    if (a.type === 'upload' || a.type === 'analysis') navigate(`/materials/${a.refId}/summary`);
    else if (a.type === 'quiz') navigate('/quiz/history');
    else if (a.type === 'note') navigate('/notes');
    else if (a.type === 'chat') navigate('/tutor', { state: { conversationId: a.meta } });
  };

  // Group by day
  const groups = items.reduce((acc, a) => {
    const key = new Date(a.at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {});

  return (
    <Page>
      <PageHeader back="/profile" title="Study History" />
      {loading ? (
        <SkeletonList count={5} height={60} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState icon={History} title="No history yet" message="Your uploads, quizzes, notes and AI chats will appear here." />
      ) : (
        Object.entries(groups).map(([day, list]) => (
          <section key={day}>
            <div className="settings-group-title">{day}</div>
            <div className="card list-card">
              {list.map((a, i) => {
                const Icon = ICONS[a.type] || Sparkles;
                return (
                  <button key={`${a.type}-${a.refId}-${i}`} className="list-item" onClick={() => open(a)}>
                    <span className="icon-tile sm round"><Icon size={17} /></span>
                    <span className="grow">
                      <span className="small bold clamp-2" style={{ display: 'block' }}>{a.title}</span>
                      <span className="tiny muted">{formatDateTime(a.at)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </Page>
  );
}
