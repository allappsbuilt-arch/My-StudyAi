/** Text to Voice - read text aloud with voice, speed and accent settings (browser speech, no server). */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Square, Copy, Trash2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { speak, stopSpeaking, canSpeak } from '../hooks/useSpeech';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader, Segmented } from '../components/Ui';
import { Alert } from '../components/Feedback';
import { TRANSLATE_LANGUAGES, langByName } from '../utils/languages';

const MAX = 5000;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const ACCENTS = { English: [['US', 'en-US'], ['UK', 'en-GB'], ['AU', 'en-AU'], ['IN', 'en-IN']], Spanish: [['ES', 'es-ES'], ['MX', 'es-MX'], ['US', 'es-US']], Portuguese: [['BR', 'pt-BR'], ['PT', 'pt-PT']], French: [['FR', 'fr-FR'], ['CA', 'fr-CA']] };

export default function TextToVoiceScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { state } = useLocation();
  const [text, setText] = useState(state?.text || '');
  const [language, setLanguage] = useState(state?.lang && state.lang !== 'auto' ? state.lang : 'English');
  const [gender, setGender] = useState('female');
  const [rate, setRate] = useState(1);
  const accents = ACCENTS[language] || [[language.slice(0, 2).toUpperCase(), langByName(language).code]];
  const [accent, setAccent] = useState(accents[0][1]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setAccent((ACCENTS[language] || [[null, langByName(language).code]])[0][1]);
  }, [language]);
  useEffect(() => () => stopSpeaking(), []);

  const play = () => {
    if (playing) {
      stopSpeaking();
      return setPlaying(false);
    }
    if (!text.trim()) return;
    setPlaying(true);
    speak(text, { lang: accent, rate, gender, onEnd: () => setPlaying(false) });
  };

  return (
    <Page>
      <SimpleHeader title={t('tools.textToVoice')} />
      {!canSpeak && <Alert type="info">Your browser does not support speech. Try Chrome, Edge or Safari.</Alert>}

      <div className="card text-panel">
        <div className="label">
          <span>{t('tools.enterText')}</span>
          <span className="mini-actions">
            <button onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success(t('common.copied')); } catch { /* ignore */ } }} aria-label={t('common.copy')}><Copy size={16} /></button>
            <button onClick={() => setText('')} aria-label="Clear"><Trash2 size={16} /></button>
          </span>
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX))} placeholder={t('tools.typeOrPaste')} aria-label={t('tools.enterText')} />
        <div className="counter">{text.length}/{MAX}</div>
      </div>

      <div className="section-title"><h2>{t('tools.voiceSettings')}</h2></div>
      <div className="card stack">
        <div className="field">
          <label htmlFor="tts-lang">Language</label>
          <select id="tts-lang" className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {TRANSLATE_LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{t('tools.voice')}</label>
          <Segmented label={t('tools.voice')} value={gender} onChange={setGender} options={[{ value: 'female', label: t('tools.female') }, { value: 'male', label: t('tools.male') }]} />
        </div>
        <div className="field">
          <label>{t('tools.speed')}</label>
          <Segmented label={t('tools.speed')} value={rate} onChange={setRate} options={SPEEDS.map((s) => ({ value: s, label: `${s}x` }))} />
        </div>
        {accents.length > 1 && (
          <div className="field">
            <label>{t('tools.accent')}</label>
            <Segmented label={t('tools.accent')} value={accent} onChange={setAccent} options={accents.map(([l, code]) => ({ value: code, label: l }))} />
          </div>
        )}
      </div>

      <div className="center" style={{ marginTop: 22 }}>
        <button className="play-btn" onClick={play} disabled={!canSpeak || !text.trim()} aria-label={playing ? 'Stop' : t('tools.tapPlay')}>
          {playing ? <Square size={28} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
        </button>
        <div className="small text-2" style={{ marginTop: 8 }}>{playing ? 'Playing…' : t('tools.tapPlay')}</div>
      </div>
    </Page>
  );
}
