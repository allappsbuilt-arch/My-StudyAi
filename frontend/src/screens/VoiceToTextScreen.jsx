/** Voice to Text - speak in one language, see the transcript and its AI translation. */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Square, Copy, Volume2, Bookmark, RotateCcw, ArrowRight } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { toolsApi, notesApi, getErrorMessage } from '../services/api';
import { useSpeechRecognition, speak, canSpeak } from '../hooks/useSpeech';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { Alert, Spinner } from '../components/Feedback';
import { TRANSLATE_LANGUAGES, langByName } from '../utils/languages';

export default function VoiceToTextScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { state } = useLocation();
  const [from, setFrom] = useState(state?.from || 'English');
  const [to, setTo] = useState(state?.to || 'Spanish');
  const mic = useSpeechRecognition({ lang: langByName(from).code, continuous: true });
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stopAndTranslate = async () => {
    mic.stop();
    const text = mic.transcript.trim();
    if (!text) return;
    setLoading(true);
    setError('');
    try {
      const res = await toolsApi.translate({ text, from, to });
      setTranslation(res.translation);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    mic.reset();
    setTranslation('');
    setError('');
  };

  const copy = async (v) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(t('common.copied'));
    } catch { /* ignore */ }
  };

  const save = async () => {
    try {
      await notesApi.create({ title: `Voice translation (${from} → ${to})`, subject: 'Languages', content: `**Original (${from})**\n\n${mic.transcript}\n\n**Translated (${to})**\n\n${translation}` });
      toast.success('Saved to Notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const hasResult = mic.transcript && !mic.listening;

  return (
    <Page>
      <SimpleHeader title={t('tools.voiceToText')} />
      <div className="row" style={{ justifyContent: 'center', gap: 10 }}>
        <select className="lang-select" style={{ flex: '0 1 160px' }} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Spoken language" disabled={mic.listening}>
          {TRANSLATE_LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
        </select>
        <ArrowRight size={18} className="muted" />
        <select className="lang-select" style={{ flex: '0 1 160px' }} value={to} onChange={(e) => setTo(e.target.value)} aria-label="Translate to">
          {TRANSLATE_LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
        </select>
      </div>

      {!mic.supported && <div style={{ marginTop: 16 }}><Alert type="info">Voice input needs Chrome, Edge or Safari.</Alert></div>}
      {mic.error && <div style={{ marginTop: 16 }}><Alert>{mic.error}</Alert></div>}

      {hasResult ? (
        <div className="stack page-enter" style={{ marginTop: 18 }}>
          <div className="card text-panel">
            <div className="label"><span>Original ({from})</span><span className="mini-actions"><button onClick={() => copy(mic.transcript)} aria-label={t('common.copy')}><Copy size={16} /></button></span></div>
            <p style={{ marginTop: 8 }}>{mic.transcript}</p>
          </div>
          <div className="card text-panel">
            <div className="label">
              <span>Translated ({to})</span>
              {translation && (
                <span className="mini-actions">
                  {canSpeak && <button onClick={() => speak(translation, { lang: langByName(to).code })} aria-label="Listen"><Volume2 size={16} /></button>}
                  <button onClick={() => copy(translation)} aria-label={t('common.copy')}><Copy size={16} /></button>
                </span>
              )}
            </div>
            {loading ? <div style={{ padding: 12 }}><Spinner /></div> : <p style={{ marginTop: 8 }}>{translation}</p>}
          </div>
          {error && <Alert>{error}</Alert>}
          <div className="row" style={{ gap: 10 }}>
            <Button className="grow" variant="secondary" icon={<Bookmark size={16} />} onClick={save} disabled={!translation}>{t('common.save')}</Button>
            <Button className="grow" variant="secondary" icon={<RotateCcw size={16} />} onClick={reset}>{t('tools.newRecording')}</Button>
          </div>
        </div>
      ) : (
        <div className="voice-stage">
          <div className="state">{mic.listening ? t('tools.listening') : t('tools.ready')}</div>
          {mic.listening && <p className="text-2" style={{ maxWidth: 420 }}>{mic.transcript} <span className="muted">{mic.interim}</span></p>}
          <button className={`mic-btn ${mic.listening ? 'live' : ''}`} onClick={mic.listening ? stopAndTranslate : mic.start} disabled={!mic.supported} aria-label={mic.listening ? 'Stop' : t('tools.tapSpeak')}>
            {mic.listening ? <Square size={30} fill="currentColor" /> : <Mic size={36} />}
          </button>
          <div className="small text-2">{mic.listening ? 'Tap to stop and translate' : t('tools.tapSpeak')}</div>
        </div>
      )}
    </Page>
  );
}
