/** 12. Quiz setup - choose subject, topic, number of questions and difficulty. */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, History, FileText, X, Check, Gauge, Minus, Plus } from 'lucide-react';
import { quizApi, materialApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { TextInput, Field } from '../components/FormFields';
import { Alert } from '../components/Feedback';
import AiNotice from '../components/AiNotice';
import { DIFFICULTIES, SUBJECTS } from '../utils/constants';

export default function QuizSetupScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [materialId, setMaterialId] = useState(location.state?.materialId || null);
  const [materialName, setMaterialName] = useState('');
  const [subject, setSubject] = useState(location.state?.subject || '');
  const [topic, setTopic] = useState(location.state?.topic || '');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const subjects = [...new Set([...(user?.preferences?.subjects || []), ...SUBJECTS])].slice(0, 12);

  useEffect(() => {
    if (!materialId) return;
    materialApi
      .get(materialId)
      .then((r) => {
        setMaterialName(r.analysis?.title || r.material.filename);
        setSubject((s) => s || r.material.subject || '');
        setTopic((t) => t || r.analysis?.title || '');
      })
      .catch(() => setMaterialId(null));
  }, [materialId]);

  const generate = async () => {
    const errs = {};
    if (!subject.trim()) errs.subject = 'Choose or type a subject.';
    if (!topic.trim()) errs.topic = 'Enter a topic, e.g. “Newton’s laws”.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setGenerating(true);
    setError('');
    try {
      const res = await quizApi.generate({ subject: subject.trim(), topic: topic.trim(), numQuestions: count, difficulty, materialId: materialId || undefined });
      navigate(`/quiz/${res.quiz.id}`, { replace: false });
    } catch (err) {
      setError(getErrorMessage(err));
      setGenerating(false);
    }
  };

  return (
    <Page>
      <PageHeader
        back
        eyebrow="Practice"
        title="Create a Quiz"
        actions={
          <button className="icon-btn" onClick={() => navigate('/quiz/history')} aria-label="Quiz history" title="Quiz history">
            <History size={19} />
          </button>
        }
      />

      {generating ? (
        <div className="card center fade-in" style={{ padding: '40px 20px' }}>
          <div className="stack" style={{ alignItems: 'center' }}>
            <div className="pulse-orb">
              <div className="icon-tile solid lg round">
                <Sparkles size={28} />
              </div>
            </div>
            <h2>Generating your quiz…</h2>
            <p className="small text-2" style={{ maxWidth: 320 }}>
              StudyAI is writing {count} {difficulty} questions about “{topic}”. This takes about 15–40 seconds.
            </p>
            <div className="progress indeterminate" style={{ width: '70%' }}>
              <span />
            </div>
          </div>
        </div>
      ) : (
        <div className="stack-lg">
          <AiNotice />
          {error && <Alert>{error}</Alert>}

          {materialId && materialName && (
            <div className="chat-context" style={{ margin: 0 }}>
              <FileText size={16} />
              <span className="grow truncate">Questions from: {materialName}</span>
              <button className="icon-btn plain sm" style={{ color: 'inherit', width: 28, height: 28 }} onClick={() => setMaterialId(null)} aria-label="Don't use this material">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="card stack">
            <Field label="Subject" error={errors.subject}>
              <div className="chips wrap">
                {subjects.map((s) => (
                  <button key={s} className={`chip ${subject === s ? 'active' : ''}`} onClick={() => setSubject(s)} aria-pressed={subject === s}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>
            <TextInput label="Or type a subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Organic Chemistry" maxLength={100} />
            <TextInput label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} error={errors.topic} placeholder="e.g. Photosynthesis, Quadratic equations" maxLength={200} />
          </div>

          <div className="card">
            <div className="row-between">
              <div>
                <h3>Number of questions</h3>
                <p className="small text-2">Between 3 and 30</p>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button className="icon-btn soft sm" onClick={() => setCount((c) => Math.max(3, c - 1))} aria-label="Fewer questions">
                  <Minus size={16} />
                </button>
                <span className="bold" style={{ minWidth: 28, textAlign: 'center', fontSize: '1.2rem' }} aria-live="polite">
                  {count}
                </span>
                <button className="icon-btn soft sm" onClick={() => setCount((c) => Math.min(30, c + 1))} aria-label="More questions">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="chips" style={{ marginTop: 14 }}>
              {[5, 10, 15, 20].map((n) => (
                <button key={n} className={`chip ${count === n ? 'active' : ''}`} onClick={() => setCount(n)}>
                  {n} questions
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="icon-tile sm">
                <Gauge size={18} />
              </span>
              <h3>Difficulty</h3>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {DIFFICULTIES.map((d) => (
                <button key={d.value} className={`option-card ${difficulty === d.value ? 'selected' : ''}`} onClick={() => setDifficulty(d.value)} aria-pressed={difficulty === d.value}>
                  <span className="grow">
                    <span style={{ display: 'block' }}>{d.label}</span>
                    <span className="small text-2" style={{ fontWeight: 400 }}>{d.hint}</span>
                  </span>
                  {difficulty === d.value && <Check size={20} className="check" />}
                </button>
              ))}
            </div>
          </div>

          <Button size="lg" block icon={<Sparkles size={18} />} onClick={generate}>
            Generate Quiz
          </Button>
        </div>
      )}
    </Page>
  );
}
