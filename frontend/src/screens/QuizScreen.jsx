/** 13. Quiz - one question at a time, timer, previous/next, submit. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, Send, X } from 'lucide-react';
import { quizApi, getErrorMessage } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Page } from '../navigation/AppLayout';
import Button from '../components/Button';
import { ProgressBar } from '../components/Progress';
import { PageLoader, ErrorState } from '../components/Feedback';
import { ConfirmDialog } from '../components/Modal';
import { formatClock } from '../utils/format';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => quizApi.get(id), [id]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const submittedRef = useRef(false);

  const quiz = data?.quiz;
  const questions = data?.questions || [];
  const timeLimit = quiz?.timeLimit || 0;
  const remaining = Math.max(0, timeLimit - elapsed);

  // Reset when a new quiz loads (Retry opens the same quiz again)
  useEffect(() => {
    setIndex(0);
    setAnswers({});
    setElapsed(0);
    submittedRef.current = false;
  }, [id]);

  // Timer
  useEffect(() => {
    if (!quiz) return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [quiz]);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await quizApi.submit(id, { answers, timeTaken: elapsed });
      navigate(`/quiz/result/${res.result.attemptId}`, { replace: true, state: { result: res.result } });
    } catch (err) {
      submittedRef.current = false;
      toast.error(getErrorMessage(err));
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }, [id, answers, elapsed, navigate, toast]);

  // Time's up -> submit automatically
  useEffect(() => {
    if (quiz && timeLimit > 0 && remaining === 0 && !submittedRef.current) {
      toast.info('Time’s up! Submitting your answers.');
      submit();
    }
  }, [quiz, timeLimit, remaining, submit, toast]);

  // Keyboard: 1-4 / A-D to answer, arrows to move
  useEffect(() => {
    const onKey = (e) => {
      if (!questions.length || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const q = questions[index];
      const k = e.key.toUpperCase();
      const letter = ['1', '2', '3', '4'].includes(k) ? LETTERS[Number(k) - 1] : LETTERS.includes(k) ? k : null;
      if (letter) setAnswers((a) => ({ ...a, [q.id]: letter }));
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [questions, index]);

  if (loading) return <Page><PageLoader label="Loading quiz..." /></Page>;
  if (error) return <Page><ErrorState message={error} onRetry={reload} /></Page>;
  if (!questions.length) return <Page><ErrorState message="This quiz has no questions." /></Page>;

  const q = questions[index];
  const answeredCount = Object.keys(answers).length;
  const unanswered = questions.length - answeredCount;
  const isLast = index === questions.length - 1;

  return (
    <Page>
      <div className="quiz-top">
        <button className="icon-btn" onClick={() => setConfirmExit(true)} aria-label="Leave quiz">
          <X size={20} />
        </button>
        <div className="grow center">
          <div className="small bold truncate">{quiz.topic}</div>
          <div className="tiny muted">
            {quiz.subject} · {quiz.difficulty}
          </div>
        </div>
        <span className={`timer ${timeLimit && remaining <= 30 ? 'low' : ''}`} aria-label="Time remaining">
          <Clock size={16} /> {timeLimit ? formatClock(remaining) : formatClock(elapsed)}
        </span>
      </div>

      <div className="row-between small" style={{ marginBottom: 8 }}>
        <span className="bold">
          Question {index + 1} <span className="muted">of {questions.length}</span>
        </span>
        <span className="text-2">{answeredCount} answered</span>
      </div>
      <ProgressBar value={((index + 1) / questions.length) * 100} label="Quiz progress" />

      <div className="card q-card fade-in" key={q.id} style={{ marginTop: 18 }}>
        <p className="q-text">{q.question}</p>
        <div className="stack" style={{ marginTop: 20, gap: 10 }} role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, i) => {
            const letter = LETTERS[i];
            const selected = answers[q.id] === letter;
            return (
              <button
                key={letter}
                className={`answer ${selected ? 'selected' : ''}`}
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: letter }))}
                role="radio"
                aria-checked={selected}
              >
                <span className="letter">{letter}</span>
                <span className="text">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="q-dots" style={{ margin: '18px 0' }} aria-label="Jump to question">
        {questions.map((qq, i) => (
          <button key={qq.id} className={`q-dot ${answers[qq.id] ? 'answered' : ''} ${i === index ? 'current' : ''}`} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}${answers[qq.id] ? ', answered' : ''}`}>
            {i + 1}
          </button>
        ))}
      </div>

      <div className="row" style={{ gap: 10 }}>
        <Button variant="secondary" icon={<ArrowLeft size={18} />} onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
          Previous
        </Button>
        {isLast ? (
          <Button className="grow" icon={<Send size={18} />} onClick={() => setConfirmSubmit(true)} loading={submitting}>
            Submit Quiz
          </Button>
        ) : (
          <Button className="grow" iconRight={<ArrowRight size={18} />} onClick={() => setIndex((i) => i + 1)}>
            Next
          </Button>
        )}
      </div>
      {!isLast && (
        <div style={{ marginTop: 12 }}>
          <Button variant="ghost" block onClick={() => setConfirmSubmit(true)} disabled={submitting}>
            Submit Quiz now
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit quiz?"
        message={unanswered ? `You still have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Unanswered questions count as wrong.` : 'Great, you answered every question. Ready to see your score?'}
        confirmLabel="Submit"
        danger={false}
        loading={submitting}
        onConfirm={submit}
        onCancel={() => setConfirmSubmit(false)}
      />
      <ConfirmDialog
        open={confirmExit}
        title="Leave this quiz?"
        message="Your answers will not be saved. You can take this quiz later from Quiz History."
        confirmLabel="Leave"
        onConfirm={() => navigate('/quiz/history', { replace: true })}
        onCancel={() => setConfirmExit(false)}
      />
    </Page>
  );
}
