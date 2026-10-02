/** Quiz: setup, taking a quiz, result with explanations, and history. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Clock, FileText, Gauge, History, Home, ListChecks, MinusCircle, Minus, Plus, PlayCircle, RotateCcw, Send, Sparkles, Trophy, X, XCircle } from 'lucide-react-native';
import { getErrorMessage, materialApi, quizApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import Screen, { SectionHeader } from '../components/Screen';
import { Alert, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorState, Field, IconButton, IconTile, PageLoader, ProgressBar, ProgressRing, Row, SkeletonList, Spinner, TextInput, Txt, ListRow } from '../components/Ui';
import { AiNotice } from '../components/Misc';
import { DIFFICULTIES, SUBJECTS } from '../utils/constants';
import { formatClock, formatDateTime } from '../utils/format';

const LETTERS = ['A', 'B', 'C', 'D'];

/* ---------------------------------------------------------------- setup */
export function QuizSetupScreen() {
  const navigation = useNavigation();
  const params = useRoute().params || {};
  const { user } = useAuth();
  const { colors } = useTheme();

  const [materialId, setMaterialId] = useState(params.materialId || null);
  const [materialName, setMaterialName] = useState('');
  const [subject, setSubject] = useState(params.subject || '');
  const [topic, setTopic] = useState(params.topic || '');
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const subjects = [...new Set([...(user?.preferences?.subjects || []), ...SUBJECTS])].slice(0, 12);

  useEffect(() => {
    if (!materialId) return;
    materialApi.get(materialId).then((r) => {
      setMaterialName(r.analysis?.title || r.material.filename);
      setSubject((s) => s || r.material.subject || '');
      setTopic((t) => t || r.analysis?.title || '');
    }).catch(() => setMaterialId(null));
  }, [materialId]);

  const generate = async () => {
    const errs = {};
    if (!subject.trim()) errs.subject = 'Choose or type a subject.';
    if (!topic.trim()) errs.topic = 'Enter a topic, e.g. "Newton\'s laws".';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setGenerating(true);
    setError('');
    try {
      const res = await quizApi.generate({ subject: subject.trim(), topic: topic.trim(), numQuestions: count, difficulty, materialId: materialId || undefined });
      setGenerating(false);
      navigation.navigate('Quiz', { id: res.quiz.id });
    } catch (err) {
      setError(getErrorMessage(err));
      setGenerating(false);
    }
  };

  return (
    <Screen eyebrow="Practice" title="Create a Quiz" back actions={<IconButton icon={History} onPress={() => navigation.navigate('QuizHistory')} label="Quiz history" />}>
      {generating ? (
        <Card style={{ alignItems: 'center', gap: 14, padding: 36 }}>
          <IconTile icon={Sparkles} size={64} color="#fff" bg={colors.primary} />
          <Txt size="h2" bold>Generating your quiz…</Txt>
          <Txt size="sm" color="text2" center>StudyAI is writing {count} {difficulty} questions about "{topic}". This takes about 15-40 seconds.</Txt>
          <Spinner size="large" />
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          <AiNotice />
          {error ? <Alert>{error}</Alert> : null}

          {materialId && materialName ? (
            <Row style={{ backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12 }}>
              <FileText size={16} color={colors.primary} />
              <Txt size="sm" color="primary" style={{ flex: 1 }} numberOfLines={1}>Questions from: {materialName}</Txt>
              <Pressable onPress={() => setMaterialId(null)} hitSlop={8}><X size={16} color={colors.primary} /></Pressable>
            </Row>
          ) : null}

          <Card style={{ gap: 14 }}>
            <Field label="Subject" error={errors.subject}>
              <Row wrap gap={8}>{subjects.map((s) => <Chip key={s} label={s} selected={subject === s} onPress={() => setSubject(s)} />)}</Row>
            </Field>
            <TextInput label="Or type a subject" value={subject} onChangeText={setSubject} placeholder="e.g. Organic Chemistry" maxLength={100} />
            <TextInput label="Topic" value={topic} onChangeText={setTopic} error={errors.topic} placeholder="e.g. Photosynthesis, Quadratic equations" maxLength={200} />
          </Card>

          <Card style={{ gap: 14 }}>
            <Row between>
              <View>
                <Txt size="lg" bold>Number of questions</Txt>
                <Txt size="sm" color="text2">Between 3 and 30</Txt>
              </View>
              <Row gap={12}>
                <IconButton icon={Minus} size={36} onPress={() => setCount((c) => Math.max(3, c - 1))} label="Fewer questions" />
                <Txt size="xl" bold style={{ minWidth: 28, textAlign: 'center' }}>{count}</Txt>
                <IconButton icon={Plus} size={36} onPress={() => setCount((c) => Math.min(30, c + 1))} label="More questions" />
              </Row>
            </Row>
            <Row wrap gap={8}>{[5, 10, 15, 20].map((n) => <Chip key={n} label={`${n} questions`} selected={count === n} onPress={() => setCount(n)} />)}</Row>
          </Card>

          <Card style={{ gap: 12 }}>
            <Row><IconTile icon={Gauge} size={36} /><Txt size="lg" bold>Difficulty</Txt></Row>
            {DIFFICULTIES.map((d) => (
              <Pressable key={d.value} onPress={() => setDifficulty(d.value)} style={{ padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: difficulty === d.value ? colors.primary : colors.border, backgroundColor: difficulty === d.value ? colors.primarySoft : colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}><Txt bold>{d.label}</Txt><Txt size="sm" color="text2">{d.hint}</Txt></View>
                {difficulty === d.value ? <CheckCircle2 size={20} color={colors.primary} /> : null}
              </Pressable>
            ))}
          </Card>

          <Button block icon={Sparkles} onPress={generate}>Generate Quiz</Button>
        </View>
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------- taking */
export function QuizScreen() {
  const { id } = useRoute().params;
  const navigation = useNavigation();
  const toast = useToast();
  const { colors } = useTheme();
  const { data, loading, error, reload } = useApi(() => quizApi.get(id), [id]);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const submittedRef = useRef(false);

  const quiz = data?.quiz;
  const questions = data?.questions || [];
  const timeLimit = quiz?.timeLimit || 0;
  const remaining = Math.max(0, timeLimit - elapsed);

  useEffect(() => { setIndex(0); setAnswers({}); setElapsed(0); submittedRef.current = false; }, [id]);

  useEffect(() => {
    if (!quiz) return undefined;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [quiz]);

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await quizApi.submit(id, { answers, timeTaken: elapsed });
      navigation.replace('QuizResult', { attemptId: res.result.attemptId });
    } catch (err) {
      submittedRef.current = false;
      toast.error(getErrorMessage(err));
      setSubmitting(false);
      setConfirmSubmit(false);
    }
  }, [id, answers, elapsed, navigation, toast]);

  useEffect(() => {
    if (quiz && timeLimit > 0 && remaining === 0 && !submittedRef.current) {
      toast.info("Time's up! Submitting your answers.");
      submit();
    }
  }, [quiz, timeLimit, remaining, submit, toast]);

  if (loading && !data) return <Screen header={false}><PageLoader label="Loading quiz..." /></Screen>;
  if (error && !data) return <Screen title="Quiz" back><ErrorState message={error} onRetry={reload} /></Screen>;
  if (!questions.length) return <Screen title="Quiz" back><ErrorState message="This quiz has no questions." /></Screen>;

  const q = questions[index];
  const answeredCount = Object.keys(answers).length;
  const unanswered = questions.length - answeredCount;
  const isLast = index === questions.length - 1;
  const low = timeLimit && remaining <= 30;

  return (
    <Screen
      header={false}
      footer={
        <Row gap={10}>
          <Button variant="secondary" icon={ArrowLeft} onPress={() => setIndex((i) => i - 1)} disabled={index === 0}>Previous</Button>
          <View style={{ flex: 1 }}>
            {isLast
              ? <Button block icon={Send} onPress={() => setConfirmSubmit(true)} loading={submitting}>Submit Quiz</Button>
              : <Button block iconRight={ArrowRight} onPress={() => setIndex((i) => i + 1)}>Next</Button>}
          </View>
        </Row>
      }
    >
      <Row>
        <IconButton icon={X} onPress={() => setConfirmExit(true)} label="Leave quiz" />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt size="sm" bold numberOfLines={1}>{quiz.topic}</Txt>
          <Txt size="xs" color="muted">{quiz.subject} · {quiz.difficulty}</Txt>
        </View>
        <Badge tone={low ? 'danger' : 'primary'}><Clock size={12} /> {timeLimit ? formatClock(remaining) : formatClock(elapsed)}</Badge>
      </Row>

      <Row between><Txt size="sm" bold>Question {index + 1} <Txt color="muted" size="sm">of {questions.length}</Txt></Txt><Txt size="sm" color="text2">{answeredCount} answered</Txt></Row>
      <ProgressBar value={((index + 1) / questions.length) * 100} />

      <Card style={{ gap: 16 }}>
        <Txt size="lg" bold>{q.question}</Txt>
        {q.options.map((opt, i) => {
          const letter = LETTERS[i];
          const selected = answers[q.id] === letter;
          return (
            <Pressable key={letter} onPress={() => setAnswers((a) => ({ ...a, [q.id]: letter }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.surface2 }}><Txt size="sm" bold color={selected ? '#fff' : 'text'}>{letter}</Txt></View>
              <Txt style={{ flex: 1 }}>{opt}</Txt>
            </Pressable>
          );
        })}
      </Card>

      <Row wrap gap={8}>
        {questions.map((qq, i) => (
          <Pressable key={qq.id} onPress={() => setIndex(i)} accessibilityLabel={`Question ${i + 1}${answers[qq.id] ? ', answered' : ''}`}
            style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: i === index ? colors.primary : 'transparent', backgroundColor: answers[qq.id] ? colors.primary : colors.surface2 }}>
            <Txt size="sm" bold color={answers[qq.id] ? '#fff' : 'text2'}>{i + 1}</Txt>
          </Pressable>
        ))}
      </Row>
      {!isLast ? <Button variant="ghost" block onPress={() => setConfirmSubmit(true)} disabled={submitting}>Submit Quiz now</Button> : null}

      <ConfirmDialog open={confirmSubmit} title="Submit quiz?" message={unanswered ? `You still have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Unanswered questions count as wrong.` : 'Great, you answered every question. Ready to see your score?'} confirmLabel="Submit" danger={false} loading={submitting} onConfirm={submit} onCancel={() => setConfirmSubmit(false)} />
      <ConfirmDialog open={confirmExit} title="Leave this quiz?" message="Your answers will not be saved. You can take this quiz later from Quiz History." confirmLabel="Leave" onConfirm={() => navigation.navigate('QuizHistory')} onCancel={() => setConfirmExit(false)} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- result */
function message(pct) {
  if (pct >= 90) return { title: 'Outstanding! 🏆', text: 'You have mastered this topic.' };
  if (pct >= 75) return { title: 'Great job! 🎉', text: 'Just a few details to polish.' };
  if (pct >= 50) return { title: 'Good effort! 💪', text: 'Review the explanations below and try again.' };
  return { title: 'Keep practising! 📚', text: 'Read the explanations, then retry to lock it in.' };
}

export function QuizResultScreen() {
  const { attemptId } = useRoute().params;
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');

  const { data, loading, error, reload } = useApi(() => quizApi.attempt(attemptId), [attemptId]);

  if (loading && !data) return <Screen title="Quiz Result" back="QuizHistory"><PageLoader label="Loading result..." /></Screen>;
  if (error && !data) return <Screen title="Quiz Result" back="QuizHistory"><ErrorState message={error} onRetry={reload} /></Screen>;

  const r = data.result;
  const pct = Math.round(r.percentage);
  const m = message(pct);
  const ringColor = pct >= 75 ? colors.success : pct >= 50 ? colors.primary : colors.warning;
  const shown = r.questions.filter((q) => (filter === 'all' ? true : filter === 'wrong' ? !q.isCorrect : q.isCorrect));

  const cells = [
    [CheckCircle2, 'success', r.correctAnswers, 'Correct answers'],
    [XCircle, 'danger', r.wrongAnswers + r.unanswered, `Wrong answers${r.unanswered ? ` (${r.unanswered} skipped)` : ''}`],
    [ListChecks, 'primary', r.totalQuestions, 'Total questions'],
    [Clock, 'warning', formatClock(r.timeTaken), 'Time taken'],
  ];

  return (
    <Screen eyebrow={`${r.quiz.subject} · ${r.quiz.difficulty}`} title={r.quiz.topic} back="QuizHistory">
      <Card style={{ alignItems: 'center', gap: 8, padding: 24 }}>
        <ProgressRing value={pct} size={150} stroke={12} color={ringColor}>
          <Txt style={{ fontSize: 34, fontWeight: '800' }}>{pct}%</Txt>
          <Txt size="sm" color="text2">Score</Txt>
        </ProgressRing>
        <Txt size="h2" bold>{m.title}</Txt>
        <Txt size="sm" color="text2">{m.text}</Txt>
        <Badge><Trophy size={12} /> {r.score} / {r.totalQuestions} correct</Badge>
      </Card>

      <Row wrap gap={12} style={{ alignItems: 'stretch' }}>
        {cells.map(([Icon, tone, v, l]) => (
          <Card key={l} style={{ width: '47.5%', gap: 4 }}>
            <IconTile icon={Icon} size={34} color={colors[tone]} bg={colors[`${tone}Soft`]} />
            <Txt size="h2" bold>{v}</Txt>
            <Txt size="xs" color="muted">{l}</Txt>
          </Card>
        ))}
      </Row>

      <Row gap={10}>
        <View style={{ flex: 1 }}><Button block variant="secondary" icon={RotateCcw} onPress={() => navigation.navigate('Quiz', { id: r.quiz.id })}>Retry Quiz</Button></View>
        <View style={{ flex: 1 }}><Button block icon={Home} onPress={() => navigation.navigate('Tabs', { screen: 'Home' })}>Dashboard</Button></View>
      </Row>

      <SectionHeader title="Answer explanations" />
      <Row wrap gap={8}>
        {[{ v: 'all', l: `All (${r.questions.length})` }, { v: 'wrong', l: `Wrong (${r.questions.filter((q) => !q.isCorrect).length})` }, { v: 'correct', l: `Correct (${r.correctAnswers})` }].map((f) => <Chip key={f.v} label={f.l} selected={filter === f.v} onPress={() => setFilter(f.v)} />)}
      </Row>

      {shown.map((q) => {
        const n = r.questions.indexOf(q) + 1;
        return (
          <Card key={q.questionId} style={{ gap: 12 }}>
            <Row center={false}>
              {q.isCorrect ? <CheckCircle2 size={22} color={colors.success} /> : q.selectedAnswer ? <XCircle size={22} color={colors.danger} /> : <MinusCircle size={22} color={colors.muted} />}
              <Txt bold style={{ flex: 1 }}>{n}. {q.question}</Txt>
            </Row>
            {q.options.map((opt, i) => {
              const letter = LETTERS[i];
              const correct = letter === q.correctAnswer;
              const wrong = letter === q.selectedAnswer && !correct;
              return (
                <View key={letter} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, borderWidth: 1.5, borderColor: correct ? colors.success : wrong ? colors.danger : colors.border, backgroundColor: correct ? colors.successSoft : wrong ? colors.dangerSoft : colors.surface }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}><Txt size="xs" bold>{letter}</Txt></View>
                  <Txt size="sm" style={{ flex: 1 }}>{opt}</Txt>
                  {letter === q.selectedAnswer ? <Txt size="xs" color="muted">Your answer</Txt> : null}
                </View>
              );
            })}
            {!q.selectedAnswer ? <Txt size="sm" color="muted">You skipped this question.</Txt> : null}
            <View style={{ backgroundColor: colors.primarySoft, borderRadius: 14, padding: 12 }}>
              <Txt size="sm"><Txt size="sm" bold>Explanation: </Txt>{q.explanation}</Txt>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

/* ---------------------------------------------------------------- history */
export function QuizHistoryScreen() {
  const navigation = useNavigation();
  const { data, loading, error, reload } = useApi(() => quizApi.history(), []);
  useEffect(() => navigation.addListener('focus', () => reload({ silent: true })), [navigation]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen eyebrow="Practice" title="Quiz History" back actions={<Button size="sm" icon={Plus} onPress={() => navigation.navigate('QuizSetup')}>New Quiz</Button>}>
      {loading && !data ? <SkeletonList count={4} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : !data.attempts.length && !data.notAttempted.length ? (
        <EmptyState icon={ListChecks} title="No quizzes yet" message="Generate your first AI quiz on any topic, or from one of your study materials." action={<Button icon={Plus} onPress={() => navigation.navigate('QuizSetup')}>Generate Quiz</Button>} />
      ) : (
        <>
          {data.notAttempted.length > 0 ? (
            <>
              <SectionHeader title="Ready to take" action={String(data.notAttempted.length)} />
              <Card padded={false}>
                {data.notAttempted.map((q, i) => <ListRow key={q.id} first={i === 0} icon={PlayCircle} title={q.topic} desc={`${q.subject} · ${q.difficulty} · ${q.totalQuestions} questions`} onPress={() => navigation.navigate('Quiz', { id: q.id })} />)}
              </Card>
            </>
          ) : null}
          {data.attempts.length > 0 ? (
            <>
              <SectionHeader title="Completed" action={String(data.attempts.length)} />
              <Card padded={false}>
                {data.attempts.map((a, i) => (
                  <ListRow key={a.attemptId} first={i === 0} icon={Trophy} title={a.topic} desc={`${a.subject} · ${a.difficulty} · ${formatDateTime(a.completedAt)} · ${formatClock(a.timeTaken)}`}
                    onPress={() => navigation.navigate('QuizResult', { attemptId: a.attemptId })}
                    right={<Badge tone={a.percentage >= 75 ? 'success' : a.percentage >= 50 ? 'primary' : 'warning'}>{Math.round(a.percentage)}%</Badge>} />
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
