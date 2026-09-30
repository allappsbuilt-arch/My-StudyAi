/** 10. Study summary - AI results for one material, with Create Quiz / Save Notes / Ask AI. */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListChecks, NotebookPen, Sparkles, BookMarked, Lightbulb, Target, HelpCircle, Layers, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { materialApi, notesApi, analysisApi, getErrorMessage } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Markdown from '../components/Markdown';
import { PageLoader, ErrorState, EmptyState, Alert } from '../components/Feedback';
import FileTypeIcon from '../components/FileTypeIcon';
import { formatDate } from '../utils/format';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Section({ icon: Icon, title, children, count }) {
  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ marginBottom: 14 }}>
        <span className="icon-tile sm">
          <Icon size={18} />
        </span>
        <h3 className="grow">{title}</h3>
        {count !== undefined && <span className="badge neutral">{count}</span>}
      </div>
      {children}
    </section>
  );
}

/** Build a plain-text/markdown note from the analysis. */
function toNote(a) {
  const lines = [`## Summary`, a.summary, '', `## Key points`, ...a.keyPoints.map((k) => `- ${k}`)];
  if (a.definitions.length) lines.push('', '## Definitions', ...a.definitions.map((d) => `- **${d.term}**: ${d.definition}`));
  if (a.importantTopics.length) lines.push('', '## Important topics', ...a.importantTopics.map((t) => `- **${t.topic}**: ${t.description}`));
  if (a.importantQuestions.length) lines.push('', '## Exam questions', ...a.importantQuestions.map((q, i) => `${i + 1}. ${q.question}`));
  return lines.join('\n');
}

export default function SummaryScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [reanalysing, setReanalysing] = useState(false);

  const { data, loading, error, reload } = useApi(() => materialApi.get(id), [id]);

  if (loading) return <Page><PageLoader label="Loading summary..." /></Page>;
  if (error) {
    return (
      <Page>
        <PageHeader back="/materials" title="Study Summary" />
        <ErrorState message={error} onRetry={reload} />
      </Page>
    );
  }

  const { material, analysis } = data;

  if (!analysis) {
    return (
      <Page>
        <PageHeader back="/materials" title={material.filename} />
        <EmptyState
          icon={Sparkles}
          title="Not analysed yet"
          message="Run AI analysis to get a summary, key points and exam questions for this file."
          action={
            <Button icon={<Sparkles size={18} />} onClick={() => navigate(`/materials/${id}/analysis`, { state: { autoStart: true } })}>
              START AI ANALYSIS
            </Button>
          }
        />
      </Page>
    );
  }

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await notesApi.create({ title: `${analysis.title} – Summary`.slice(0, 200), subject: material.subject || '', content: toNote(analysis) });
      setSavedNoteId(res.note.id);
      toast.success('Saved to your notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const reanalyse = async () => {
    setReanalysing(true);
    try {
      await analysisApi.start(id);
      navigate(`/materials/${id}/analysis`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setReanalysing(false);
    }
  };

  return (
    <Page wide>
      <PageHeader
        back="/materials"
        eyebrow="Study Summary"
        title={analysis.title || material.filename}
        actions={
          <button className="icon-btn" onClick={reanalyse} aria-label="Analyse again" title="Analyse again" disabled={reanalysing}>
            <RefreshCw size={18} />
          </button>
        }
      />

      <div className="card card-hero">
        <div className="row">
          <div className="icon-tile" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>
            <FileText size={22} />
          </div>
          <div className="grow">
            <div className="bold truncate">{material.filename}</div>
            <div className="small muted">
              {material.subject || 'General'} · analysed {formatDate(analysis.createdAt)}
            </div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 16 }}>
          <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>{plural(analysis.keyPoints.length, 'key point')}</span>
          <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>{plural(analysis.definitions.length, 'definition')}</span>
          <span className="badge" style={{ background: 'rgba(255,255,255,.18)', color: '#fff' }}>{plural(analysis.importantQuestions.length, 'exam question')}</span>
        </div>
      </div>

      {analysis.wasTruncated && (
        <div style={{ marginTop: 14 }}>
          <Alert type="warning" icon={AlertTriangle}>
            This file was very long, so the AI analysed the first part of it. Split large files into chapters for complete coverage.
          </Alert>
        </div>
      )}

      <div className="two-col">
        <div>
          <Section icon={BookMarked} title="AI Summary">
            <Markdown>{analysis.summary}</Markdown>
          </Section>

          <Section icon={Lightbulb} title="Key Points" count={analysis.keyPoints.length}>
            <ol className="kp-list">
              {analysis.keyPoints.map((k, i) => (
                <li key={i}>
                  <span className="num">{i + 1}</span>
                  <span>{k}</span>
                </li>
              ))}
            </ol>
          </Section>

          {analysis.importantQuestions.length > 0 && (
            <Section icon={HelpCircle} title="Exam-Focused Questions" count={analysis.importantQuestions.length}>
              {analysis.importantQuestions.map((q, i) => (
                <details key={i} className="qa">
                  <summary>
                    <span className="icon-tile sm" style={{ width: 26, height: 26, borderRadius: 8, fontSize: '0.75rem' }}>
                      Q{i + 1}
                    </span>
                    <span className="grow">
                      {q.question} <span className="badge neutral" style={{ marginLeft: 6 }}>{q.type}</span>
                    </span>
                  </summary>
                  <div className="hint">💡 {q.answerHint}</div>
                </details>
              ))}
            </Section>
          )}
        </div>

        <div>
          {analysis.definitions.length > 0 && (
            <Section icon={Layers} title="Important Definitions" count={analysis.definitions.length}>
              {analysis.definitions.map((d, i) => (
                <div key={i} className="def">
                  <div className="term">{d.term}</div>
                  <div className="small text-2">{d.definition}</div>
                </div>
              ))}
            </Section>
          )}

          {analysis.importantTopics.length > 0 && (
            <Section icon={Target} title="Important Topics">
              <div className="stack" style={{ gap: 10 }}>
                {analysis.importantTopics.map((t, i) => (
                  <div key={i} className="card flat tight" style={{ background: 'var(--surface-2)', border: 0 }}>
                    <div className="bold small">{t.topic}</div>
                    <div className="small text-2">{t.description}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section icon={Sparkles} title="AI Recommendations">
            <ul className="kp-list">
              {analysis.recommendations.map((r, i) => (
                <li key={i}>
                  <span className="num">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>

      <div className="action-bar">
        <Button square icon={<ListChecks size={17} />} onClick={() => navigate('/quiz', { state: { materialId: Number(id), topic: analysis.title, subject: material.subject } })}>
          Create Quiz
        </Button>
        <Button
          square
          variant="soft"
          loading={saving}
          icon={<NotebookPen size={17} />}
          onClick={savedNoteId ? () => navigate('/notes', { state: { openNoteId: savedNoteId } }) : saveNotes}
        >
          {savedNoteId ? 'View Note' : 'Save Notes'}
        </Button>
        <Button square variant="soft" icon={<Sparkles size={17} />} onClick={() => navigate('/tutor', { state: { materialId: Number(id) } })}>
          Ask AI
        </Button>
      </div>
    </Page>
  );
}
