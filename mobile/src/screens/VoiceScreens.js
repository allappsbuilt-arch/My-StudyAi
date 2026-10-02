/** Voice to Text, Text to Voice, and the two-person Voice Conversation. */
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowRight, Bookmark, Copy, Mic, Play, RotateCcw, Square, Trash2, Volume2 } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { getErrorMessage, notesApi, toolsApi } from '../services/api';
import { canSpeak, speak, stopSpeaking, useSpeechRecognition } from '../hooks/useSpeech';
import Screen from '../components/Screen';
import { Alert, Button, Card, Field, IconButton, Row, Segmented, Select, Spinner, TextArea, Txt } from '../components/Ui';
import { AiNotice } from '../components/Misc';
import { TRANSLATE_LANGUAGES, langByName } from '../utils/languages';

const langOptions = TRANSLATE_LANGUAGES.map((l) => ({ value: l.name, label: `${l.flag} ${l.name}` }));

/* ---------------------------------------------------------------- voice to text */
export function VoiceToTextScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const params = useRoute().params || {};
  const [from, setFrom] = useState(params.from || 'English');
  const [to, setTo] = useState(params.to || 'Spanish');
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
    } catch (err) { setError(getErrorMessage(err)); } finally { setLoading(false); }
  };

  const reset = () => { mic.reset(); setTranslation(''); setError(''); };
  const copy = async (v) => { await Clipboard.setStringAsync(v); toast.success(t('common.copied')); };

  const save = async () => {
    try {
      await notesApi.create({ title: `Voice translation (${from} → ${to})`, subject: 'Languages', content: `**Original (${from})**\n\n${mic.transcript}\n\n**Translated (${to})**\n\n${translation}` });
      toast.success('Saved to Notes');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const hasResult = mic.transcript && !mic.listening;

  return (
    <Screen title={t('tools.voiceToText')} back>
      <Row>
        <View style={{ flex: 1 }}><Select value={from} onChange={setFrom} options={langOptions} /></View>
        <ArrowRight size={18} color={colors.muted} />
        <View style={{ flex: 1 }}><Select value={to} onChange={setTo} options={langOptions} /></View>
      </Row>

      {!mic.supported ? <Alert type="info">Voice input needs a development or production build of the app (it is not available in Expo Go), or Chrome / Edge / Safari on the web.</Alert> : null}
      {mic.error ? <Alert>{mic.error}</Alert> : null}

      {hasResult ? (
        <View style={{ gap: 12 }}>
          <Card style={{ gap: 6 }}>
            <Row between><Txt size="sm" color="text2">Original ({from})</Txt><IconButton icon={Copy} size={34} bg="transparent" onPress={() => copy(mic.transcript)} label={t('common.copy')} /></Row>
            <Txt selectable>{mic.transcript}</Txt>
          </Card>
          <Card style={{ gap: 6 }}>
            <Row between>
              <Txt size="sm" color="text2">Translated ({to})</Txt>
              {translation ? <Row gap={0}>{canSpeak ? <IconButton icon={Volume2} size={34} bg="transparent" onPress={() => speak(translation, { lang: langByName(to).code })} label="Listen" /> : null}<IconButton icon={Copy} size={34} bg="transparent" onPress={() => copy(translation)} label={t('common.copy')} /></Row> : null}
            </Row>
            {loading ? <Spinner /> : <Txt selectable>{translation}</Txt>}
          </Card>
          {error ? <Alert>{error}</Alert> : null}
          <Row gap={10}>
            <View style={{ flex: 1 }}><Button block variant="secondary" icon={Bookmark} onPress={save} disabled={!translation}>{t('common.save')}</Button></View>
            <View style={{ flex: 1 }}><Button block variant="secondary" icon={RotateCcw} onPress={reset}>{t('tools.newRecording')}</Button></View>
          </Row>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 16, paddingVertical: 28 }}>
          <Txt size="lg" bold color={mic.listening ? 'danger' : 'text2'}>{mic.listening ? t('tools.listening') : t('tools.ready')}</Txt>
          {mic.listening ? <Txt color="text2" center>{mic.transcript} <Txt color="muted">{mic.interim}</Txt></Txt> : null}
          <Pressable onPress={mic.listening ? stopAndTranslate : mic.start} disabled={!mic.supported} accessibilityLabel={mic.listening ? 'Stop' : t('tools.tapSpeak')}
            style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: mic.listening ? colors.danger : colors.primary, alignItems: 'center', justifyContent: 'center', opacity: mic.supported ? 1 : 0.4, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
            {mic.listening ? <Square size={30} color="#fff" fill="#fff" /> : <Mic size={40} color="#fff" />}
          </Pressable>
          <Txt size="sm" color="text2">{mic.listening ? 'Tap to stop and translate' : t('tools.tapSpeak')}</Txt>
        </View>
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------- text to voice */
const MAX = 5000;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const ACCENTS = { English: [['US', 'en-US'], ['UK', 'en-GB'], ['AU', 'en-AU'], ['IN', 'en-IN']], Spanish: [['ES', 'es-ES'], ['MX', 'es-MX'], ['US', 'es-US']], Portuguese: [['BR', 'pt-BR'], ['PT', 'pt-PT']], French: [['FR', 'fr-FR'], ['CA', 'fr-CA']] };

export function TextToVoiceScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const params = useRoute().params || {};
  const [text, setText] = useState(params.text || '');
  const [language, setLanguage] = useState(params.lang && params.lang !== 'auto' ? params.lang : 'English');
  const [gender, setGender] = useState('female');
  const [rate, setRate] = useState(1);
  const accents = ACCENTS[language] || [[language.slice(0, 2).toUpperCase(), langByName(language).code]];
  const [accent, setAccent] = useState(accents[0][1]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setAccent((ACCENTS[language] || [[null, langByName(language).code]])[0][1]); }, [language]);
  useEffect(() => () => stopSpeaking(), []);

  const play = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    if (!text.trim()) return;
    setPlaying(true);
    speak(text, { lang: accent, rate, gender, onEnd: () => setPlaying(false) });
  };

  return (
    <Screen title={t('tools.textToVoice')} back>
      <Card style={{ gap: 6 }}>
        <Row between>
          <Txt size="sm" color="text2">{t('tools.enterText')}</Txt>
          <Row gap={0}>
            <IconButton icon={Copy} size={34} bg="transparent" onPress={async () => { await Clipboard.setStringAsync(text); toast.success(t('common.copied')); }} label={t('common.copy')} />
            <IconButton icon={Trash2} size={34} bg="transparent" onPress={() => setText('')} label="Clear" />
          </Row>
        </Row>
        <TextArea value={text} onChangeText={(v) => setText(v.slice(0, MAX))} placeholder={t('tools.typeOrPaste')} inputStyle={{ minHeight: 130 }} />
        <Txt size="xs" color="muted" style={{ alignSelf: 'flex-end' }}>{text.length}/{MAX}</Txt>
      </Card>

      <Txt size="lg" bold>{t('tools.voiceSettings')}</Txt>
      <Card style={{ gap: 14 }}>
        <Select label="Language" value={language} onChange={setLanguage} options={langOptions} />
        <Field label={t('tools.voice')}><Segmented value={gender} onChange={setGender} options={[{ value: 'female', label: t('tools.female') }, { value: 'male', label: t('tools.male') }]} /></Field>
        <Field label={t('tools.speed')}><Segmented value={rate} onChange={setRate} options={SPEEDS.map((s) => ({ value: s, label: `${s}x` }))} /></Field>
        {accents.length > 1 ? <Field label={t('tools.accent')}><Segmented value={accent} onChange={setAccent} options={accents.map(([l, code]) => ({ value: code, label: l }))} /></Field> : null}
      </Card>

      <View style={{ alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Pressable onPress={play} disabled={!text.trim()} accessibilityLabel={playing ? 'Stop' : t('tools.tapPlay')} style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: text.trim() ? 1 : 0.4 }}>
          {playing ? <Square size={28} color="#fff" fill="#fff" /> : <Play size={32} color="#fff" fill="#fff" />}
        </Pressable>
        <Txt size="sm" color="text2">{playing ? 'Playing…' : t('tools.tapPlay')}</Txt>
      </View>
    </Screen>
  );
}

/* ---------------------------------------------------------------- conversation */
export function VoiceConversationScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [langs, setLangs] = useState({ a: 'English', b: 'Spanish' });
  const [speaker, setSpeaker] = useState(null);
  const [turns, setTurns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const micA = useSpeechRecognition({ lang: langByName(langs.a).code, continuous: true });
  const micB = useSpeechRecognition({ lang: langByName(langs.b).code, continuous: true });
  const mics = { a: micA, b: micB };

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80); }, [turns, busy]);

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
    } catch (err) { setError(getErrorMessage(err)); } finally { setBusy(false); }
  };

  const supported = micA.supported;

  const renderSide = (side) => {
    const live = speaker === side;
    const color = side === 'b' ? colors.success : colors.primary;
    return (
      <Card key={side} style={{ flex: 1, alignItems: 'center', gap: 10, padding: 14 }}>
        <View style={{ alignSelf: 'stretch' }}><Select value={langs[side]} onChange={(v) => !speaker && setLangs({ ...langs, [side]: v })} options={langOptions} /></View>
        <Pressable onPress={live ? finish : () => start(side)} disabled={!supported || busy || (speaker && !live)} accessibilityLabel={live ? 'Stop and translate' : `Speak ${langs[side]}`}
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: live ? colors.danger : color, alignItems: 'center', justifyContent: 'center', opacity: !supported || busy || (speaker && !live) ? 0.4 : 1 }}>
          {live ? <Square size={26} color="#fff" fill="#fff" /> : <Mic size={30} color="#fff" />}
        </Pressable>
        <Txt size="xs" color="text2" center>{live ? t('tools.listening') : `${t('conv.tapToSpeak')} ${langs[side]}`}</Txt>
      </Card>
    );
  };

  return (
    <Screen title={t('tools.voiceConversation')} back scroll={false} actions={turns.length > 0 ? <IconButton icon={Trash2} onPress={() => setTurns([])} label="Clear conversation" /> : null}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <AiNotice />
        {!supported ? <Alert type="info">Voice input needs a development or production build of the app (not Expo Go), or Chrome / Edge / Safari on the web.</Alert> : null}
        {turns.length === 0 && !busy && !speaker ? <Txt size="sm" color="text2" center style={{ padding: 30 }}>{t('conv.empty')}</Txt> : null}
        {turns.map((turn) => (
          <View key={turn.id} style={{ alignItems: turn.side === 'a' ? 'flex-end' : 'flex-start' }}>
            <View style={{ maxWidth: '86%', padding: 12, borderRadius: 18, backgroundColor: turn.side === 'a' ? colors.primarySoft : colors.successSoft, gap: 4 }}>
              <Txt size="sm" color="text2">{turn.text}</Txt>
              <Txt bold>{turn.translation}</Txt>
              {canSpeak ? <Pressable onPress={() => speak(turn.translation, { lang: langByName(turn.to).code })}><Row gap={4}><Volume2 size={13} color={colors.text2} /><Txt size="xs" color="text2">{turn.to}</Txt></Row></Pressable> : null}
            </View>
          </View>
        ))}
        {speaker ? <Txt size="sm" color="text2" center>{mics[speaker].transcript} <Txt color="muted" size="sm">{mics[speaker].interim}</Txt></Txt> : null}
        {busy ? <Spinner /> : null}
        {error ? <Alert>{error}</Alert> : null}
      </ScrollView>
      <Row style={{ padding: 16, alignItems: 'stretch' }} gap={12}>{renderSide('a')}{renderSide('b')}</Row>
    </Screen>
  );
}
