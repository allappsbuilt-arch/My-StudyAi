/** Essay Help - Write (outline from a topic), Improve (edit your writing), Structure (analyse a draft). */
import { useState } from 'react';
import { PenSquare, Wand2, GitBranch, Trash2, ListTree, Search, CheckCircle2, NotebookPen, Lightbulb } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { toolsApi, notesApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader, Segmented } from '../components/Ui';
import Button from '../components/Button';
import Markdown from '../components/Markdown';
import { Alert } from '../components/Feedback';
import AiNotice from '../components/AiNotice';

const HELP = [
  { icon: PenSquare, text: 'Generate essay outlines and ideas' },
  { icon: Wand2, text: 'Improve your writing and clarity' },
  { icon: GitBranch, text: 'Structure essays effectively' },
  { icon: Search, text: 'Find supporting arguments' },
  { icon: CheckCircle2, text: 'Check grammar and flow' },
  { icon: ListTree, text: 'Plan introductions and conclusions' },
];

export default function EssayScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const [mode, setMode] = useState('write');
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await toolsApi.essay({ mode, text });
      setResult(res.result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      await notesApi.create({ title: `Essay ${mode}: ${text.slice(0, 60)}`, subject: 'Writing', content: result });
      toast.success('Saved to Notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const write = mode === 'write';

  return (
    <Page>
      <SimpleHeader title={t('tools.essayTitle')} />
      <AiNotice style={{ marginBottom: 12 }} />
      <Segmented
        label="Mode"
        value={mode}
        onChange={(m) => { setMode(m); setResult(''); }}
        options={[
          { value: 'write', label: t('tools.write'), icon: PenSquare },
          { value: 'improve', label: t('tools.improve'), icon: Wand2 },
          { value: 'structure', label: t('tools.structure'), icon: GitBranch },
        ]}
      />

      <div className="card stack" style={{ marginTop: 14 }}>
        <label className="small text-2" htmlFor="essay-input">{write ? t('tools.essayTopic') : 'Your writing'}</label>
        {write ? (
          <input id="essay-input" className="input filled" placeholder="e.g. The impact of social media on mental health" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} />
        ) : (
          <textarea id="essay-input" className="textarea filled" style={{ minHeight: 180 }} placeholder="Paste your essay or paragraph…" value={text} onChange={(e) => setText(e.target.value)} maxLength={30000} />
        )}
        <div className="row" style={{ gap: 10 }}>
          <button className="icon-btn soft" onClick={() => { setText(''); setResult(''); }} aria-label="Clear"><Trash2 size={18} /></button>
          <Button className="grow square" loading={loading} disabled={text.trim().length < 3} onClick={run}>
            {write ? t('tools.generateOutline') : mode === 'improve' ? t('tools.improve') : t('tools.structure')}
          </Button>
        </div>
      </div>
      {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}

      {result ? (
        <div className="card pop-in" style={{ marginTop: 16 }}>
          <Markdown>{result}</Markdown>
          <Button variant="soft" size="sm" icon={<NotebookPen size={15} />} style={{ marginTop: 14 }} onClick={save}>{t('tools.saveNote')}</Button>
        </div>
      ) : (
        <>
          <div className="section-title"><h2>{t('tools.whatHelp')}</h2></div>
          <div className="stack stagger" style={{ gap: 10 }}>
            {HELP.map((h) => (
              <div key={h.text} className="card row" style={{ padding: 14 }}>
                <h.icon size={18} color="var(--primary)" />
                <span className="small">{h.text}</span>
              </div>
            ))}
            <div className="card row small text-2" style={{ padding: 14 }}>
              <Lightbulb size={18} color="var(--warning)" /> StudyAI explains its suggestions so you learn to write better - use it to improve your own work.
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
