/** 14. Quiz result - score, stats, and every answer with its explanation. */
import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, MinusCircle, ListChecks, Clock, RotateCcw, Home, Trophy } from 'lucide-react';
import { quizApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { ProgressRing } from '../components/Progress';
import { PageLoader, ErrorState } from '../components/Feedback';
import { formatClock } from '../utils/format';

const LETTERS = ['A', 'B', 'C', 'D'];

function message(pct) {
  if (pct >= 90) return { title: 'Outstanding! 🏆', text: 'You have mastered this topic.' };
  if (pct >= 75) return { title: 'Great job! 🎉', text: 'Just a few details to polish.' };
  if (pct >= 50) return { title: 'Good effort! 💪', text: 'Review the explanations below and try again.' };
  return { title: 'Keep practising! 📚', text: 'Read the explanations, then retry to lock it in.' };
}

export default function QuizResultScreen() {
  const { attemptId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const fromState = location.state?.result;
  const { data, loading, error, reload } = useApi(() => (fromState ? Promise.resolve({ result: fromState }) : quizApi.attempt(attemptId)), [attemptId]);

  if (loading) return <Page><PageLoader label="Loading result..." /></Page>;
  if (error) return <Page><PageHeader back="/quiz/history" title="Quiz Result" /><ErrorState message={error} onRetry={reload} /></Page>;

  const r = data.result;
  const pct = Math.round(r.percentage);
  const m = message(pct);
  const ringColor = pct >= 75 ? 'var(--success)' : pct >= 50 ? 'var(--primary)' : 'var(--warning)';
  const shown = r.questions.filter((q) => (filter === 'all' ? true : filter === 'wrong' ? !q.isCorrect : q.isCorrect));

  return (
    <Page>
      <PageHeader back="/quiz/history" eyebrow={`${r.quiz.subject} · ${r.quiz.difficulty}`} title={r.quiz.topic} />

      <div className="card result-hero fade-in">
        <ProgressRing value={pct} size={150} stroke={12} color={ringColor}>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1 }}>{pct}%</div>
          <div className="small text-2">Score</div>
        </ProgressRing>
        <h2>{m.title}</h2>
        <p className="text-2 small">{m.text}</p>
        <div className="badge" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
          <Trophy size={14} /> {r.score} / {r.totalQuestions} correct
        </div>
      </div>

      <div className="stat-grid four" style={{ marginTop: 16 }}>
        <div className="card stat">
          <span className="icon-tile sm success"><CheckCircle2 size={18} /></span>
          <div className="value">{r.correctAnswers}</div>
          <div className="label">Correct answers</div>
        </div>
        <div className="card stat">
          <span className="icon-tile sm danger"><XCircle size={18} /></span>
          <div className="value">{r.wrongAnswers + r.unanswered}</div>
          <div className="label">Wrong answers{r.unanswered ? ` (${r.unanswered} skipped)` : ''}</div>
        </div>
        <div className="card stat">
          <span className="icon-tile sm"><ListChecks size={18} /></span>
          <div className="value">{r.totalQuestions}</div>
          <div className="label">Total questions</div>
        </div>
        <div className="card stat">
          <span className="icon-tile sm warning"><Clock size={18} /></span>
          <div className="value">{formatClock(r.timeTaken)}</div>
          <div className="label">Time taken</div>
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        <Button variant="secondary" className="grow" icon={<RotateCcw size={18} />} onClick={() => navigate(`/quiz/${r.quiz.id}`)}>
          Retry Quiz
        </Button>
        <Button className="grow" icon={<Home size={18} />} onClick={() => navigate('/home')}>
          Back to Dashboard
        </Button>
      </div>

      <div className="section-title">
        <h2>Answer explanations</h2>
      </div>
      <div className="chips">
        {[
          { v: 'all', l: `All (${r.questions.length})` },
          { v: 'wrong', l: `Wrong (${r.questions.filter((q) => !q.isCorrect).length})` },
          { v: 'correct', l: `Correct (${r.correctAnswers})` },
        ].map((f) => (
          <button key={f.v} className={`chip ${filter === f.v ? 'active' : ''}`} onClick={() => setFilter(f.v)}>
            {f.l}
          </button>
        ))}
      </div>

      <div className="stack" style={{ marginTop: 12 }}>
        {shown.map((q) => {
          const n = r.questions.indexOf(q) + 1;
          return (
            <div key={q.questionId} className="card">
              <div className="row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
                {q.isCorrect ? (
                  <CheckCircle2 size={22} color="var(--success)" style={{ flexShrink: 0 }} />
                ) : q.selectedAnswer ? (
                  <XCircle size={22} color="var(--danger)" style={{ flexShrink: 0 }} />
                ) : (
                  <MinusCircle size={22} color="var(--muted)" style={{ flexShrink: 0 }} />
                )}
                <p className="bold grow">
                  {n}. {q.question}
                </p>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {q.options.map((opt, i) => {
                  const letter = LETTERS[i];
                  const cls = letter === q.correctAnswer ? 'correct' : letter === q.selectedAnswer ? 'wrong' : '';
                  return (
                    <div key={letter} className={`answer ${cls}`} style={{ cursor: 'default' }}>
                      <span className="letter">{letter}</span>
                      <span className="text small">{opt}</span>
                      {letter === q.selectedAnswer && <span className="tiny muted">Your answer</span>}
                    </div>
                  );
                })}
              </div>
              {!q.selectedAnswer && <p className="small muted" style={{ marginTop: 10 }}>You skipped this question.</p>}
              <div className="explain">
                <strong>Explanation: </strong>
                {q.explanation}
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}
