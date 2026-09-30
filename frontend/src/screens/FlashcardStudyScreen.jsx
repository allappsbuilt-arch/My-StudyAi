/** Study a flashcard set: tap to flip, then grade Again / Hard / Good / Easy (spaced repetition). */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PartyPopper, RotateCcw } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { flashcardApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { ErrorState, PageLoader } from '../components/Feedback';
import { ProgressBar } from '../components/Progress';

export default function FlashcardStudyScreen() {
  const { id } = useParams();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ again: 0, known: 0 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setError('');
    try {
      const res = await flashcardApi.deck(id);
      const now = new Date().toISOString();
      const due = res.cards.filter((c) => c.dueAt <= now);
      // Nothing due: practise the whole set anyway
      setQueue((due.length ? due : res.cards).slice(0, 30));
      setDeck(res.deck);
      setIndex(0);
      setFlipped(false);
      setStats({ again: 0, known: 0 });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keyboard: space flips, 1-4 grades
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const grade = async (g) => {
    const card = queue[index];
    if (!card || busy) return;
    setBusy(true);
    try {
      await flashcardApi.review(card, g);
      setStats((s) => (g === 0 ? { ...s, again: s.again + 1 } : { ...s, known: s.known + 1 }));
      // "Again" cards come back at the end of this session
      if (g === 0) setQueue((q) => [...q, card]);
      setFlipped(false);
      setTimeout(() => setIndex((i) => i + 1), 150);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (error) return <Page><ErrorState message={error} onRetry={load} /></Page>;
  if (!deck) return <Page><PageLoader /></Page>;

  const card = queue[index];
  const done = index >= queue.length;

  return (
    <Page>
      <SimpleHeader title={deck.title} back={`/flashcards/${id}`} />
      {done ? (
        <div className="card result-hero pop-in">
          <div className="icon-tile lg"><PartyPopper size={30} /></div>
          <h2>{t('fc.sessionDone')}</h2>
          <p className="text-2">{stats.known} known · {stats.again} to review again</p>
          <div className="row" style={{ gap: 10 }}>
            <Button icon={<RotateCcw size={18} />} onClick={load}>{t('games.playAgain')}</Button>
            <Button variant="secondary" onClick={() => navigate(`/flashcards/${id}`)}>{t('common.done')}</Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="row-between small text-2">
            <span>{index + 1} / {queue.length}</span>
            <span>{stats.known} ✓ · {stats.again} ↺</span>
          </div>
          <ProgressBar thin value={(index / queue.length) * 100} label="Session progress" />
          <button className={`flip ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped((f) => !f)} aria-label={flipped ? card.back : card.front}>
            <span className="inner">
              <span className="face front">{card.front}<span className="hint">{t('fc.tapFlip')}</span></span>
              <span className="face back">{card.back}</span>
            </span>
          </button>
          {flipped ? (
            <div className="grade-row pop-in">
              <Button variant="danger-soft" onClick={() => grade(0)} disabled={busy}>{t('fc.again')}<small>&lt;1m</small></Button>
              <Button variant="secondary" onClick={() => grade(1)} disabled={busy}>{t('fc.hard')}<small>{card.repetitions ? '3d' : '1d'}</small></Button>
              <Button variant="soft" onClick={() => grade(2)} disabled={busy}>{t('fc.good')}<small>{card.repetitions ? `${Math.max(6, card.interval * 2)}d` : '1d'}</small></Button>
              <Button onClick={() => grade(3)} disabled={busy}>{t('fc.easy')}<small>{card.repetitions ? `${Math.max(8, card.interval * 3)}d` : '3d'}</small></Button>
            </div>
          ) : (
            <Button block size="lg" variant="secondary" onClick={() => setFlipped(true)}>Show answer</Button>
          )}
        </div>
      )}
    </Page>
  );
}
