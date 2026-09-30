/** Socials - Study Feed (posts from every student) and Communities (join / leave / open). */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, Users as UsersIcon, ImagePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { socialApi, getErrorMessage } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { Avatar } from '../components/Brand';
import { Tabs } from '../components/Ui';
import { PostCard, CreatePostSheet, UserSheet } from '../components/Social';
import { ErrorState, SkeletonList, EmptyState } from '../components/Feedback';
import Button from '../components/Button';

export default function SocialsScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState('feed');
  const [composer, setComposer] = useState(false);

  return (
    <Page>
      <header className="top-bar">
        <Avatar user={user} />
        <div className="grow name">{t('socials.title')}</div>
        <button className="icon-btn primary" onClick={() => setComposer(true)} aria-label={t('socials.createPost')}>
          <PenSquare size={19} />
        </button>
      </header>

      <Tabs tabs={[{ value: 'feed', label: t('socials.feed') }, { value: 'communities', label: t('socials.communities') }]} value={tab} onChange={setTab} />

      {tab === 'feed' ? <Feed key="feed" onCompose={() => setComposer(true)} /> : <Communities key="communities" />}

      <CreatePostSheet open={composer} onClose={() => setComposer(false)} onPosted={() => window.dispatchEvent(new Event('mystudyai:posted'))} />
    </Page>
  );
}

export function Feed({ communityId, onCompose }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const feed = useApi(() => socialApi.feed({ communityId }), [communityId]);
  const [openUser, setOpenUser] = useState(null);
  const posts = feed.data?.posts;

  // Refresh after a new post from the composer
  const { reload } = feed;
  useEffect(() => {
    const onPosted = () => reload({ silent: true });
    window.addEventListener('mystudyai:posted', onPosted);
    return () => window.removeEventListener('mystudyai:posted', onPosted);
  }, [reload]);

  const update = (p) => feed.setData((d) => ({ posts: d.posts.map((x) => (x.id === p.id ? p : x)) }));
  const removed = (id) => feed.setData((d) => ({ posts: d.posts.filter((x) => x.id !== id) }));

  return (
    <div className="stack">
      <button className="composer" onClick={onCompose}>
        <Avatar user={user} size="sm" />
        <span className="grow">{t('socials.mind')}</span>
        <ImagePlus size={20} className="img-ic" />
      </button>
      {feed.loading ? (
        <SkeletonList count={3} height={140} />
      ) : feed.error ? (
        <ErrorState message={feed.error} onRetry={feed.reload} />
      ) : posts.length === 0 ? (
        <EmptyState icon={PenSquare} title={t('socials.noPosts')} />
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} onChange={update} onDeleted={removed} onOpenUser={setOpenUser} />)
      )}
      <UserSheet userId={openUser} onClose={() => setOpenUser(null)} />
    </div>
  );
}

function Communities() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const list = useApi(() => socialApi.communities(), []);
  const [busy, setBusy] = useState(null);

  const toggle = async (c) => {
    setBusy(c.id);
    try {
      await socialApi.toggleMembership(c.id, c.joined);
      list.setData((d) => d.map((x) => (x.id === c.id ? { ...x, joined: !c.joined, members: x.members + (c.joined ? -1 : 1) } : x)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (list.loading) return <SkeletonList count={4} height={78} />;
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;

  const mine = list.data.filter((c) => c.joined);
  const others = list.data.filter((c) => !c.joined);

  const row = (c) => (
    <div key={c.id} className="card community-row clickable" onClick={() => navigate(`/socials/c/${c.slug}`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/socials/c/${c.slug}`)}>
      <span className="emoji" aria-hidden="true">{c.emoji}</span>
      <span className="grow">
        <span className="bold" style={{ display: 'block' }}>{c.name}</span>
        <span className="tiny text-2 clamp-2" style={{ display: 'block' }}>{c.description}</span>
        <span className="tiny muted row" style={{ gap: 4, marginTop: 2 }}><UsersIcon size={12} /> {c.members.toLocaleString()} {t('common.members')}</span>
      </span>
      <Button
        size="sm"
        className={`join-btn ${c.joined ? 'joined' : ''}`}
        variant={c.joined ? 'soft' : 'primary'}
        loading={busy === c.id}
        onClick={(e) => {
          e.stopPropagation();
          toggle(c);
        }}
      >
        {c.joined ? t('common.joined') : t('common.join')}
      </Button>
    </div>
  );

  return (
    <div className="stagger">
      {mine.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 6 }}><h2>{t('socials.yourCommunities')}</h2></div>
          <div className="stack">{mine.map(row)}</div>
        </>
      )}
      <div className="section-title"><h2>{t('socials.discover')}</h2></div>
      <div className="stack">{others.map(row)}</div>
    </div>
  );
}
