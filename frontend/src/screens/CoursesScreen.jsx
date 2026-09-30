/** My Courses - subjects the student studies (from setup + notes, quizzes and materials). */
import { useNavigate } from 'react-router-dom';
import { BookOpen, ListChecks, NotebookPen, Settings } from 'lucide-react';
import { userApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';

export default function CoursesScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => userApi.getProfile(), []);

  const activity = Object.fromEntries((data?.courses || []).map((c) => [c.subject, c.items]));
  const all = [...new Set([...(user?.preferences?.subjects || []), ...Object.keys(activity)])];

  return (
    <Page>
      <PageHeader back="/profile" title="My Courses" actions={<button className="icon-btn" onClick={() => navigate('/profile/settings')} aria-label="Edit subjects"><Settings size={18} /></button>} />
      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : all.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" message="Choose your subjects in Settings, or create notes and quizzes to see them here." action={<Button onClick={() => navigate('/profile/settings')}>Choose subjects</Button>} />
      ) : (
        <div className="stack">
          {all.map((s) => (
            <div key={s} className="card tight">
              <div className="row">
                <span className="icon-tile"><BookOpen size={20} /></span>
                <div className="grow">
                  <div className="bold truncate">{s}</div>
                  <div className="tiny muted">{activity[s] ? `${activity[s]} notes, quizzes & materials` : 'No study items yet'}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button className="btn soft sm" onClick={() => navigate('/quiz', { state: { subject: s } })}><ListChecks size={15} /> Quiz</button>
                <button className="btn ghost sm" onClick={() => navigate('/notes')}><NotebookPen size={15} /> Notes</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
