/** Scan & Solve - take/upload a photo of a question (or type it); the AI returns a step-by-step solution. */
import { useEffect, useRef, useState } from 'react';
import { ScanLine, Camera, ImageUp, X, Sparkles, NotebookPen } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { toolsApi, notesApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import Markdown from '../components/Markdown';
import { Alert, Spinner } from '../components/Feedback';
import AiNotice from '../components/AiNotice';

export default function ScanSolveScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const cameraRef = useRef(null);
  const fileRef = useRef(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [question, setQuestion] = useState('');
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const solve = async (file, text) => {
    setLoading(true);
    setError('');
    setSolution('');
    try {
      const res = await toolsApi.solve({ image: file, question: text });
      setSolution(res.solution);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error('Please use a JPG, PNG or WEBP photo.');
    setImage(f);
    setPreview(URL.createObjectURL(f));
    solve(f, question);
  };

  const clear = () => {
    setImage(null);
    setPreview('');
    setSolution('');
    setError('');
  };

  const saveNote = async () => {
    try {
      await notesApi.create({ title: `Solution: ${(question || 'Scanned question').slice(0, 80)}`, subject: 'Scan & Solve', content: solution });
      toast.success('Saved to Notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Page>
      <SimpleHeader title={t('f.scan')} />
      <AiNotice style={{ marginBottom: 12 }} />

      {preview ? (
        <div className="scan-preview pop-in">
          <img src={preview} alt="Your question" />
          <button className="x" onClick={clear} aria-label="Remove photo"><X size={18} /></button>
        </div>
      ) : (
        <div className="scan-hero page-enter">
          <div className="frame"><ScanLine size={44} /></div>
          <h2>{t('tools.scanTitle')}</h2>
          <p className="text-2 small" style={{ maxWidth: 340 }}>{t('tools.scanSub')}</p>
        </div>
      )}

      {!preview && (
        <div className="stack" style={{ marginTop: 16 }}>
          <Button size="lg" block icon={<Camera size={18} />} className="square" onClick={() => cameraRef.current?.click()}>{t('tools.takePhoto')}</Button>
          <Button size="lg" block variant="secondary" icon={<ImageUp size={18} />} className="square" onClick={() => fileRef.current?.click()}>{t('tools.uploadImage')}</Button>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
          <div className="caps-title center" style={{ marginBottom: 4 }}>{t('tools.supports')}</div>
          <div className="chips" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Math', 'Physics', 'Chemistry', 'Biology', 'Text'].map((s) => <span key={s} className="chip outline" style={{ cursor: 'default' }}>{s}</span>)}
          </div>
          <div className="divider" style={{ margin: '8px 0' }}>{t('tools.typeQuestion')}</div>
          <div className="chat-input">
            <textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Solve 2x² + 5x - 3 = 0" aria-label={t('tools.typeQuestion')} maxLength={5000} />
            <button className="icon-btn primary" onClick={() => solve(null, question)} disabled={!question.trim() || loading} aria-label={t('tools.solve')}><Sparkles size={18} /></button>
          </div>
        </div>
      )}

      {loading && (
        <div className="state">
          <Spinner size="lg" />
          <p>{t('tools.analyzing')}</p>
        </div>
      )}
      {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
      {error && image && <Button block variant="secondary" style={{ marginTop: 10 }} onClick={() => solve(image, question)}>{t('common.retry')}</Button>}

      {solution && (
        <div className="card pop-in" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 10 }}>{t('tools.solution')}</h3>
          <Markdown>{solution}</Markdown>
          <Button variant="soft" size="sm" icon={<NotebookPen size={15} />} style={{ marginTop: 14 }} onClick={saveNote}>{t('tools.saveNote')}</Button>
        </div>
      )}
    </Page>
  );
}
