/** One flashcard set: stats, study button, add / edit / delete cards, delete the set. */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { flashcardApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { ConfirmDialog } from '../components/Modal';
import { ErrorState, SkeletonList } from '../components/Feedback';
import { ProgressBar } from '../components/Progress';

export default function DeckScreen() {
  const { id } = useParams();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const data = useApi(() => flashcardApi.deck(id), [id]);
  const [draft, setDraft] = useState({ front: '', back: '' });
  const [editing, setEditing] = useState(null); // { id, front, back }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (data.loading) return <Page><SkeletonList count={4} height={70} /></Page>;
  if (data.error) return <Page><ErrorState message={data.error} onRetry={data.reload} /></Page>;
  const { deck, cards } = data.data;

  const add = async (e) => {
    e.preventDefault();
    try {
      await flashcardApi.addCard(deck.id, draft);
      setDraft({ front: '', back: '' });
      data.reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveEdit = async () => {
    try {
      await flashcardApi.updateCard(editing.id, editing);
      setEditing(null);
      data.reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeCard = async (cardId) => {
    try {
      await flashcardApi.removeCard(cardId);
      data.reload({ silent: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeDeck = async () => {
    setDeleting(true);
    try {
      await flashcardApi.removeDeck(deck.id);
      toast.success('Flashcard set deleted');
      navigate('/flashcards', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Page>
      <SimpleHeader title={deck.title} back="/flashcards" actions={<button className="icon-btn plain" onClick={() => setConfirmDelete(true)} aria-label="Delete set"><Trash2 size={19} /></button>} />

      <div className="card stack pop-in">
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="badge">{deck.subject}</span>
          {deck.tags.map((tg) => <span key={tg} className="badge neutral">#{tg}</span>)}
        </div>
        {deck.description && <p className="text-2 small">{deck.description}</p>}
        <div className="stat3">
          <div className="cell"><span className="v">{deck.cardCount}</span><span className="l">{t('fc.cards')}</span></div>
          <div className="cell"><span className="v">{deck.dueCount}</span><span className="l">{t('fc.due')}</span></div>
          <div className="cell"><span className="v">{deck.mastery}%</span><span className="l">{t('fc.mastered')}</span></div>
        </div>
        <ProgressBar thin value={deck.mastery} label="Mastery" />
        <Button block size="lg" icon={<Play size={18} />} disabled={!deck.cardCount} onClick={() => navigate(`/flashcards/${deck.id}/study`)}>
          {t('fc.study')} {deck.dueCount ? `(${deck.dueCount} ${t('fc.due')})` : ''}
        </Button>
      </div>

      <div className="section-title"><h2>{t('fc.cards')} ({cards.length})</h2></div>
      <form className="card stack" onSubmit={add}>
        <div className="card-editor">
          <div className="pair">
            <input className="input filled" placeholder="Front" value={draft.front} onChange={(e) => setDraft({ ...draft, front: e.target.value })} aria-label="New card front" />
            <input className="input filled back-input" placeholder="Back" value={draft.back} onChange={(e) => setDraft({ ...draft, back: e.target.value })} aria-label="New card back" />
            <button className="icon-btn primary" type="submit" disabled={!draft.front.trim() || !draft.back.trim()} aria-label="Add card"><Plus size={18} /></button>
          </div>
        </div>
      </form>

      <div className="card list-card" style={{ marginTop: 12 }}>
        {cards.map((c) =>
          editing?.id === c.id ? (
            <div key={c.id} className="list-item card-editor" style={{ display: 'grid' }}>
              <div className="pair">
                <input className="input filled" value={editing.front} onChange={(e) => setEditing({ ...editing, front: e.target.value })} aria-label="Front" />
                <input className="input filled back-input" value={editing.back} onChange={(e) => setEditing({ ...editing, back: e.target.value })} aria-label="Back" />
                <div className="row" style={{ gap: 4 }}>
                  <button className="icon-btn primary sm" onClick={saveEdit} aria-label="Save"><Check size={16} /></button>
                  <button className="icon-btn plain sm" onClick={() => setEditing(null)} aria-label="Cancel"><X size={16} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div key={c.id} className="list-item" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <div className="bold small">{c.front}</div>
                <div className="small text-2">{c.back}</div>
                <div className="tiny muted" style={{ marginTop: 4 }}>{c.interval >= 7 ? `✅ ${t('fc.mastered')}` : c.reviewedAt ? `Next review in ${c.interval || '<1'} day(s)` : 'New'}</div>
              </div>
              <button className="icon-btn plain sm" onClick={() => setEditing({ id: c.id, front: c.front, back: c.back })} aria-label="Edit card"><Pencil size={15} /></button>
              <button className="icon-btn plain sm" onClick={() => removeCard(c.id)} aria-label="Delete card"><Trash2 size={15} /></button>
            </div>
          )
        )}
        {!cards.length && <p className="small text-2 center" style={{ padding: 16 }}>No cards yet - add one above.</p>}
      </div>

      <ConfirmDialog open={confirmDelete} title="Delete this set?" message={`"${deck.title}" and all its cards will be deleted.`} loading={deleting} onConfirm={removeDeck} onCancel={() => setConfirmDelete(false)} />
    </Page>
  );
}
