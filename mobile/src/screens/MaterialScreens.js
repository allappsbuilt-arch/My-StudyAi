/** AI analysis progress and the study summary of one material. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AlertTriangle, BookMarked, Brain, Check, ChevronDown, FileSearch, FileText, HelpCircle, Layers, Lightbulb, ListChecks, NotebookPen, RefreshCw, RotateCcw, ScanText, Sparkles, Target, Upload } from 'lucide-react-native';
import { analysisApi, getErrorMessage, materialApi, notesApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import Screen from '../components/Screen';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, IconButton, IconTile, PageLoader, ProgressBar, Row, Spinner, Txt } from '../components/Ui';
import { FileTypeIcon, Markdown } from '../components/Misc';
import { formatBytes, formatDate } from '../utils/format';

const STEPS = [
  { key: 'upload', label: 'Upload processing', icon: Upload },
  { key: 'extract', label: 'Text extraction', icon: ScanText },
  { key: 'content', label: 'Content analysis', icon: FileSearch },
  { key: 'summary', label: 'Summary generation', icon: FileText },
  { key: 'keypoints', label: 'Key point generation', icon: ListChecks },
  { key: 'questions', label: 'Question generation', icon: HelpCircle },
];

function activeStepIndex(status, analyzingSeconds) {
  if (status === 'completed') return STEPS.length;
  if (status === 'extracting') return 1;
  if (status === 'analyzing') return Math.min(2 + Math.floor(analyzingSeconds / 12), STEPS.length - 1);
  return 0;
}

/* ---------------------------------------------------------------- analysis */
export function AnalysisScreen() {
  const { id, autoStart } = useRoute().params;
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [status, setStatus] = useState(null);
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [starting, setStarting] = useState(false);
  const [analyzingSince, setAnalyzingSince] = useState(null);
  const [, setTick] = useState(0);
  const startedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await analysisApi.get(id);
      setMaterial(res.material);
      setStatus(res.status);
      setLoadError('');
      if (res.status === 'failed') setError(res.error || 'Analysis failed.');
      if (res.status === 'analyzing') setAnalyzingSince((s) => s || Date.now());
      return res.status;
    } catch (err) {
      setLoadError(getErrorMessage(err));
      return 'error';
    }
  }, [id]);

  const start = useCallback(async () => {
    setStarting(true);
    setError('');
    setAnalyzingSince(null);
    try {
      await analysisApi.start(id);
      setStatus('extracting');
    } catch (err) {
      setError(getErrorMessage(err));
      setStatus('failed');
    } finally {
      setStarting(false);
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      const s = await poll();
      if (!startedRef.current && (s === 'not_started' || (s === 'failed' && autoStart))) {
        startedRef.current = true;
        if (autoStart || s === 'not_started') await start();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const running = status === 'extracting' || status === 'analyzing';
    if (!running) return undefined;
    const pollId = setInterval(poll, 2000);
    const ticker = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { clearInterval(pollId); clearInterval(ticker); };
  }, [status, poll]);

  useEffect(() => {
    if (status !== 'completed') return undefined;
    const t = setTimeout(() => navigation.replace('Summary', { id }), 900);
    return () => clearTimeout(t);
  }, [status, id, navigation]);

  if (loadError && !material) return <Screen title="AI Analysis" back><ErrorState message={loadError} onRetry={poll} /></Screen>;
  if (!material) return <Screen title="AI Analysis" back><PageLoader label="Loading material..." /></Screen>;

  const analyzingSeconds = analyzingSince ? (Date.now() - analyzingSince) / 1000 : 0;
  const active = activeStepIndex(status, analyzingSeconds);
  const pct = status === 'completed' ? 100 : Math.round(((active + 0.5) / STEPS.length) * 100);
  const failed = status === 'failed';

  return (
    <Screen eyebrow="AI Analysis" title={material.filename} back="Materials">
      <Card style={{ alignItems: 'center', gap: 12, padding: 24 }}>
        {failed ? <IconTile icon={AlertTriangle} size={64} color={colors.danger} bg={colors.dangerSoft} />
          : status === 'completed' ? <IconTile icon={Check} size={64} color={colors.success} bg={colors.successSoft} />
            : <IconTile icon={Brain} size={64} color="#fff" bg={colors.primary} />}
        <Txt size="h2" bold center>{failed ? 'Analysis failed' : status === 'completed' ? 'Your study guide is ready!' : 'AI is analysing your material...'}</Txt>
        <Txt size="sm" color="text2" center>
          {failed ? error : status === 'completed' ? 'Opening your summary…' : 'This usually takes under a minute. You can leave this page - the analysis keeps running.'}
        </Txt>
        {!failed ? (
          <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
            <Row between><Txt size="sm" color="text2">Progress</Txt><Txt size="sm" bold>{pct}%</Txt></Row>
            <ProgressBar value={pct} />
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <FileTypeIcon type={material.fileType} size={38} />
          <View style={{ flex: 1 }}>
            <Txt size="sm" bold numberOfLines={1}>{material.filename}</Txt>
            <Txt size="xs" color="muted">{formatBytes(material.fileSize)}</Txt>
          </View>
        </Row>
        {STEPS.map((s, i) => {
          const state = failed ? (i < active ? 'done' : '') : i < active ? 'done' : i === active ? 'active' : '';
          return (
            <Row key={s.key} style={{ opacity: state ? 1 : 0.5 }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: state === 'done' ? colors.success : state === 'active' ? colors.primarySoft : colors.surface2 }}>
                {state === 'done' ? <Check size={16} color="#fff" /> : state === 'active' ? <Spinner /> : <s.icon size={15} color={colors.muted} />}
              </View>
              <Txt weight={state === 'active' ? '700' : '400'}>{s.label}</Txt>
            </Row>
          );
        })}
      </Card>

      {failed ? (
        <View style={{ gap: 10 }}>
          <Button block icon={RotateCcw} loading={starting} onPress={start}>Try again</Button>
          <Button variant="secondary" block onPress={() => navigation.navigate('Materials')}>Back to materials</Button>
        </View>
      ) : null}
      {status === 'not_started' && !starting ? <Button block icon={Sparkles} onPress={start}>START AI ANALYSIS</Button> : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- summary */
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function Section({ icon, title, children, count }) {
  return (
    <Card style={{ gap: 12 }}>
      <Row>
        <IconTile icon={icon} size={36} />
        <Txt size="lg" bold style={{ flex: 1 }}>{title}</Txt>
        {count !== undefined ? <Badge tone="muted">{count}</Badge> : null}
      </Row>
      {children}
    </Card>
  );
}

function toNote(a) {
  const lines = ['## Summary', a.summary, '', '## Key points', ...a.keyPoints.map((k) => `- ${k}`)];
  if (a.definitions.length) lines.push('', '## Definitions', ...a.definitions.map((d) => `- **${d.term}**: ${d.definition}`));
  if (a.importantTopics.length) lines.push('', '## Important topics', ...a.importantTopics.map((t) => `- **${t.topic}**: ${t.description}`));
  if (a.importantQuestions.length) lines.push('', '## Exam questions', ...a.importantQuestions.map((q, i) => `${i + 1}. ${q.question}`));
  return lines.join('\n');
}

function Question({ q, i }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(!open)} style={{ gap: 8, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
      <Row center={false}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Txt size="xs" bold color="primary">Q{i + 1}</Txt></View>
        <Txt style={{ flex: 1 }}>{q.question} <Txt size="xs" color="muted">({q.type})</Txt></Txt>
        <ChevronDown size={18} color={colors.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Row>
      {open ? <Txt size="sm" color="text2">💡 {q.answerHint}</Txt> : null}
    </Pressable>
  );
}

export function SummaryScreen() {
  const { id } = useRoute().params;
  const navigation = useNavigation();
  const toast = useToast();
  const { colors } = useTheme();
  const [saving, setSaving] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [reanalysing, setReanalysing] = useState(false);

  const { data, loading, error, reload } = useApi(() => materialApi.get(id), [id]);

  if (loading && !data) return <Screen title="Study Summary" back><PageLoader label="Loading summary..." /></Screen>;
  if (error && !data) return <Screen title="Study Summary" back="Materials"><ErrorState message={error} onRetry={reload} /></Screen>;

  const { material, analysis } = data;

  if (!analysis) {
    return (
      <Screen title={material.filename} back="Materials">
        <EmptyState icon={Sparkles} title="Not analysed yet" message="Run AI analysis to get a summary, key points and exam questions for this file." action={<Button icon={Sparkles} onPress={() => navigation.navigate('Analysis', { id, autoStart: true })}>START AI ANALYSIS</Button>} />
      </Screen>
    );
  }

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await notesApi.create({ title: `${analysis.title} - Summary`.slice(0, 200), subject: material.subject || '', content: toNote(analysis) });
      setSavedNoteId(res.note.id);
      toast.success('Saved to your notes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const reanalyse = async () => {
    setReanalysing(true);
    try {
      await analysisApi.start(id);
      navigation.navigate('Analysis', { id });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReanalysing(false);
    }
  };

  const heroBadge = { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 };

  return (
    <Screen
      eyebrow="Study Summary" title={analysis.title || material.filename} back="Materials"
      actions={<IconButton icon={RefreshCw} onPress={reanalyse} label="Analyse again" />}
      footer={
        <Row gap={8}>
          <Button size="sm" icon={ListChecks} onPress={() => navigation.navigate('QuizSetup', { materialId: Number(id), topic: analysis.title, subject: material.subject })}>Create Quiz</Button>
          <Button size="sm" variant="soft" loading={saving} icon={NotebookPen} onPress={savedNoteId ? () => navigation.navigate('Notes', { openNoteId: savedNoteId }) : saveNotes}>{savedNoteId ? 'View Note' : 'Save Notes'}</Button>
          <Button size="sm" variant="soft" icon={Sparkles} onPress={() => navigation.navigate('Tutor', { materialId: Number(id) })}>Ask AI</Button>
        </Row>
      }
    >
      <Card tone="primary" style={{ gap: 14 }}>
        <Row>
          <IconTile icon={FileText} bg="rgba(255,255,255,0.18)" color="#fff" />
          <View style={{ flex: 1 }}>
            <Txt bold color="#fff" numberOfLines={1}>{material.filename}</Txt>
            <Txt size="sm" color="#dbeafe">{material.subject || 'General'} · analysed {formatDate(analysis.createdAt)}</Txt>
          </View>
        </Row>
        <Row wrap gap={8}>
          {[plural(analysis.keyPoints.length, 'key point'), plural(analysis.definitions.length, 'definition'), plural(analysis.importantQuestions.length, 'exam question')].map((l) => (
            <View key={l} style={heroBadge}><Txt size="xs" bold color="#fff">{l}</Txt></View>
          ))}
        </Row>
      </Card>

      {analysis.wasTruncated ? <Alert type="warning" icon={AlertTriangle}>This file was very long, so the AI analysed the first part of it. Split large files into chapters for complete coverage.</Alert> : null}

      <Section icon={BookMarked} title="AI Summary"><Markdown>{analysis.summary}</Markdown></Section>

      <Section icon={Lightbulb} title="Key Points" count={analysis.keyPoints.length}>
        {analysis.keyPoints.map((k, i) => (
          <Row key={i} center={false}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Txt size="xs" bold color="primary">{i + 1}</Txt></View>
            <Txt style={{ flex: 1 }}>{k}</Txt>
          </Row>
        ))}
      </Section>

      {analysis.importantQuestions.length > 0 ? (
        <Section icon={HelpCircle} title="Exam-Focused Questions" count={analysis.importantQuestions.length}>
          {analysis.importantQuestions.map((q, i) => <Question key={i} q={q} i={i} />)}
        </Section>
      ) : null}

      {analysis.definitions.length > 0 ? (
        <Section icon={Layers} title="Important Definitions" count={analysis.definitions.length}>
          {analysis.definitions.map((d, i) => (
            <View key={i} style={{ gap: 2, paddingVertical: 4 }}>
              <Txt bold color="primary">{d.term}</Txt>
              <Txt size="sm" color="text2">{d.definition}</Txt>
            </View>
          ))}
        </Section>
      ) : null}

      {analysis.importantTopics.length > 0 ? (
        <Section icon={Target} title="Important Topics">
          {analysis.importantTopics.map((t, i) => (
            <View key={i} style={{ backgroundColor: colors.surface2, borderRadius: 14, padding: 12, gap: 2 }}>
              <Txt size="sm" bold>{t.topic}</Txt>
              <Txt size="sm" color="text2">{t.description}</Txt>
            </View>
          ))}
        </Section>
      ) : null}

      <Section icon={Sparkles} title="AI Recommendations">
        {analysis.recommendations.map((r, i) => (
          <Row key={i} center={false}><Check size={16} color={colors.success} style={{ marginTop: 3 }} /><Txt style={{ flex: 1 }}>{r}</Txt></Row>
        ))}
      </Section>
    </Screen>
  );
}
