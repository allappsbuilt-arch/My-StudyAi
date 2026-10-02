/**
 * Plays one learning game and saves the score.
 * Matching / Memory use the student's own flashcards when they have enough, otherwise starter pairs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, TextInput as RNInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, RotateCcw, Timer, Trophy, Volume2, X } from 'lucide-react-native';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { GAME_NAMES, gameApi, getErrorMessage } from '../services/api';
import Screen from '../components/Screen';
import { Alert, Badge, Button, Card, IconTile, ProgressBar, Row, Spinner, Txt } from '../components/Ui';
import { speak } from '../hooks/useSpeech';
import { QUIZ_BANK, SPELLING_WORDS, STARTER_PAIRS, shuffle } from '../utils/gameContent';

const LETTERS = ['A', 'B', 'C', 'D'];

export function GamePlayScreen() {
  const { game } = useRoute().params;
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);

  const finish = useCallback(async (score, won, detail) => {
    setResult({ score, won, detail });
    try {
      await gameApi.saveScore({ game, score, won });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [game, toast]);

  const again = () => { setResult(null); setRound((r) => r + 1); };

  const Game = { matching: MatchingGame, battle: QuizBattle, streak: StreakChallenge, memory: MemoryGame, spelling: SpellingBee, mathrush: MathRush }[game];
  useEffect(() => { if (!Game) navigation.navigate('Games'); }, [Game, navigation]);
  if (!Game) return null;

  return (
    <Screen title={GAME_NAMES[game]} back>
      {result ? (
        <Card style={{ alignItems: 'center', gap: 8, padding: 24 }}>
          <IconTile icon={Trophy} size={64} color={result.won ? colors.success : colors.primary} bg={result.won ? colors.successSoft : colors.primarySoft} />
          <Txt size="h2" bold>{result.won ? t('games.youWon') : t('games.gameOver')}</Txt>
          <Txt size="hero" bold color="primary" style={{ fontSize: 48, lineHeight: 56 }}>{result.score}</Txt>
          <Txt size="sm" color="text2">{t('common.score')}{result.detail ? ` · ${result.detail}` : ''}</Txt>
          <Row style={{ marginTop: 8 }}>
            <Button icon={RotateCcw} onPress={again}>{t('games.playAgain')}</Button>
            <Button variant="secondary" onPress={() => navigation.navigate('Tabs', { screen: 'Games' })}>{t('games.title')}</Button>
          </Row>
        </Card>
      ) : <Game key={round} onFinish={finish} />}
    </Screen>
  );
}

function usePairs(count) {
  const [pairs, setPairs] = useState(null);
  useEffect(() => {
    let alive = true;
    gameApi.myPairs(count).catch(() => []).then((mine) => alive && setPairs(mine.length >= 4 ? mine : shuffle(STARTER_PAIRS).slice(0, count)));
    return () => { alive = false; };
  }, [count]);
  return pairs;
}

function useCountdown(seconds, running, onEnd) {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => {
    if (!running) return undefined;
    if (left <= 0) { endRef.current(); return undefined; }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, running]);
  return [left, setLeft];
}

function TimerPill({ left, total }) {
  const low = left <= Math.min(10, total / 4);
  return <Badge tone={low ? 'danger' : 'primary'}><Timer size={12} /> {left}s</Badge>;
}

/* ---------------------------------------------------------------- matching */
function MatchingGame({ onFinish }) {
  const { colors } = useTheme();
  const pairs = usePairs(6);
  const [selected, setSelected] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [start] = useState(Date.now());

  const left = useMemo(() => (pairs ? shuffle(pairs.map((p, i) => ({ i, text: p.term }))) : []), [pairs]);
  const right = useMemo(() => (pairs ? shuffle(pairs.map((p, i) => ({ i, text: p.definition }))) : []), [pairs]);

  if (!pairs) return <View style={{ padding: 40 }}><Spinner /></View>;

  const choose = (side, item) => {
    if (matched.has(item.i)) return;
    if (!selected || selected.side === side) return setSelected({ side, i: item.i });
    if (selected.i === item.i) {
      const next = new Set(matched).add(item.i);
      setMatched(next);
      setSelected(null);
      if (next.size === pairs.length) {
        const secs = Math.round((Date.now() - start) / 1000);
        onFinish(Math.max(10, pairs.length * 20 - mistakes * 5 - Math.floor(secs / 5)), true, `${secs}s · ${mistakes} ${mistakes === 1 ? 'mistake' : 'mistakes'}`);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrong(`${side}-${item.i}`);
      setTimeout(() => setWrong(null), 450);
      setSelected(null);
    }
    return undefined;
  };

  const tile = (side, it, small) => {
    const isMatched = matched.has(it.i);
    const isSel = selected?.side === side && selected.i === it.i;
    const isWrong = wrong === `${side}-${it.i}`;
    return (
      <Pressable key={`${side}${it.i}`} disabled={isMatched} onPress={() => choose(side, it)}
        style={{ padding: 12, minHeight: 56, borderRadius: 14, borderWidth: 2, justifyContent: 'center', borderColor: isWrong ? colors.danger : isSel ? colors.primary : isMatched ? colors.success : colors.border, backgroundColor: isWrong ? colors.dangerSoft : isMatched ? colors.successSoft : isSel ? colors.primarySoft : colors.surface, opacity: isMatched ? 0.6 : 1 }}>
        <Txt size={small ? 'xs' : 'sm'} weight={small ? '400' : '700'}>{it.text}</Txt>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <Row between><Txt size="sm" color="text2">Tap a term, then its definition</Txt><Txt size="sm" bold>{matched.size}/{pairs.length}</Txt></Row>
      <Row center={false} gap={10}>
        <View style={{ flex: 1, gap: 10 }}>{left.map((it) => tile('l', it))}</View>
        <View style={{ flex: 1, gap: 10 }}>{right.map((it) => tile('r', it, true))}</View>
      </Row>
    </View>
  );
}

/* ---------------------------------------------------------------- quiz games */
function QuestionCard({ q, onAnswer, reveal }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: 14 }}>
      <Txt size="lg" bold>{q[0]}</Txt>
      {q[1].map((opt, i) => {
        const correct = reveal !== null && i === q[2];
        const wrong = reveal !== null && i === reveal && i !== q[2];
        return (
          <Pressable key={opt} disabled={reveal !== null} onPress={() => onAnswer(i)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, borderWidth: 2, borderColor: correct ? colors.success : wrong ? colors.danger : colors.border, backgroundColor: correct ? colors.successSoft : wrong ? colors.dangerSoft : colors.surface }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}><Txt size="sm" bold>{LETTERS[i]}</Txt></View>
            <Txt style={{ flex: 1 }}>{opt}</Txt>
            {correct ? <Check size={18} color={colors.success} /> : null}
            {wrong ? <X size={18} color={colors.danger} /> : null}
          </Pressable>
        );
      })}
    </Card>
  );
}

function QuizBattle({ onFinish }) {
  const TOTAL = 60;
  const [questions] = useState(() => shuffle(QUIZ_BANK));
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [reveal, setReveal] = useState(null);
  const done = useRef(false);
  const stats = useRef({ score: 0, correct: 0 });
  stats.current = { score, correct };
  const end = () => {
    if (done.current) return;
    done.current = true;
    onFinish(stats.current.score, stats.current.correct >= 8, `${stats.current.correct} correct`);
  };
  const [left] = useCountdown(TOTAL, true, end);

  const answer = (i) => {
    setReveal(i);
    if (i === questions[idx][2]) { setScore((s) => s + 10 + Math.floor(left / 10)); setCorrect((c) => c + 1); }
    setTimeout(() => {
      setReveal(null);
      if (idx + 1 >= questions.length) end();
      else setIdx(idx + 1);
    }, 650);
  };

  return (
    <View style={{ gap: 12 }}>
      <Row between><Badge>{correct} correct · {score} pts</Badge><TimerPill left={left} total={TOTAL} /></Row>
      <ProgressBar thin value={(left / TOTAL) * 100} />
      <QuestionCard q={questions[idx]} onAnswer={answer} reveal={reveal} />
    </View>
  );
}

function StreakChallenge({ onFinish }) {
  const [questions] = useState(() => shuffle(QUIZ_BANK));
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [reveal, setReveal] = useState(null);

  const answer = (i) => {
    setReveal(i);
    const ok = i === questions[idx][2];
    setTimeout(() => {
      setReveal(null);
      if (!ok) return onFinish(streak * 10, streak >= 5, `${streak} in a row`);
      const next = streak + 1;
      setStreak(next);
      if (idx + 1 >= questions.length) onFinish(next * 10, true, `${next} in a row - perfect!`);
      else setIdx(idx + 1);
      return undefined;
    }, 700);
  };

  return (
    <View style={{ gap: 12 }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size="sm" color="text2" style={{ flex: 1 }}>One mistake ends the run. Reach 5 to win!</Txt>
        <Badge tone="warning">🔥 {streak}</Badge>
      </Card>
      <QuestionCard q={questions[idx]} onAnswer={answer} reveal={reveal} />
    </View>
  );
}

/* ---------------------------------------------------------------- memory */
function MemoryGame({ onFinish }) {
  const { colors } = useTheme();
  const pairs = usePairs(6);
  const cards = useMemo(() => (pairs ? shuffle(pairs.flatMap((p, i) => [{ id: `t${i}`, pair: i, text: p.term }, { id: `d${i}`, pair: i, text: p.definition }])) : []), [pairs]);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);

  if (!pairs) return <View style={{ padding: 40 }}><Spinner /></View>;

  const flip = (c) => {
    if (open.length === 2 || open.some((o) => o.id === c.id) || matched.has(c.pair)) return;
    const next = [...open, c];
    setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      if (next[0].pair === next[1].pair) {
        const m = new Set(matched).add(c.pair);
        setMatched(m);
        setOpen([]);
        if (m.size === pairs.length) {
          const mv = moves + 1;
          setTimeout(() => onFinish(Math.max(10, 150 - (mv - pairs.length) * 8), true, `${mv} moves`), 400);
        }
      } else setTimeout(() => setOpen([]), 900);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Row between><Txt size="sm" color="text2">Find each term and its definition</Txt><Txt size="sm" bold>{moves} moves</Txt></Row>
      <Row wrap gap={10}>
        {cards.map((c) => {
          const up = open.some((o) => o.id === c.id) || matched.has(c.pair);
          return (
            <Pressable key={c.id} onPress={() => flip(c)} accessibilityLabel={up ? c.text : 'Hidden card'}
              style={{ width: '30.5%', height: 92, padding: 6, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: matched.has(c.pair) ? colors.success : up ? colors.primary : colors.primary600, backgroundColor: matched.has(c.pair) ? colors.successSoft : up ? colors.surface : colors.primary }}>
              {up ? <Txt size="xs" bold center numberOfLines={5}>{c.text}</Txt> : <Txt size="h1" bold color="#fff">?</Txt>}
            </Pressable>
          );
        })}
      </Row>
    </View>
  );
}

/* ---------------------------------------------------------------- spelling */
function SpellingBee({ onFinish }) {
  const { colors } = useTheme();
  const [words] = useState(() => shuffle(SPELLING_WORDS).slice(0, 8));
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [word, meaning] = words[idx];

  useEffect(() => { speak(word, { lang: 'en-US', rate: 0.85 }); }, [word]);

  const submit = () => {
    if (feedback || !value.trim()) return;
    const ok = value.trim().toLowerCase() === word;
    setFeedback(ok ? 'ok' : 'bad');
    const nextScore = score + (ok ? 15 : 0);
    if (ok) setScore(nextScore);
    setTimeout(() => {
      setFeedback(null);
      setValue('');
      if (idx + 1 >= words.length) onFinish(nextScore, nextScore >= words.length * 15 * 0.6, `${nextScore / 15}/${words.length} words`);
      else setIdx(idx + 1);
    }, 1100);
  };

  return (
    <Card style={{ gap: 14, alignItems: 'stretch' }}>
      <Row between><Txt size="sm" color="text2">Word {idx + 1} of {words.length}</Txt><Txt size="sm" bold>{score} pts</Txt></Row>
      <Pressable onPress={() => speak(word, { lang: 'en-US', rate: 0.8 })} accessibilityLabel="Hear the word" style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Volume2 size={30} color="#fff" />
      </Pressable>
      <Txt size="sm" color="text2" center>Meaning: {meaning}</Txt>
      <RNInput value={value} onChangeText={setValue} onSubmitEditing={submit} placeholder="Type the word" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} spellCheck={false}
        style={{ textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text, borderWidth: 2, borderColor: feedback === 'bad' ? colors.danger : colors.border, borderRadius: 14, paddingVertical: 12, backgroundColor: colors.surface }} />
      {feedback === 'ok' ? <Alert type="success" icon={Check}>Correct!</Alert> : null}
      {feedback === 'bad' ? <Alert icon={X}>{`It's spelled "${word}".`}</Alert> : null}
      <Button block disabled={!value.trim() || Boolean(feedback)} onPress={submit}>Check</Button>
    </Card>
  );
}

/* ---------------------------------------------------------------- math rush */
function makeProblem(level) {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const op = ['+', '−', '×', '÷'][r(0, level > 3 ? 3 : 2)];
  let a = r(2, 10 + level * 4);
  let b = r(2, 10 + level * 3);
  if (op === '×') { a = r(2, 12); b = r(2, 12); }
  if (op === '÷') { b = r(2, 12); a = b * r(2, 12); }
  if (op === '−' && b > a) [a, b] = [b, a];
  const ans = { '+': a + b, '−': a - b, '×': a * b, '÷': a / b }[op];
  return { text: `${a} ${op} ${b}`, ans };
}

function MathRush({ onFinish }) {
  const { colors } = useTheme();
  const TOTAL = 60;
  const [solved, setSolved] = useState(0);
  const [problem, setProblem] = useState(() => makeProblem(1));
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState(null);
  const done = useRef(false);
  const solvedRef = useRef(0);
  solvedRef.current = solved;
  const end = () => {
    if (done.current) return;
    done.current = true;
    onFinish(solvedRef.current * 10, solvedRef.current >= 15, `${solvedRef.current} solved`);
  };
  const [left] = useCountdown(TOTAL, true, end);

  const submit = () => {
    if (value.trim() === '') return;
    if (Number(value) === problem.ans) {
      setSolved((s) => s + 1);
      setFlash('ok');
      setProblem(makeProblem(1 + Math.floor((solved + 1) / 4)));
    } else setFlash('bad');
    setValue('');
    setTimeout(() => setFlash(null), 300);
  };

  return (
    <View style={{ gap: 12 }}>
      <Row between><Badge>{solved} solved</Badge><TimerPill left={left} total={TOTAL} /></Row>
      <ProgressBar thin value={(left / TOTAL) * 100} />
      <Card style={{ alignItems: 'center', paddingVertical: 34, borderColor: flash === 'ok' ? colors.success : flash === 'bad' ? colors.danger : colors.border }}>
        <Txt size="hero" bold color="primary" style={{ fontSize: 44, lineHeight: 52 }}>{problem.text}</Txt>
      </Card>
      <RNInput value={value} onChangeText={(v) => setValue(v.replace(/[^\d-]/g, ''))} onSubmitEditing={submit} keyboardType="numeric" autoFocus placeholder="Answer" placeholderTextColor={colors.muted}
        style={{ textAlign: 'center', fontSize: 24, fontWeight: '700', color: colors.text, borderWidth: 2, borderColor: colors.border, borderRadius: 14, paddingVertical: 12, backgroundColor: colors.surface }} />
      <Button block onPress={submit}>Submit</Button>
    </View>
  );
}
