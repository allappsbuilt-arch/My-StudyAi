/** Translate - language bar, text box with voice input, AI translation with copy / listen / save / explain. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Mic, MicOff, Copy, Volume2, Bookmark, Lightbulb, Sparkles, AudioLines, MessagesSquare } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { toolsApi, notesApi, getErrorMessage } from '../services/api';
import { useSpeechRecognition, speak, canSpeak } from '../hooks/useSpeech';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader, AlertDialog } from '../components/Ui';
import Button from '../components/Button';
import Markdown from '../components/Markdown';
import { Alert } from '../components/Feedback';
import AiNotice from '../components/AiNotice';
import { TRANSLATE_LANGUAGES, langByName } from '../utils/languages';

const MAX = 5000;

export default function TranslateScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [from, setFrom] = useState('auto');
  const [to, setTo] = useState('Spanish');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const mic = useSpeechRecognition({ lang: from === 'auto' ? 'en-US' : langByName(from).code, continuous: false });

  useEffect(() => {
    if (mic.transcript) setText((prev) => `${prev}${prev ? ' ' : ''}${mic.transcript}`.slice(0, MAX));
    mic.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.transcript]);

  const translate = async (explain = false) => {
    if (!text.trim()) return;
    explain ? setExplaining(true) : setLoading(true);
    setError('');
    try {
      const res = await toolsApi.translate({ text, from, to, explain });
      if (explain) setExplanation(res.explanation);
      else {
        setResult(res);
        setExplanation('');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setExplaining(false);
    }
  };

  const swap = () => {
    if (from === 'auto') {
      setFrom(to);
      setTo(result?.detectedLanguage && TRANSLATE_LANGUAGES.some((l) => l.name === result.detectedLanguage) ? result.detectedLanguage : 'English');
    } else {
      setFrom(to);
      setTo(from);
    }
    if (result) {
      setText(result.translation);
      setResult(null);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.translation);
      setCopied(true);
    } catch {
      toast.error('Could not copy - select the text and copy it manually.');
    }
  };

  const save = async () => {
    try {
      await notesApi.create({ title: `Translation: ${text.slice(0, 60)}`, subject: 'Languages', content: `**${result.detectedLanguage || from} → ${to}**\n\n> ${text}\n\n${result.translation}${explanation ? `\n\n---\n${explanation}` : ''}` });
      toast.success('Saved to Notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Page>
      <SimpleHeader
        title={t('f.translate')}
        actions={
          mic.supported && (
            <button className="icon-btn plain" onClick={mic.listening ? mic.stop : mic.start} aria-label={t('tools.voiceToText')} style={{ color: 'var(--primary)' }}>
              {mic.listening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )
        }
      />
      <AiNotice style={{ marginBottom: 12 }} />

      <div className="lang-bar">
        <select className="lang-select" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From language">
          <option value="auto">🌐 {t('tools.autoDetect')}</option>
          {TRANSLATE_LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
        </select>
        <button className="swap-btn" onClick={swap} aria-label="Swap languages"><ArrowLeftRight size={18} /></button>
        <select className="lang-select" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To language">
          {TRANSLATE_LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
        </select>
      </div>
      {from === 'auto' && <div className="tiny row" style={{ color: 'var(--primary)', gap: 4, margin: '8px 4px 0' }}><Sparkles size={12} /> {t('tools.autoDetectLang')}</div>}

      <div className="card text-panel" style={{ marginTop: 12 }}>
        <div className="label">
          <span>{t('tools.textToTranslate')}</span>
          {mic.listening && <span className="rec-dot">{t('tools.listening')}</span>}
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} placeholder={t('tools.typeOrPaste')} aria-label={t('tools.textToTranslate')} />
        <div className="counter">{text.length}/{MAX}</div>
      </div>
      {mic.error && <Alert>{mic.error}</Alert>}

      <Button block size="lg" className="square" style={{ marginTop: 12 }} loading={loading} disabled={!text.trim()} onClick={() => translate(false)}>
        {t('tools.translateBtn')}
      </Button>
      {error && <div style={{ marginTop: 12 }}><Alert>{error}</Alert></div>}

      {result && (
        <div className="card text-panel pop-in" style={{ marginTop: 14 }}>
          <div className="label">
            <span>{to}{result.detectedLanguage && from === 'auto' ? ` · from ${result.detectedLanguage}` : ''}</span>
            <span className="mini-actions">
              <button onClick={copy} aria-label={t('common.copy')}><Copy size={16} /></button>
              {canSpeak && <button onClick={() => speak(result.translation, { lang: langByName(to).code })} aria-label="Listen"><Volume2 size={16} /></button>}
              <button onClick={save} aria-label={t('tools.saveNote')}><Bookmark size={16} /></button>
            </span>
          </div>
          <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{result.translation}</p>
          {explanation ? (
            <div className="explain"><Markdown>{explanation}</Markdown></div>
          ) : (
            <Button variant="ghost" size="sm" icon={<Lightbulb size={15} />} style={{ paddingLeft: 0, marginTop: 8 }} loading={explaining} onClick={() => translate(true)}>
              {t('tools.explain')}
            </Button>
          )}
        </div>
      )}

      <div className="section-title"><h2>{t('tools.otherModes')}</h2></div>
      <div className="mode-cards">
        <button className="mode-card" onClick={() => navigate('/translate/voice', { state: { from: from === 'auto' ? 'English' : from, to } })}>
          <span className="icon-tile sm"><Mic size={18} /></span>
          <span className="t">{t('tools.voiceToText')}</span>
          <span className="d">{t('tools.voiceToTextSub')}</span>
        </button>
        <button className="mode-card" onClick={() => navigate('/translate/speak', { state: { text: result?.translation || text, lang: result ? to : from === 'auto' ? 'English' : from } })}>
          <span className="icon-tile sm"><AudioLines size={18} /></span>
          <span className="t">{t('tools.textToVoice')}</span>
          <span className="d">{t('tools.textToVoiceSub')}</span>
        </button>
        <button className="mode-card" onClick={() => navigate('/translate/conversation')}>
          <span className="icon-tile sm"><MessagesSquare size={18} /></span>
          <span className="t">{t('tools.voiceConversation')}</span>
          <span className="d">{t('tools.voiceConversationSub')}</span>
        </button>
      </div>

      <AlertDialog open={copied} title={t('common.copied')} message="Translation copied to clipboard" onClose={() => setCopied(false)} />
    </Page>
  );
}
