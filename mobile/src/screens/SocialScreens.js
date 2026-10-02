/** Socials (Study Feed + Communities) and a single Community screen. */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Globe, ImagePlus, PenSquare, Users as UsersIcon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useApi } from '../hooks/useApi';
import { getErrorMessage, socialApi } from '../services/api';
import Screen, { SectionHeader } from '../components/Screen';
import { Avatar } from '../components/Brand';
import { Button, Card, EmptyState, ErrorState, IconButton, Row, Sheet, SkeletonList, Tabs, Txt } from '../components/Ui';
import { CreatePostSheet, PostCard, UserSheet } from '../components/Social';

// Tiny pub/sub so the composer can tell a feed to refresh
const listeners = new Set();
export const notifyPosted = () => listeners.forEach((fn) => fn());

export function Feed({ communityId, onCompose }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { colors } = useTheme();
  const feed = useApi(() => socialApi.feed({ communityId }), [communityId]);
  const [openUser, setOpenUser] = useState(null);
  const posts = feed.data?.posts;

  const { reload } = feed;
  useEffect(() => {
    const fn = () => reload({ silent: true });
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, [reload]);

  const update = (p) => feed.setData((d) => ({ posts: d.posts.map((x) => (x.id === p.id ? p : x)) }));
  const removed = (id) => feed.setData((d) => ({ posts: d.posts.filter((x) => x.id !== id) }));

  return (
    <View style={{ gap: 12 }}>
      <Pressable onPress={onCompose} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
        <Avatar user={user} size={36} />
        <Txt color="muted" style={{ flex: 1 }}>{t('socials.mind')}</Txt>
        <ImagePlus size={20} color={colors.primary} />
      </Pressable>
      {feed.loading && !posts ? <SkeletonList count={3} height={140} /> : feed.error && !posts ? <ErrorState message={feed.error} onRetry={feed.reload} /> : posts.length === 0 ? <EmptyState icon={PenSquare} title={t('socials.noPosts')} /> : (
        posts.map((p) => <PostCard key={p.id} post={p} onChange={update} onDeleted={removed} onOpenUser={setOpenUser} />)
      )}
      <UserSheet userId={openUser} onClose={() => setOpenUser(null)} />
    </View>
  );
}

function Communities() {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
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

  if (list.loading && !list.data) return <SkeletonList count={4} height={78} />;
  if (list.error && !list.data) return <ErrorState message={list.error} onRetry={list.reload} />;

  const mine = list.data.filter((c) => c.joined);
  const others = list.data.filter((c) => !c.joined);

  const row = (c) => (
    <Card key={c.id} onPress={() => navigation.navigate('Community', { slug: c.slug })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Txt size="hero">{c.emoji}</Txt>
      <View style={{ flex: 1 }}>
        <Txt bold>{c.name}</Txt>
        <Txt size="xs" color="text2" numberOfLines={2}>{c.description}</Txt>
        <Row gap={4} style={{ marginTop: 2 }}><UsersIcon size={12} color={colors.muted} /><Txt size="xs" color="muted">{c.members.toLocaleString()} {t('common.members')}</Txt></Row>
      </View>
      <Button size="sm" variant={c.joined ? 'soft' : 'primary'} loading={busy === c.id} onPress={() => toggle(c)}>{c.joined ? t('common.joined') : t('common.join')}</Button>
    </Card>
  );

  return (
    <View style={{ gap: 12 }}>
      {mine.length > 0 ? <><SectionHeader title={t('socials.yourCommunities')} />{mine.map(row)}</> : null}
      <SectionHeader title={t('socials.discover')} />
      {others.map(row)}
    </View>
  );
}

export function SocialsScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [tab, setTab] = useState('feed');
  const [composer, setComposer] = useState(false);

  return (
    <Screen header={false}>
      <Row>
        <Avatar user={user} />
        <Txt size="xl" bold style={{ flex: 1 }}>{t('socials.title')}</Txt>
        <IconButton icon={PenSquare} bg={colors.primary} color="#fff" onPress={() => setComposer(true)} label={t('socials.createPost')} />
      </Row>
      <Tabs tabs={[{ value: 'feed', label: t('socials.feed') }, { value: 'communities', label: t('socials.communities') }]} value={tab} onChange={setTab} />
      {tab === 'feed' ? <Feed key="feed" onCompose={() => setComposer(true)} /> : <Communities key="communities" />}
      <CreatePostSheet open={composer} onClose={() => setComposer(false)} onPosted={notifyPosted} />
    </Screen>
  );
}

const MEDALS = ['👑', '🥈', '🥉'];

export function CommunityScreen() {
  const { slug } = useRoute().params;
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const data = useApi(() => socialApi.community(slug), [slug]);
  const [composer, setComposer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openUser, setOpenUser] = useState(null);
  const [allContributors, setAllContributors] = useState(false);

  if (data.loading && !data.data) return <Screen title="Community" back><SkeletonList count={1} height={260} /></Screen>;
  if (data.error && !data.data) return <Screen title="Community" back><ErrorState message={data.error} onRetry={data.reload} /></Screen>;
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

  const pill = { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 };

  return (
    <Screen header={false}>
      <View style={{ backgroundColor: colors.primary, borderRadius: 24, padding: 18, gap: 8, alignItems: 'center' }}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Back" style={{ position: 'absolute', left: 14, top: 14, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}><ArrowLeft size={20} color="#fff" /></Pressable>
        <Txt style={{ fontSize: 48, marginTop: 24 }}>{c.emoji}</Txt>
        <Txt size="h1" bold color="#fff" center>{c.name}</Txt>
        <Txt color="#dbeafe" center>{c.description}</Txt>
        <Row wrap gap={8} style={{ justifyContent: 'center', marginTop: 4 }}>
          <View style={pill}><UsersIcon size={14} color="#fff" /><Txt size="sm" bold color="#fff">{c.members.toLocaleString()} {t('common.members')}</Txt></View>
          <View style={pill}><Globe size={14} color="#fff" /><Txt size="sm" bold color="#fff">{t('socials.public')}</Txt></View>
          <Pressable onPress={toggle} disabled={busy} style={[pill, { backgroundColor: c.joined ? 'rgba(255,255,255,0.18)' : '#fff' }]}><Txt size="sm" bold color={c.joined ? '#fff' : colors.primary}>{c.joined ? t('common.joined') : t('common.join')}</Txt></Pressable>
        </Row>
      </View>

      <SectionHeader title={t('socials.topContributors')} action={topContributors.length ? t('common.seeAll') : undefined} onAction={() => setAllContributors(true)} />
      {topContributors.length === 0 ? <Txt size="sm" color="text2">Post in this community to appear here.</Txt> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
          {topContributors.map((p, i) => (
            <Pressable key={p.id} onPress={() => setOpenUser(p.id)} style={{ alignItems: 'center', gap: 4, width: 76 }}>
              {MEDALS[i] ? <Txt size="lg">{MEDALS[i]}</Txt> : <View style={{ height: 24 }} />}
              <Avatar user={p} />
              <Txt size="sm" bold numberOfLines={1}>{p.name.split(' ')[0]}</Txt>
              <Txt size="xs" color="muted">{p.points} {t('socials.pts')}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <SectionHeader title={t('socials.posts')} />
      <Feed communityId={c.id} onCompose={() => setComposer(true)} />

      <UserSheet userId={openUser} onClose={() => setOpenUser(null)} />
      <Sheet open={allContributors} onClose={() => setAllContributors(false)} title={t('socials.topContributors')}>
        <ScrollView style={{ maxHeight: 360 }}>
          {topContributors.map((p, i) => (
            <Pressable key={p.id} onPress={() => { setAllContributors(false); setOpenUser(p.id); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
              <Txt bold style={{ width: 26, textAlign: 'center' }}>{MEDALS[i] || i + 1}</Txt>
              <Avatar user={p} size={36} />
              <Txt bold style={{ flex: 1 }} numberOfLines={1}>{p.name}</Txt>
              <Txt size="sm" bold color="primary">{p.points} {t('socials.pts')}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
      <CreatePostSheet open={composer} communityId={c.id} onClose={() => setComposer(false)} onPosted={() => { notifyPosted(); data.reload({ silent: true }); }} />
    </Screen>
  );
}
