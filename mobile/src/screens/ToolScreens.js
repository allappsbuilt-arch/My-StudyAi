/** AI study tools: Scan & Solve, Translate, Summarize, Essay Help. */
import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeftRight, AudioLines, Bookmark, Camera, CheckCircle2, Copy, FileText, GitBranch, ImageUp, Lightbulb, ListTree, MessagesSquare, Mic, MicOff, NotebookPen, PenSquare, ScanLine, Search, Sparkles, Trash2, Volume2, Wand2, X } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { getErrorMessage, notesApi, toolsApi } from '../services/api';
import { canSpeak, speak, useSpeechRecognition } from '../hooks/useSpeech';
import Screen, { SectionHeader } from '../components/Screen';
import { Alert, Button, Card, Chip, IconButton, IconTile, Row, Segmented, Select, Spinner, TextArea, TextInput, Txt } from '../components/Ui';
import { AiNotice, Markdown } from '../components/Misc';
import { TRANSLATE_LANGUAGES, langByName } from '../utils/languages';
import { pickImage, takePhoto } from '../utils/files';

/* ---------------------------------------------------------------- scan & solve */
export function ScanSolveScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const [image, setImage] = useState(null);
  const [question, setQuestion] = useState('');
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const choose = async (source) => {
    try {
      const f = source === 'camera' ? await takePhoto() : await pickImage();
      if (!f) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return toast.error('Please use a JPG, PNG or WEBP photo.');
      setImage(f);
      solve(f, question);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    return undefined;
  };

  const clear = () => { setImage(null); setSolution(''); setError(''); };

  const saveNote = async () => {
    try {
      await notesApi.create({ title: `Solution: ${(question || 'Scanned question').slice(0, 80)}`, subject: 'Scan & Solve', content: solution });
      toast.success('Saved to Notes');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <Screen title={t('f.scan')} back>
      <AiNotice />
      {image ? (
        <View>
          <Image source={{ uri: image.uri }} style={{ width: '100%', height: 260, borderRadius: 20, backgroundColor: colors.surface2 }} resizeMode="contain" />
          <Pressable onPress={clear} accessibilityLabel="Remove photo" style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' }}><X size={18} color="#fff" /></Pressable>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
          <View style={{ width: 120, height: 120, borderRadius: 30, borderWidth: 3, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}><ScanLine size={44} color={colors.primary} /></View>
          <Txt size="h2" bold>{t('tools.scanTitle')}</Txt>
          <Txt size="sm" color="text2" center style={{ maxWidth: 320 }}>{t('tools.scanSub')}</Txt>
        </View>
      )}

      {!image ? (
        <View style={{ gap: 12 }}>
          <Button block icon={Camera} onPress={() => choose('camera')}>{t('tools.takePhoto')}</Button>
          <Button block variant="secondary" icon={ImageUp} onPress={() => choose('library')}>{t('tools.uploadImage')}</Button>
          <Txt size="xs" bold color="muted" center>{t('tools.supports').toUpperCase()}</Txt>
          <Row wrap gap={8} style={{ justifyContent: 'center' }}>{['Math', 'Physics', 'Chemistry', 'Biology', 'Text'].map((s) => <Chip key={s} label={s} />)}</Row>
          <Txt size="sm" color="muted" center>{t('tools.typeQuestion')}</Txt>
          <TextArea value={question} onChangeText={setQuestion} placeholder="e.g. Solve 2x² + 5x - 3 = 0" maxLength={5000} />
          <Button block icon={Sparkles} disabled={!question.trim() || loading} onPress={() => solve(null, question)}>{t('tools.solve')}</Button>
        </View>
      ) : null}

      {loading ? <View style={{ alignItems: 'center', gap: 10, padding: 24 }}><Spinner size="large" /><Txt color="text2">{t('tools.analyzing')}</Txt></View> : null}
      {error ? <Alert>{error}</Alert> : null}
      {error && image ? <Button block variant="secondary" onPress={() => solve(image, question)}>{t('common.retry')}</Button> : null}

      {solution ? (
        <Card style={{ gap: 12 }}>
          <Txt size="lg" bold>{t('tools.solution')}</Txt>
          <Markdown>{solution}</Markdown>
          <Button variant="soft" size="sm" icon={NotebookPen} onPress={saveNote}>{t('tools.saveNote')}</Button>
        </Card>
      ) : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- translate */
const MAX = 5000;
const langOption = (l) => ({ value: l.name, label: `${l.flag} ${l.name}` });

export function TranslateScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [from, setFrom] = useState('auto');
  const [to, setTo] = useState('Spanish');
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState('');
  const mic = useSpeechRecognition({ lang: from === 'auto' ? 'en-US' : langByName(from).code, continuous: false });

  useEffect(() => {
    if (mic.transcript) { setText((prev) => `${prev}${prev ? ' ' : ''}${mic.transcript}`.slice(0, MAX)); mic.reset(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.transcript]);

  const translate = async (explain = false) => {
    if (!text.trim()) return;
    if (explain) setExplaining(true); else setLoading(true);
    setError('');
    try {
      const res = await toolsApi.translate({ text, from, to, explain });
      if (explain) setExplanation(res.explanation);
      else { setResult(res); setExplanation(''); }
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
    } else { setFrom(to); setTo(from); }
    if (result) { setText(result.translation); setResult(null); }
  };

  const copy = async () => { await Clipboard.setStringAsync(result.translation); toast.success(t('common.copied')); };

  const save = async () => {
    try {
      await notesApi.create({ title: `Translation: ${text.slice(0, 60)}`, subject: 'Languages', content: `**${result.detectedLanguage || from} → ${to}**\n\n> ${text}\n\n${result.translation}${explanation ? `\n\n---\n${explanation}` : ''}` });
      toast.success('Saved to Notes');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const modes = [
    { icon: Mic, t: t('tools.voiceToText'), d: t('tools.voiceToTextSub'), go: () => navigation.navigate('VoiceToText', { from: from === 'auto' ? 'English' : from, to }) },
    { icon: AudioLines, t: t('tools.textToVoice'), d: t('tools.textToVoiceSub'), go: () => navigation.navigate('TextToVoice', { text: result?.translation || text, lang: result ? to : from === 'auto' ? 'English' : from }) },
    { icon: MessagesSquare, t: t('tools.voiceConversation'), d: t('tools.voiceConversationSub'), go: () => navigation.navigate('VoiceConversation') },
  ];

  return (
    <Screen title={t('f.translate')} back actions={mic.supported ? <IconButton icon={mic.listening ? MicOff : Mic} onPress={mic.listening ? mic.stop : mic.start} active={mic.listening} label={t('tools.voiceToText')} /> : null}>
      <AiNotice />
      <Row center>
        <View style={{ flex: 1 }}><Select value={from} onChange={setFrom} options={[{ value: 'auto', label: `🌐 ${t('tools.autoDetect')}` }, ...TRANSLATE_LANGUAGES.map(langOption)]} /></View>
        <IconButton icon={ArrowLeftRight} onPress={swap} label="Swap languages" />
        <View style={{ flex: 1 }}><Select value={to} onChange={setTo} options={TRANSLATE_LANGUAGES.map(langOption)} /></View>
      </Row>
      {from === 'auto' ? <Row gap={4}><Sparkles size={12} color={colors.primary} /><Txt size="xs" color="primary">{t('tools.autoDetectLang')}</Txt></Row> : null}

      <Card style={{ gap: 6 }}>
        <Row between><Txt size="sm" color="text2">{t('tools.textToTranslate')}</Txt>{mic.listening ? <Txt size="xs" bold color="danger">● {t('tools.listening')}</Txt> : null}</Row>
        <TextArea value={mic.interim ? `${text}${text ? ' ' : ''}${mic.interim}` : text} onChangeText={(v) => setText(v.slice(0, MAX))} placeholder={t('tools.typeOrPaste')} inputStyle={{ minHeight: 120 }} />
        <Txt size="xs" color="muted" style={{ alignSelf: 'flex-end' }}>{text.length}/{MAX}</Txt>
      </Card>
      {mic.error ? <Alert>{mic.error}</Alert> : null}

      <Button block loading={loading} disabled={!text.trim()} onPress={() => translate(false)}>{t('tools.translateBtn')}</Button>
      {error ? <Alert>{error}</Alert> : null}

      {result ? (
        <Card style={{ gap: 8 }}>
          <Row between>
            <Txt size="sm" color="text2">{to}{result.detectedLanguage && from === 'auto' ? ` · from ${result.detectedLanguage}` : ''}</Txt>
            <Row gap={4}>
              <IconButton icon={Copy} size={34} bg="transparent" onPress={copy} label={t('common.copy')} />
              {canSpeak ? <IconButton icon={Volume2} size={34} bg="transparent" onPress={() => speak(result.translation, { lang: langByName(to).code })} label="Listen" /> : null}
              <IconButton icon={Bookmark} size={34} bg="transparent" onPress={save} label={t('tools.saveNote')} />
            </Row>
          </Row>
          <Txt selectable style={{ fontSize: 17 }}>{result.translation}</Txt>
          {explanation ? <View style={{ backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12 }}><Markdown>{explanation}</Markdown></View>
            : <Button variant="ghost" size="sm" icon={Lightbulb} loading={explaining} onPress={() => translate(true)}>{t('tools.explain')}</Button>}
        </Card>
      ) : null}

      <SectionHeader title={t('tools.otherModes')} />
      {modes.map((m) => (
        <Card key={m.t} onPress={m.go} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile icon={m.icon} size={38} />
          <View style={{ flex: 1 }}><Txt bold>{m.t}</Txt><Txt size="xs" color="text2">{m.d}</Txt></View>
        </Card>
      ))}
    </Screen>
  );
}

/* ---------------------------------------------------------------- summarize */
export function SummarizeScreen() {
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
    } catch (err) { setError(getErrorMessage(err)); } finally { setLoading(false); }
  };

  const save = async () => {
    try {
      await notesApi.create({ title: `Summary: ${text.trim().split('\n')[0].slice(0, 60)}`, subject: 'Summary', content: summary });
      toast.success('Saved to Notes');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <Screen title={t('tools.summarizeTitle')} back>
      <AiNotice />
      {notes.data?.notes?.length > 0 ? (
        <Select label="Summarize one of your notes" value="" placeholder="Choose a note…" onChange={(v) => { const n = notes.data.notes.find((x) => String(x.id) === v); if (n) setText(n.content); }} options={notes.data.notes.map((n) => ({ value: String(n.id), label: n.title }))} />
      ) : null}
      <Card style={{ gap: 6 }}>
        <Row gap={6}><FileText size={13} color="#8a97ab" /><Txt size="sm" color="text2">Text to summarize</Txt></Row>
        <TextArea value={text} onChangeText={(v) => setText(v.slice(0, 150000))} placeholder="Paste an article, chapter or your notes…" inputStyle={{ minHeight: 180 }} />
        <Txt size="xs" color="muted" style={{ alignSelf: 'flex-end' }}>{text.length.toLocaleString()} characters</Txt>
      </Card>
      <Segmented value={length} onChange={setLength} options={[{ value: 'short', label: 'Short' }, { value: 'medium', label: 'Medium' }, { value: 'long', label: 'Detailed' }]} />
      <Button block icon={Sparkles} loading={loading} disabled={text.trim().length < 20} onPress={run}>{t('tools.summarizeTitle')}</Button>
      {error ? <Alert>{error}</Alert> : null}
      {summary ? (
        <Card style={{ gap: 12 }}>
          <Markdown>{summary}</Markdown>
          <Button variant="soft" size="sm" icon={NotebookPen} onPress={save}>{t('tools.saveNote')}</Button>
        </Card>
      ) : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- essay */
const HELP = [
  { icon: PenSquare, text: 'Generate essay outlines and ideas' },
  { icon: Wand2, text: 'Improve your writing and clarity' },
  { icon: GitBranch, text: 'Structure essays effectively' },
  { icon: Search, text: 'Find supporting arguments' },
  { icon: CheckCircle2, text: 'Check grammar and flow' },
  { icon: ListTree, text: 'Plan introductions and conclusions' },
];

export function EssayScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
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
    } catch (err) { setError(getErrorMessage(err)); } finally { setLoading(false); }
  };

  const save = async () => {
    try {
      await notesApi.create({ title: `Essay ${mode}: ${text.slice(0, 60)}`, subject: 'Writing', content: result });
      toast.success('Saved to Notes');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const write = mode === 'write';

  return (
    <Screen title={t('tools.essayTitle')} back>
      <AiNotice />
      <Segmented value={mode} onChange={(m) => { setMode(m); setResult(''); }} options={[{ value: 'write', label: t('tools.write'), icon: PenSquare }, { value: 'improve', label: t('tools.improve'), icon: Wand2 }, { value: 'structure', label: t('tools.structure'), icon: GitBranch }]} />

      <Card style={{ gap: 12 }}>
        {write
          ? <TextInput label={t('tools.essayTopic')} placeholder="e.g. The impact of social media on mental health" value={text} onChangeText={setText} maxLength={300} />
          : <TextArea label="Your writing" placeholder="Paste your essay or paragraph…" value={text} onChangeText={setText} maxLength={30000} inputStyle={{ minHeight: 170 }} />}
        <Row>
          <IconButton icon={Trash2} onPress={() => { setText(''); setResult(''); }} label="Clear" />
          <View style={{ flex: 1 }}><Button block loading={loading} disabled={text.trim().length < 3} onPress={run}>{write ? t('tools.generateOutline') : mode === 'improve' ? t('tools.improve') : t('tools.structure')}</Button></View>
        </Row>
      </Card>
      {error ? <Alert>{error}</Alert> : null}

      {result ? (
        <Card style={{ gap: 12 }}>
          <Markdown>{result}</Markdown>
          <Button variant="soft" size="sm" icon={NotebookPen} onPress={save}>{t('tools.saveNote')}</Button>
        </Card>
      ) : (
        <>
          <SectionHeader title={t('tools.whatHelp')} />
          {HELP.map((h) => <Card key={h.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}><h.icon size={18} color={colors.primary} /><Txt size="sm" style={{ flex: 1 }}>{h.text}</Txt></Card>)}
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}><Lightbulb size={18} color={colors.warning} /><Txt size="sm" color="text2" style={{ flex: 1 }}>StudyAI explains its suggestions so you learn to write better - use it to improve your own work.</Txt></Card>
        </>
      )}
    </Screen>
  );
}
