/**
 * Record Lecture (the centre mic button).
 * Shows a live transcript (speech recognition), optionally records the audio, and on stop
 * turns the transcript into structured study notes with AI, saved as a note.
 *
 * Note: on a phone the microphone is used by speech recognition, so audio is only recorded
 * on the web preview or when speech recognition is unavailable.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AudioModule, RecordingPresets, createAudioPlayer, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { CloudDownload, Download, FileUp, Link2, Mic, NotebookPen, Pause, Play, Square } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { getErrorMessage, notesApi, toolsApi } from '../services/api';
import Screen, { SectionHeader } from '../components/Screen';
import { Alert, AlertDialog, Button, Card, IconTile, Row, Sheet, TextArea, TextInput, Txt } from '../components/Ui';
import { formatClock } from '../utils/format';

const SPEECH_LANG = { en: 'en-US', hi: 'hi-IN', es: 'es-ES' };

export function RecordScreen() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const speech = useSpeechRecognition({ lang: SPEECH_LANG[lang] || 'en-US' });
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recordAudio = Platform.OS === 'web' || !speech.supported;

  const [state, setState] = useState('idle'); // idle | recording | paused | stopped
  const [seconds, setSeconds] = useState(0);
  const [audioUri, setAudioUri] = useState('');
  const [title, setTitle] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [micError, setMicError] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState({ url: '', notes: '' });
  const playerRef = useRef(null);

  useEffect(() => {
    if (state !== 'recording') return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => () => { playerRef.current?.remove?.(); }, []);

  const start = async () => {
    setMicError('');
    try {
      if (recordAudio) {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) throw new Error('denied');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
      speech.reset();
      if (speech.supported) speech.start();
      setSeconds(0);
      setAudioUri('');
      setTitle(`Lecture - ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
      setState('recording');
    } catch {
      setMicError('Could not access the microphone. Allow microphone access in your phone settings and try again.');
    }
  };

  const pause = () => { if (recordAudio) recorder.pause(); speech.stop(); setState('paused'); };
  const resume = () => { if (recordAudio) recorder.record(); if (speech.supported) speech.start(); setState('recording'); };
  const stop = async () => {
    speech.stop();
    if (recordAudio) {
      try { await recorder.stop(); setAudioUri(recorder.uri || ''); } catch { /* nothing recorded */ }
    }
    setState('stopped');
    setSavedOpen(true);
  };

  const transcript = speech.transcript.trim();

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
      navigation.navigate('Notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
    return undefined;
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
    return undefined;
  };

  const playAudio = () => {
    playerRef.current?.remove?.();
    playerRef.current = createAudioPlayer({ uri: audioUri });
    playerRef.current.play();
  };

  const shareAudio = async () => {
    if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(audioUri);
    else toast.info('Audio is kept in this session only.');
  };

  const reset = () => { setState('idle'); setSeconds(0); speech.reset(); setAudioUri(''); };

  const tiles = [
    { icon: FileUp, t: t('record.uploadRec'), d: t('record.fromFiles'), go: () => navigation.navigate('Upload') },
    { icon: Link2, t: t('record.pasteLink'), d: t('record.linkSub'), go: () => setLinkOpen(true) },
    { icon: CloudDownload, t: t('record.import'), d: t('record.fromCloud'), go: () => navigation.navigate('Notes') },
  ];

  return (
    <Screen title={t('record.title')}>
      {state === 'idle' ? (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <IconTile icon={Mic} size={110} />
          <Txt size="h1" bold center>{t('record.title')}</Txt>
          <Txt color="text2" center style={{ maxWidth: 320 }}>{t('record.sub')}</Txt>
          {micError ? <Alert>{micError}</Alert> : null}

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <SectionHeader title={t('record.other')} />
            <Row gap={10} style={{ alignItems: 'stretch' }}>
              {tiles.map((o) => (
                <Pressable key={o.t} onPress={o.go} style={{ flex: 1, gap: 6, padding: 12, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                  <IconTile icon={o.icon} size={34} />
                  <Txt size="sm" bold>{o.t}</Txt>
                  <Txt size="xs" color="text2">{o.d}</Txt>
                </Pressable>
              ))}
            </Row>
          </View>

          <Pressable onPress={start} accessibilityLabel={t('record.tapStart')} style={{ marginTop: 18, width: 112, height: 112, borderRadius: 56, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', shadowColor: colors.danger, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            <Mic size={46} color="#fff" />
          </Pressable>
          <Txt size="sm" color="text2">{t('record.tapStart')}</Txt>
          {!speech.supported ? <Txt size="xs" color="muted" center>Live transcript needs a development / production build (not Expo Go) or Chrome / Edge / Safari. You can still record and type notes.</Txt> : null}
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Txt style={{ fontSize: 56, fontWeight: '800', marginTop: 12, fontVariant: ['tabular-nums'] }}>{formatClock(seconds)}</Txt>
          {state !== 'stopped' ? <Txt size="sm" bold color={state === 'paused' ? 'text2' : 'danger'}>{state === 'paused' ? t('record.paused') : `● ${t('record.recording')}`}</Txt> : null}

          <Card style={{ alignSelf: 'stretch', minHeight: 140 }}>
            {speech.supported ? (
              <Txt>{speech.transcript} <Txt color="muted">{speech.interim}</Txt>{!speech.transcript && !speech.interim ? <Txt color="muted">Start speaking - the transcript appears here…</Txt> : null}</Txt>
            ) : (
              <TextArea label="Lecture notes / transcript" value={speech.transcript} onChangeText={speech.setTranscript} placeholder="Type key points while you record…" />
            )}
          </Card>
          {speech.error ? <Alert>{speech.error}</Alert> : null}

          {state === 'stopped' ? (
            <View style={{ alignSelf: 'stretch', gap: 12 }}>
              {speech.supported ? <TextArea label="Edit transcript" value={speech.transcript} onChangeText={speech.setTranscript} /> : null}
              <TextInput label="Title" value={title} onChangeText={setTitle} maxLength={200} />
              <Button block loading={processing} icon={NotebookPen} onPress={saveNotes}>Generate &amp; save notes</Button>
              {audioUri ? (
                <Row gap={10}>
                  <View style={{ flex: 1 }}><Button block variant="secondary" icon={Play} onPress={playAudio}>Play audio</Button></View>
                  <View style={{ flex: 1 }}><Button block variant="secondary" icon={Download} onPress={shareAudio}>Share audio</Button></View>
                </Row>
              ) : null}
              <Button block variant="ghost" onPress={reset}>{t('tools.newRecording')}</Button>
            </View>
          ) : (
            <Row gap={28} style={{ marginTop: 6 }}>
              <Pressable onPress={state === 'recording' ? pause : resume} accessibilityLabel={state === 'recording' ? 'Pause' : 'Resume'} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                {state === 'recording' ? <Pause size={24} color={colors.primary} /> : <Play size={24} color={colors.primary} />}
              </Pressable>
              <Pressable onPress={stop} accessibilityLabel="Stop and save" style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
                <Square size={32} color="#fff" fill="#fff" />
              </Pressable>
            </Row>
          )}
        </View>
      )}

      <AlertDialog open={savedOpen} title={t('record.saved')} message={t('record.savedMsg')} onClose={() => setSavedOpen(false)} />

      <Sheet open={linkOpen} onClose={() => setLinkOpen(false)} title={t('record.pasteLink')} footer={<><Button variant="secondary" onPress={() => setLinkOpen(false)}>{t('common.cancel')}</Button><Button onPress={saveLink}>{t('common.save')}</Button></>}>
        <View style={{ gap: 14 }}>
          <TextInput label="Link (YouTube, Google Drive, …)" placeholder="https://" autoCapitalize="none" keyboardType="url" value={link.url} onChangeText={(v) => setLink({ ...link, url: v })} />
          <TextArea label="What is this lecture about? (optional)" value={link.notes} onChangeText={(v) => setLink({ ...link, notes: v })} />
        </View>
      </Sheet>
    </Screen>
  );
}
