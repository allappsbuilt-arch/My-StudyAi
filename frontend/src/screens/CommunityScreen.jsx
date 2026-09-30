/** One community: blue hero, member count + join button, top contributors, and its posts. */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Globe, PenSquare } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { socialApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { Avatar } from '../components/Brand';
import { CreatePostSheet, UserSheet } from '../components/Social';
import { Feed } from './SocialsScreen';
import { ErrorState, Skeleton } from '../components/Feedback';
import Modal from '../components/Modal';

const MEDALS = ['👑', '🥈', '🥉'];

export default function CommunityScreen() {
  const { slug } = useParams();
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const data = useApi(() => socialApi.community(slug), [slug]);
  const [composer, setComposer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openUser, setOpenUser] = useState(null);
  const [allContributors, setAllContributors] = useState(false);

  if (data.loading) return <Page><Skeleton height={260} radius={24} /></Page>;
  if (data.error) return <Page><ErrorState message={data.error} onRetry={data.reload} /></Page>;
  const { community: c, topContributors } = data.data;

  const toggle = async () => {
    setBusy(true);
    try {
      await socialApi.toggleMembership(c.id, c.joined);
      data.setData((d) => ({ ...d, community: { ...c, joined: !c.joined, members: c.members + (c.joined ? -1 : 1) } }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <section className="community-hero page-enter">
        <button className="back" onClick={() => navigate('/socials')} aria-label="Back"><ArrowLeft size={20} /></button>
        <div className="emoji" aria-hidden="true">{c.emoji}</div>
        <h1>{c.name}</h1>
        <p>{c.description}</p>
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <span className="hero-pill"><Users size={14} /> {c.members.toLocaleString()} {t('common.members')}</span>
          <span className="hero-pill"><Globe size={14} /> {t('socials.public')}</span>
          <button className="hero-pill" onClick={toggle} disabled={busy} style={{ background: c.joined ? 'rgba(255,255,255,0.18)' : '#fff', color: c.joined ? '#fff' : 'var(--primary)' }}>
            {c.joined ? t('common.joined') : t('common.join')}
          </button>
        </div>
      </section>

      <div className="section-title">
        <h2>{t('socials.topContributors')}</h2>
        {topContributors.length > 0 && <button className="link" onClick={() => setAllContributors(true)}>{t('common.seeAll')}</button>}
      </div>
      {topContributors.length === 0 ? (
        <p className="small text-2">Post in this community to appear here.</p>
      ) : (
        <div className="contributors">
          {topContributors.map((p, i) => (
            <button key={p.id} className="contributor plain-btn" style={{ textAlign: 'center' }} onClick={() => setOpenUser(p.id)}>
              {MEDALS[i] && <span className="medal" aria-hidden="true">{MEDALS[i]}</span>}
              <Avatar user={p} />
              <span className="bold truncate" style={{ maxWidth: 72 }}>{p.name.split(' ')[0]}</span>
              <span className="tiny muted">{p.points} {t('socials.pts')}</span>
            </button>
          ))}
        </div>
      )}

      <div className="section-title"><h2>{t('socials.posts')}</h2></div>
      <Feed communityId={c.id} onCompose={() => setComposer(true)} />

      <UserSheet userId={openUser} onClose={() => setOpenUser(null)} />
      <Modal open={allContributors} onClose={() => setAllContributors(false)} title={t('socials.topContributors')}>
        <div className="list-card">
          {topContributors.map((p, i) => (
            <button key={p.id} className="list-item" onClick={() => { setAllContributors(false); setOpenUser(p.id); }}>
              <span className="bold" style={{ width: 22, textAlign: 'center' }}>{MEDALS[i] || i + 1}</span>
              <Avatar user={p} size="sm" />
              <span className="grow bold truncate">{p.name}</span>
              <span className="small bold" style={{ color: 'var(--primary)' }}>{p.points} {t('socials.pts')}</span>
            </button>
          ))}
        </div>
      </Modal>
      <button className="fab" onClick={() => setComposer(true)} aria-label={t('socials.createPost')}><PenSquare size={22} /></button>
      <CreatePostSheet
        open={composer}
        communityId={c.id}
        onClose={() => setComposer(false)}
        onPosted={() => {
          window.dispatchEvent(new Event('mystudyai:posted'));
          data.reload({ silent: true });
        }}
      />
    </Page>
  );
}
