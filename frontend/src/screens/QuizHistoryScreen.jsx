/** Quiz history - past attempts (with scores) and quizzes not yet taken. */
import { useNavigate } from 'react-router-dom';
import { Plus, ListChecks, Trophy, ChevronRight, PlayCircle } from 'lucide-react';
import { quizApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { formatClock, formatDateTime } from '../utils/format';

function scoreBadge(pct) {
  if (pct >= 75) return 'success';
  if (pct >= 50) return '';
  return 'warning';
}

export default function QuizHistoryScreen() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(() => quizApi.history(), []);

  return (
    <Page>
      <PageHeader
        back="/study"
        eyebrow="Practice"
        title="Quiz History"
        actions={
          <Button size="sm" icon={<Plus size={16} />} onClick={() => navigate('/quiz')}>
            New Quiz
          </Button>
        }
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data.attempts.length && !data.notAttempted.length ? (
        <EmptyState
          icon={ListChecks}
          title="No quizzes yet"
          message="Generate your first AI quiz on any topic, or from one of your study materials."
          action={<Button icon={<Plus size={18} />} onClick={() => navigate('/quiz')}>Generate Quiz</Button>}
        />
      ) : (
        <>
          {data.notAttempted.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: 4 }}>
                <h2>Ready to take</h2>
                <span className="count">{data.notAttempted.length}</span>
              </div>
              <div className="card list-card">
                {data.notAttempted.map((q) => (
                  <button key={q.id} className="list-item" onClick={() => navigate(`/quiz/${q.id}`)}>
                    <span className="icon-tile sm"><PlayCircle size={18} /></span>
                    <span className="grow">
                      <span className="bold small truncate" style={{ display: 'block' }}>{q.topic}</span>
                      <span className="tiny muted">{q.subject} · {q.difficulty} · {q.totalQuestions} questions</span>
                    </span>
                    <ChevronRight size={18} className="chev" />
                  </button>
                ))}
              </div>
            </>
          )}

          {data.attempts.length > 0 && (
            <>
              <div className="section-title">
                <h2>Completed</h2>
                <span className="count">{data.attempts.length}</span>
              </div>
              <div className="card list-card">
                {data.attempts.map((a) => (
                  <button key={a.attemptId} className="list-item" onClick={() => navigate(`/quiz/result/${a.attemptId}`)}>
                    <span className="icon-tile sm"><Trophy size={18} /></span>
                    <span className="grow">
                      <span className="bold small truncate" style={{ display: 'block' }}>{a.topic}</span>
                      <span className="tiny muted">
                        {a.subject} · {a.difficulty} · {formatDateTime(a.completedAt)} · {formatClock(a.timeTaken)}
                      </span>
                    </span>
                    <span className={`badge ${scoreBadge(a.percentage)}`}>{Math.round(a.percentage)}%</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Page>
  );
}
