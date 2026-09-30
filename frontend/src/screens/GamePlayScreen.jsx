/**
 * Plays one learning game and saves the score to Supabase.
 * Matching / Memory use the student's own flashcards when they have enough, otherwise starter pairs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Timer, Volume2, Trophy, RotateCcw, Check, X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { gameApi, GAME_NAMES, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { Spinner } from '../components/Feedback';
import { ProgressBar } from '../components/Progress';
import { speak, canSpeak } from '../hooks/useSpeech';
import { STARTER_PAIRS, QUIZ_BANK, SPELLING_WORDS, shuffle } from '../utils/gameContent';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function GamePlayScreen() {
  const { game } = useParams();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null); // { score, won, detail }

  const finish = useCallback(
    async (score, won, detail) => {
      setResult({ score, won, detail });
      try {
        await gameApi.saveScore({ game, score, won });
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [game, toast]
  );

  const again = () => {
    setResult(null);
    setRound((r) => r + 1);
  };

  const Game = { matching: MatchingGame, battle: QuizBattle, streak: StreakChallenge, memory: MemoryGame, spelling: SpellingBee, mathrush: MathRush }[game];
  if (!Game) return <Navigate to="/games" replace />;

  return (
    <Page>
      <SimpleHeader title={GAME_NAMES[game]} back="/games" />
      {result ? (
        <div className="card result-hero pop-in">
          <div className="icon-tile lg" style={result.won ? { background: 'var(--success-soft)', color: 'var(--success)' } : undefined}>
            <Trophy size={30} />
          </div>
          <h2>{result.won ? t('games.youWon') : t('games.gameOver')}</h2>
          <div className="big-number">{result.score}</div>
          <div className="text-2 small">{t('common.score')}{result.detail ? ` · ${result.detail}` : ''}</div>
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <Button icon={<RotateCcw size={18} />} onClick={again}>{t('games.playAgain')}</Button>
            <Button variant="secondary" onClick={() => navigate('/games')}>{t('games.title')}</Button>
          </div>
        </div>
      ) : (
        <Game key={round} onFinish={finish} />
      )}
    </Page>
  );
}

/** Pairs from the student's flashcards (needs at least 4), otherwise starter pairs. */
function usePairs(count) {
  const [pairs, setPairs] = useState(null);
  useEffect(() => {
    let alive = true;
    gameApi
      .myPairs(count)
      .catch(() => [])
      .then((mine) => alive && setPairs(mine.length >= 4 ? mine : shuffle(STARTER_PAIRS).slice(0, count)));
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
    if (left <= 0) {
      endRef.current();
      return undefined;
    }
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left, running]);
  return [left, setLeft];
}

function TimerPill({ left, total }) {
  return (
    <div className={`timer ${left <= Math.min(10, total / 4) ? 'low' : ''}`}>
      <Timer size={16} /> {left}s
    </div>
  );
}

// ---------------------------------------------------------------------------
function MatchingGame({ onFinish }) {
  const pairs = usePairs(6);
  const [selected, setSelected] = useState(null); // { side, idx }
  const [matched, setMatched] = useState(new Set());
  const [wrong, setWrong] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [start] = useState(Date.now());

  const left = useMemo(() => (pairs ? shuffle(pairs.map((p, i) => ({ i, text: p.term }))) : []), [pairs]);
  const right = useMemo(() => (pairs ? shuffle(pairs.map((p, i) => ({ i, text: p.definition }))) : []), [pairs]);

  if (!pairs) return <div className="center" style={{ padding: 40 }}><Spinner /></div>;

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
  };

  const cls = (side, it) =>
    `match-item ${matched.has(it.i) ? 'matched' : ''} ${selected?.side === side && selected.i === it.i ? 'selected' : ''} ${wrong === `${side}-${it.i}` ? 'wrong' : ''}`;

  return (
    <div className="stack">
      <div className="row-between small text-2">
        <span>Tap a term, then its definition</span>
        <span className="bold">{matched.size}/{pairs.length}</span>
      </div>
      <div className="match-grid">
        <div className="stack" style={{ gap: 10 }}>
          {left.map((it) => (
            <button key={`l${it.i}`} className={cls('l', it)} onClick={() => choose('l', it)} disabled={matched.has(it.i)} style={{ fontWeight: 600 }}>{it.text}</button>
          ))}
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {right.map((it) => (
            <button key={`r${it.i}`} className={cls('r', it)} onClick={() => choose('r', it)} disabled={matched.has(it.i)} style={{ fontSize: '0.78rem' }}>{it.text}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function QuestionCard({ q, onAnswer, reveal }) {
  return (
    <div className="card q-card pop-in" key={q[0]}>
      <div className="q-text">{q[0]}</div>
      <div className="stack" style={{ marginTop: 16 }}>
        {q[1].map((opt, i) => {
          const state = reveal === null ? '' : i === q[2] ? 'correct' : i === reveal ? 'wrong' : '';
          return (
            <button key={opt} className={`answer ${state}`} onClick={() => reveal === null && onAnswer(i)} disabled={reveal !== null}>
              <span className="letter">{LETTERS[i]}</span>
              <span className="text">{opt}</span>
              {state === 'correct' && <Check size={18} color="var(--success)" />}
              {state === 'wrong' && <X size={18} color="var(--danger)" />}
            </button>
          );
        })}
      </div>
    </div>
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
  const end = () => {
    if (done.current) return;
    done.current = true;
    onFinish(score, correct >= 8, `${correct} correct`);
  };
  const [left] = useCountdown(TOTAL, true, end);

  const answer = (i) => {
    setReveal(i);
    const ok = i === questions[idx][2];
    if (ok) {
      setScore((s) => s + 10 + Math.floor(left / 10));
      setCorrect((c) => c + 1);
    }
    setTimeout(() => {
      setReveal(null);
      if (idx + 1 >= questions.length) end();
      else setIdx(idx + 1);
    }, 650);
  };

  return (
    <div className="stack">
      <div className="quiz-top">
        <span className="badge">{correct} correct · {score} pts</span>
        <TimerPill left={left} total={TOTAL} />
      </div>
      <ProgressBar thin value={(left / TOTAL) * 100} label="Time left" />
      <QuestionCard q={questions[idx]} onAnswer={answer} reveal={reveal} />
    </div>
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
    }, 700);
  };

  return (
    <div className="stack">
      <div className="card row-between">
        <span className="text-2 small">One mistake ends the run. Reach 5 to win!</span>
        <span className="badge warning">🔥 {streak}</span>
      </div>
      <QuestionCard q={questions[idx]} onAnswer={answer} reveal={reveal} />
    </div>
  );
}

// ---------------------------------------------------------------------------
function MemoryGame({ onFinish }) {
  const pairs = usePairs(6);
  const cards = useMemo(
    () => (pairs ? shuffle(pairs.flatMap((p, i) => [{ id: `t${i}`, pair: i, text: p.term }, { id: `d${i}`, pair: i, text: p.definition }])) : []),
    [pairs]
  );
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);

  if (!pairs) return <div className="center" style={{ padding: 40 }}><Spinner /></div>;

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
    <div className="stack">
      <div className="row-between small text-2">
        <span>Find each term and its definition</span>
        <span className="bold">{moves} moves</span>
      </div>
      <div className="memory-grid">
        {cards.map((c) => (
          <button
            key={c.id}
            className={`memory-card ${open.some((o) => o.id === c.id) ? 'flipped' : ''} ${matched.has(c.pair) ? 'matched' : ''}`}
            onClick={() => flip(c)}
            aria-label={open.some((o) => o.id === c.id) || matched.has(c.pair) ? c.text : 'Hidden card'}
          >
            <span className="inner">
              <span className="face front">?</span>
              <span className="face back">{c.text}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function SpellingBee({ onFinish }) {
  const [words] = useState(() => shuffle(SPELLING_WORDS).slice(0, 8));
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const inputRef = useRef(null);
  const [word, meaning] = words[idx];

  useEffect(() => {
    speak(word, { lang: 'en-US', rate: 0.85 });
    inputRef.current?.focus();
  }, [word]);

  const submit = (e) => {
    e.preventDefault();
    if (feedback) return;
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
    <form className="card stack center pop-in" onSubmit={submit} key={word}>
      <div className="row-between small text-2">
        <span>Word {idx + 1} of {words.length}</span>
        <span className="bold">{score} pts</span>
      </div>
      <button type="button" className="play-btn" onClick={() => speak(word, { lang: 'en-US', rate: 0.8 })} aria-label="Hear the word" disabled={!canSpeak}>
        <Volume2 size={30} />
      </button>
      <p className="text-2 small">Meaning: {meaning}</p>
      {!canSpeak && <p className="tiny muted">Your browser can’t speak - use the meaning as a clue.</p>}
      <input ref={inputRef} className={`input answer-input ${feedback === 'bad' ? 'invalid' : ''}`} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Type the word" autoComplete="off" autoCapitalize="off" spellCheck={false} aria-label="Your spelling" />
      {feedback === 'ok' && <div className="alert success"><Check size={18} /> Correct!</div>}
      {feedback === 'bad' && <div className="alert"><X size={18} /> It’s spelled “{word}”.</div>}
      <Button type="submit" block disabled={!value.trim() || Boolean(feedback)}>Check</Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
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
  const TOTAL = 60;
  const [solved, setSolved] = useState(0);
  const [problem, setProblem] = useState(() => makeProblem(1));
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState(null);
  const done = useRef(false);
  const inputRef = useRef(null);
  const end = () => {
    if (done.current) return;
    done.current = true;
    onFinish(solved * 10, solved >= 15, `${solved} solved`);
  };
  const [left] = useCountdown(TOTAL, true, end);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim() === '') return;
    if (Number(value) === problem.ans) {
      setSolved((s) => s + 1);
      setFlash('ok');
      setProblem(makeProblem(1 + Math.floor((solved + 1) / 4)));
    } else setFlash('bad');
    setValue('');
    setTimeout(() => setFlash(null), 300);
    inputRef.current?.focus();
  };

  return (
    <form className="stack" onSubmit={submit}>
      <div className="quiz-top">
        <span className="badge">{solved} solved</span>
        <TimerPill left={left} total={TOTAL} />
      </div>
      <ProgressBar thin value={(left / TOTAL) * 100} label="Time left" />
      <div className="card center" style={{ padding: '34px 18px', borderColor: flash === 'ok' ? 'var(--success)' : flash === 'bad' ? 'var(--danger)' : undefined, transition: 'border-color 0.2s' }}>
        <div className="big-number">{problem.text}</div>
      </div>
      <input ref={inputRef} className="input answer-input" inputMode="numeric" autoFocus value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d-]/g, ''))} placeholder="Answer" aria-label="Answer" />
      <Button type="submit" block size="lg">Submit</Button>
    </form>
  );
}
