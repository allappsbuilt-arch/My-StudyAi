/**
 * Record Lecture (the centre mic button).
 * Records audio in the browser, shows a live transcript (Web Speech API), and on stop
 * turns the transcript into structured study notes with AI, saved to Supabase as a note.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Pause, Play, Square, FileUp, Link2, CloudDownload, Download, NotebookPen } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { notesApi, toolsApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader, AlertDialog } from '../components/Ui';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { TextInput, TextArea } from '../components/FormFields';
import { Alert } from '../components/Feedback';
import { formatClock } from '../utils/format';

const SPEECH_LANG = { en: 'en-US', hi: 'hi-IN', es: 'es-ES' };

export default function RecordScreen() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const speech = useSpeechRecognition({ lang: SPEECH_LANG[lang] || 'en-US' });

  const [state, setState] = useState('idle'); // idle | recording | paused | stopped
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [title, setTitle] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [micError, setMicError] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState({ url: '', notes: '' });
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (state !== 'recording') return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const start = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.start(1000);
      recorderRef.current = rec;
      speech.reset();
      if (speech.supported) speech.start();
      setSeconds(0);
      setTitle(`Lecture - ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
      setState('recording');
    } catch {
      setMicError('Could not access the microphone. Allow microphone access in your browser and try again.');
    }
  };

  const pause = () => {
    recorderRef.current?.pause();
    speech.stop();
    setState('paused');
  };
  const resume = () => {
    recorderRef.current?.resume();
    if (speech.supported) speech.start();
    setState('recording');
  };
  const stop = () => {
    recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop();
    speech.stop();
    setState('stopped');
    setSavedOpen(true);
  };

  const transcript = speech.transcript.trim();

  /** Turn the transcript into notes (AI) and save them; falls back to the raw transcript. */
  const saveNotes = async () => {
    if (transcript.length < 10) return toast.error('The transcript is too short. Type or record more of the lecture first.');
    setProcessing(true);
    const noteTitle = title.trim() || 'Lecture notes';
    try {
      let content;
      try {
        const res = await toolsApi.lectureNotes({ transcript, title: noteTitle });
        content = res.notes;
      } catch (err) {
        toast.info(`${getErrorMessage(err)} Saving the raw transcript instead.`);
        content = `## Transcript\n\n${transcript}`;
      }
      await notesApi.create({ title: noteTitle, subject: 'Lecture', content });
      toast.success('Lecture notes saved to Notes');
      navigate('/notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const saveLink = async () => {
    if (!/^https?:\/\/\S+$/i.test(link.url.trim())) return toast.error('Paste a valid link starting with http:// or https://');
    try {
      await notesApi.create({ title: 'Lecture link', subject: 'Lecture', content: `[Open lecture](${link.url.trim()})\n\n${link.notes.trim()}` });
      toast.success('Link saved to Notes');
      setLinkOpen(false);
      setLink({ url: '', notes: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const reset = () => {
    setState('idle');
    setSeconds(0);
    speech.reset();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
  };

  return (
    <Page>
      <SimpleHeader title={t('record.title')} />

      {state === 'idle' ? (
        <div className="record-page page-enter">
          <div className="record-icon"><Mic size={56} /></div>
          <h2 className="big-title">{t('record.title')}</h2>
          <p className="text-2" style={{ maxWidth: 360 }}>{t('record.sub')}</p>
          {micError && <Alert>{micError}</Alert>}

          <div className="caps-title" style={{ alignSelf: 'flex-start' }}>{t('record.other')}</div>
          <div className="option-tiles">
            <button className="option-tile" onClick={() => navigate('/materials/upload')}>
              <span className="icon-tile sm"><FileUp size={18} /></span>
              <span className="t">{t('record.uploadRec')}</span>
              <span className="d">{t('record.fromFiles')}</span>
            </button>
            <button className="option-tile" onClick={() => setLinkOpen(true)}>
              <span className="icon-tile sm"><Link2 size={18} /></span>
              <span className="t">{t('record.pasteLink')}</span>
              <span className="d">{t('record.linkSub')}</span>
            </button>
            <button className="option-tile" onClick={() => navigate('/notes')}>
              <span className="icon-tile sm"><CloudDownload size={18} /></span>
              <span className="t">{t('record.import')}</span>
              <span className="d">{t('record.fromCloud')}</span>
            </button>
          </div>

          <button className="record-btn" onClick={start} aria-label={t('record.tapStart')} style={{ marginTop: 22 }}>
            <Mic size={46} />
          </button>
          <div className="text-2 small">{t('record.tapStart')}</div>
          {!speech.supported && <p className="tiny muted">Live transcript needs Chrome, Edge or Safari. You can still record and type notes.</p>}
        </div>
      ) : (
        <div className="record-page page-enter">
          <div className="record-timer" style={{ marginTop: 24 }}>{formatClock(seconds)}</div>
          <div className={`wave ${state === 'recording' ? '' : 'paused'}`} aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
          </div>
          {state !== 'stopped' && <div className="rec-dot" style={state === 'paused' ? { color: 'var(--text-2)' } : undefined}>{state === 'paused' ? t('record.paused') : t('record.recording')}</div>}

          <div className="card transcript-box" aria-live="polite">
            {speech.supported ? (
              <>
                <span>{speech.transcript}</span> <span className="muted">{speech.interim}</span>
                {!speech.transcript && !speech.interim && <span className="muted">Start speaking - the transcript appears here…</span>}
              </>
            ) : (
              <TextArea label="Lecture notes / transcript" value={speech.transcript} onChange={(e) => speech.setTranscript(e.target.value)} placeholder="Type key points while you record…" />
            )}
          </div>
          {speech.error && <Alert>{speech.error}</Alert>}

          {state === 'stopped' ? (
            <div className="stack" style={{ width: '100%', maxWidth: 420 }}>
              {speech.supported && (
                <TextArea label="Edit transcript" value={speech.transcript} onChange={(e) => speech.setTranscript(e.target.value)} />
              )}
              <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              <Button block size="lg" loading={processing} icon={<NotebookPen size={18} />} onClick={saveNotes}>
                Generate &amp; save notes
              </Button>
              {audioUrl && (
                <>
                  <audio src={audioUrl} controls style={{ width: '100%' }} />
                  <a className="btn secondary block" href={audioUrl} download={`${title || 'lecture'}.webm`}>
                    <Download size={18} /> Download audio
                  </a>
                </>
              )}
              <Button block variant="ghost" onClick={reset}>{t('tools.newRecording')}</Button>
            </div>
          ) : (
            <div className="row" style={{ gap: 26, marginTop: 10 }}>
              <button className="icon-btn soft" style={{ width: 56, height: 56 }} onClick={state === 'recording' ? pause : resume} aria-label={state === 'recording' ? 'Pause' : 'Resume'}>
                {state === 'recording' ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button className="record-btn stop" onClick={stop} aria-label="Stop and save">
                <Square size={32} fill="currentColor" />
              </button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={savedOpen} title={t('record.saved')} message={t('record.savedMsg')} onClose={() => setSavedOpen(false)} />

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={t('record.pasteLink')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveLink}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="stack">
          <TextInput label="Link (YouTube, Google Drive, …)" placeholder="https://" value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} />
          <TextArea label="What is this lecture about? (optional)" value={link.notes} onChange={(e) => setLink({ ...link, notes: e.target.value })} />
        </div>
      </Modal>
    </Page>
  );
}
