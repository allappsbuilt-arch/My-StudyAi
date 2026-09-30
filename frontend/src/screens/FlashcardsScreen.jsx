/** Flashcard sets - list with due / mastery info, create button. */
import { useNavigate } from 'react-router-dom';
import { Plus, Layers, Play, Clock } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useApi } from '../hooks/useApi';
import { flashcardApi } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { EmptyState, ErrorState, SkeletonList } from '../components/Feedback';
import { ProgressBar } from '../components/Progress';
import { timeAgo } from '../utils/format';

export default function FlashcardsScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const decks = useApi(() => flashcardApi.decks(), []);

  return (
    <Page wide>
      <SimpleHeader title={t('fc.title')} actions={<Button size="sm" icon={<Plus size={16} />} onClick={() => navigate('/flashcards/new')}>{t('fc.create')}</Button>} />
      {decks.loading ? (
        <SkeletonList count={3} height={130} />
      ) : decks.error ? (
        <ErrorState message={decks.error} onRetry={decks.reload} />
      ) : decks.data.decks.length === 0 ? (
        <EmptyState icon={Layers} title={t('fc.empty')} action={<Button icon={<Plus size={18} />} onClick={() => navigate('/flashcards/new')}>{t('fc.create')}</Button>} />
      ) : (
        <div className="notes-grid stagger">
          {decks.data.decks.map((d) => (
            <div key={d.id} className="card clickable deck-card" onClick={() => navigate(`/flashcards/${d.id}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/flashcards/${d.id}`)}>
              <div className="row">
                <span className="icon-tile sm"><Layers size={18} /></span>
                <div className="grow">
                  <div className="bold truncate">{d.title}</div>
                  <div className="tiny text-2">{d.subject} · {d.cardCount} {t('fc.cards')}</div>
                </div>
                {d.dueCount > 0 && <span className="badge warning">{d.dueCount} {t('fc.due')}</span>}
              </div>
              <ProgressBar thin value={d.mastery} label="Mastery" />
              <div className="row-between tiny text-2">
                <span>{d.masteredCount}/{d.cardCount} {t('fc.mastered')}</span>
                <span className="row" style={{ gap: 4 }}><Clock size={12} /> {timeAgo(d.lastStudiedAt || d.updatedAt)}</span>
              </div>
              <Button
                size="sm"
                variant="soft"
                icon={<Play size={15} />}
                disabled={!d.cardCount}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/flashcards/${d.id}/study`);
                }}
              >
                {t('fc.study')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
