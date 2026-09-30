/**
 * Voice Conversation - two people, two languages. Each person taps their mic and speaks;
 * the app translates it (AI) and reads the translation aloud for the other person.
 */
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Volume2, Trash2 } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { toolsApi, getErrorMessage } from '../services/api';
import { useSpeechRecognition, speak, canSpeak } from '../hooks/useSpeech';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import { Alert, Spinner } from '../components/Feedback';
import AiNotice from '../components/AiNotice';
import { TRANSLATE_LANGUAGES, langByName } from '../utils/languages';

export default function VoiceConversationScreen() {
  const { t } = useI18n();
  const [langs, setLangs] = useState({ a: 'English', b: 'Spanish' });
  const [speaker, setSpeaker] = useState(null); // 'a' | 'b' while listening
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const micA = useSpeechRecognition({ lang: langByName(langs.a).code, continuous: true });
  const micB = useSpeechRecognition({ lang: langByName(langs.b).code, continuous: true });
  const mics = { a: micA, b: micB };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, busy]);

  const start = (side) => {
    setError('');
    mics[side === 'a' ? 'b' : 'a'].stop();
    mics[side].reset();
    mics[side].start();
    setSpeaker(side);
  };

  const finish = async () => {
    const side = speaker;
    const mic = mics[side];
    mic.stop();
    setSpeaker(null);
    const text = `${mic.transcript} ${mic.interim}`.trim();
    if (!text) return;
    const from = langs[side];
    const to = langs[side === 'a' ? 'b' : 'a'];
    setBusy(true);
    try {
      const res = await toolsApi.translate({ text, from, to });
      setTurns((list) => [...list, { id: Date.now(), side, text, translation: res.translation, to }]);
      speak(res.translation, { lang: langByName(to).code });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const supported = micA.supported;

  const renderSide = (side) => {
    const live = speaker === side;
    return (
      <div key={side} className="card stack center" style={{ padding: 16, flex: 1 }}>
        <select className="lang-select" value={langs[side]} onChange={(e) => setLangs({ ...langs, [side]: e.target.value })} disabled={Boolean(speaker)} aria-label={`Person ${side.toUpperCase()} language`}>
          {TRANSLATE_LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}
        </select>
        <button
          className={`mic-btn ${live ? 'live' : ''}`}
          style={{ margin: '4px auto', width: 72, height: 72, background: side === 'b' ? 'var(--success)' : undefined }}
          onClick={live ? finish : () => start(side)}
          disabled={!supported || busy || (speaker && !live)}
          aria-label={live ? 'Stop and translate' : `Speak ${langs[side]}`}
        >
          {live ? <Square size={26} fill="currentColor" /> : <Mic size={30} />}
        </button>
        <span className="tiny text-2">{live ? t('tools.listening') : `${t('conv.tapToSpeak')} ${langs[side]}`}</span>
      </div>
    );
  };

  return (
    <Page>
      <SimpleHeader title={t('tools.voiceConversation')} actions={turns.length > 0 && <button className="icon-btn plain" onClick={() => setTurns([])} aria-label="Clear conversation"><Trash2 size={18} /></button>} />
      <AiNotice style={{ marginBottom: 12 }} />
      {!supported && <Alert type="info">Voice input needs Chrome, Edge or Safari.</Alert>}

      <div className="stack" style={{ minHeight: 220, marginBottom: 14 }}>
        {turns.length === 0 && !busy && !speaker && <p className="small text-2 center" style={{ padding: '40px 10px' }}>{t('conv.empty')}</p>}
        {turns.map((turn) => (
          <div key={turn.id} className={`msg ${turn.side === 'a' ? 'user' : 'ai'}`}>
            <div className="bubble" style={turn.side === 'b' ? { background: 'var(--success-soft)', borderColor: 'transparent' } : undefined}>
              <div className="small" style={{ opacity: 0.8 }}>{turn.text}</div>
              <div className="bold" style={{ marginTop: 4 }}>{turn.translation}</div>
              {canSpeak && (
                <button className="plain-btn tiny" style={{ marginTop: 6, opacity: 0.85 }} onClick={() => speak(turn.translation, { lang: langByName(turn.to).code })}>
                  <Volume2 size={13} style={{ verticalAlign: -2 }} /> {turn.to}
                </button>
              )}
            </div>
          </div>
        ))}
        {speaker && <div className="small text-2 center">{mics[speaker].transcript} <span className="muted">{mics[speaker].interim}</span></div>}
        {busy && <div className="center"><Spinner /></div>}
        <div ref={endRef} />
      </div>
      {error && <div style={{ marginBottom: 12 }}><Alert>{error}</Alert></div>}

      <div className="row" style={{ gap: 12, alignItems: 'stretch' }}>
        {renderSide('a')}
        {renderSide('b')}
      </div>
    </Page>
  );
}
