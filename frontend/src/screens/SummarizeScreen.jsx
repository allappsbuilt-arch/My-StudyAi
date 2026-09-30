/** Summarize - paste text (or pick a note) and get an AI summary; save it as a note. */
import { useState } from 'react';
import { FileText, NotebookPen, Sparkles } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { toolsApi, notesApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader, Segmented } from '../components/Ui';
import Button from '../components/Button';
import Markdown from '../components/Markdown';
import { Alert } from '../components/Feedback';
import AiNotice from '../components/AiNotice';

const MAX = 150000;

export default function SummarizeScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const notes = useApi(() => notesApi.list(), []);
  const [text, setText] = useState('');
  const [length, setLength] = useState('medium');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await toolsApi.summarize({ text, length });
      setSummary(res.summary);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      await notesApi.create({ title: `Summary: ${text.trim().split('\n')[0].slice(0, 60)}`, subject: 'Summary', content: summary });
      toast.success('Saved to Notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Page>
      <SimpleHeader title={t('tools.summarizeTitle')} />
      <AiNotice style={{ marginBottom: 12 }} />

      {notes.data?.notes?.length > 0 && (
        <div className="field" style={{ marginBottom: 12 }}>
          <label htmlFor="from-note">Summarize one of your notes</label>
          <select id="from-note" className="select" defaultValue="" onChange={(e) => { const n = notes.data.notes.find((x) => String(x.id) === e.target.value); if (n) setText(n.content); }}>
            <option value="">Choose a note…</option>
            {notes.data.notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
          </select>
        </div>
      )}

      <div className="card text-panel">
        <div className="label"><span><FileText size={13} style={{ verticalAlign: -2 }} /> Text to summarize</span></div>
        <textarea style={{ minHeight: 200 }} value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} placeholder="Paste an article, chapter or your notes…" aria-label="Text to summarize" />
        <div className="counter">{text.length.toLocaleString()} characters</div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Segmented label="Summary length" value={length} onChange={setLength} options={[{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Detailed' }]} />
      </div>
      <Button block size="lg" className="square" style={{ marginTop: 12 }} icon={<Sparkles size={18} />} loading={loading} disabled={text.trim().length < 20} onClick={run}>
        {t('tools.summarizeTitle')}
      </Button>
      {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}

      {summary && (
        <div className="card pop-in" style={{ marginTop: 16 }}>
          <Markdown>{summary}</Markdown>
          <Button variant="soft" size="sm" icon={<NotebookPen size={15} />} style={{ marginTop: 14 }} onClick={save}>{t('tools.saveNote')}</Button>
        </div>
      )}
    </Page>
  );
}
