/** Socials building blocks: post card, create-post sheet, comments sheet, user card sheet. */
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Share, View } from 'react-native';
import { Heart, ImagePlus, MessageCircle, MoreHorizontal, Send, Share2, Trash2, X } from 'lucide-react-native';
import { socialApi, getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './Brand';
import { Badge, Button, Card, IconButton, Row, Sheet, Spinner, TextInput, Txt } from './Ui';
import { timeAgo } from '../utils/format';
import { pickImage } from '../utils/files';

export function PostCard({ post, onChange, onDeleted, onOpenUser }) {
  const toast = useToast();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [menu, setMenu] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const like = async () => {
    onChange({ ...post, likedByMe: !post.likedByMe, likes: post.likes + (post.likedByMe ? -1 : 1) }); // optimistic
    try {
      await socialApi.toggleLike(post.id, post.likedByMe);
    } catch (err) {
      onChange(post);
      toast.error(getErrorMessage(err));
    }
  };

  const share = async () => {
    try {
      await Share.share({ message: `${post.author.name} on MyStudyAI: ${post.content}`.slice(0, 500) });
    } catch { /* share sheet closed */ }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await socialApi.removePost(post.id);
      onDeleted(post.id);
      toast.success('Post deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy(false);
    }
  };

  const action = (liked) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 });

  return (
    <Card style={{ gap: 12 }}>
      <Row>
        <Pressable onPress={() => onOpenUser?.(post.author.id)}><Avatar user={post.author} size={40} /></Pressable>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => onOpenUser?.(post.author.id)}><Txt bold numberOfLines={1}>{post.author.name}</Txt></Pressable>
          <Txt size="xs" color="muted">{timeAgo(post.createdAt)}{post.communityName ? ` · ${post.communityName}` : ''}</Txt>
        </View>
        {post.isMine ? (
          <View>
            <IconButton icon={MoreHorizontal} size={36} bg="transparent" onPress={() => setMenu((m) => !m)} label="Post options" />
            {menu ? (
              <Pressable onPress={remove} disabled={busy} style={{ position: 'absolute', right: 0, top: 40, zIndex: 5, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center', minWidth: 160 }}>
                <Trash2 size={16} color={colors.danger} />
                <Txt color="danger" bold>{t('socials.deletePost')}</Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Row>
      {post.content ? <Txt>{post.content}</Txt> : null}
      {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.surface2 }} resizeMode="cover" /> : null}
      <Row gap={22}>
        <Pressable onPress={like} style={action()} accessibilityLabel="Like">
          <Heart size={20} color={post.likedByMe ? colors.danger : colors.text2} fill={post.likedByMe ? colors.danger : 'none'} />
          <Txt size="sm" color={post.likedByMe ? 'danger' : 'text2'} bold>{post.likes}</Txt>
        </Pressable>
        <Pressable onPress={() => setCommentsOpen(true)} style={action()} accessibilityLabel={t('socials.comments')}>
          <MessageCircle size={20} color={colors.text2} />
          <Txt size="sm" color="text2" bold>{post.comments}</Txt>
        </Pressable>
        <Pressable onPress={share} style={action()} accessibilityLabel="Share"><Share2 size={19} color={colors.text2} /></Pressable>
      </Row>
      <CommentsSheet open={commentsOpen} post={post} onClose={() => setCommentsOpen(false)} onCount={(n) => onChange({ ...post, comments: n })} />
    </Card>
  );
}

function CommentsSheet({ open, post, onClose, onCount }) {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setList(null);
    socialApi.comments(post.id).then(setList).catch((err) => { toast.error(getErrorMessage(err)); setList([]); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post.id]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await socialApi.addComment(post.id, text);
      const next = await socialApi.comments(post.id);
      setList(next);
      onCount(next.length);
      setText('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('socials.comments')}>
      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 12 }}>
        {list === null ? <View style={{ padding: 20 }}><Spinner /></View> : list.length === 0 ? <Txt size="sm" color="text2" center>No comments yet.</Txt> : list.map((c) => (
          <Row key={c.id} center={false}>
            <Avatar user={c.author} size={32} />
            <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 14, padding: 10 }}>
              <Txt size="sm" bold>{c.author.name} <Txt size="xs" color="muted">· {timeAgo(c.createdAt)}</Txt></Txt>
              <Txt size="sm">{c.content}</Txt>
            </View>
          </Row>
        ))}
      </ScrollView>
      <Row>
        <View style={{ flex: 1 }}><TextInput value={text} onChangeText={setText} placeholder={t('socials.writeComment')} maxLength={1000} /></View>
        <IconButton icon={Send} bg={colors.primary} color="#fff" onPress={send} label="Send" style={{ opacity: sending || !text.trim() ? 0.5 : 1 }} />
      </Row>
    </Sheet>
  );
}

export function CreatePostSheet({ open, onClose, onPosted, communityId }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);

  const pick = async () => {
    try {
      const f = await pickImage();
      if (!f) return;
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return toast.error('Images must be JPG, PNG, WEBP or GIF.');
      setImage(f);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const close = () => { setText(''); setImage(null); onClose(); };

  const post = async () => {
    setPosting(true);
    try {
      await socialApi.createPost({ content: text, image, communityId });
      toast.success('Posted!');
      close();
      onPosted();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title={t('socials.createPost')} footer={<><Button variant="secondary" onPress={close}>{t('common.cancel')}</Button><Button onPress={post} loading={posting} disabled={!text.trim() && !image}>{t('common.post')}</Button></>}>
      <Row><Avatar user={user} size={36} /><Txt bold>{user?.name}</Txt></Row>
      <TextInput multiline value={text} onChangeText={setText} placeholder={t('socials.mind')} maxLength={5000} />
      {image ? (
        <View style={{ width: 96, height: 96 }}>
          <Image source={{ uri: image.uri }} style={{ width: 96, height: 96, borderRadius: 12 }} />
          <Pressable onPress={() => setImage(null)} style={{ position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' }}><X size={14} color="#fff" /></Pressable>
        </View>
      ) : null}
      <Button variant="ghost" size="sm" icon={ImagePlus} onPress={pick}>{t('socials.addImages')}</Button>
    </Sheet>
  );
}

/** Another student's profile card with Follow / Unfollow. */
export function UserSheet({ userId, onClose }) {
  const { t } = useI18n();
  const toast = useToast();
  const { colors } = useTheme();
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setCard(null);
    socialApi.userCard(userId).then(setCard).catch((err) => { toast.error(getErrorMessage(err)); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggle = async () => {
    setBusy(true);
    try {
      await socialApi.toggleFollow(card.id, card.iFollow);
      setCard((c) => ({ ...c, iFollow: !c.iFollow, followers: c.followers + (c.iFollow ? -1 : 1) }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const hidden = card && card.isPrivate && !card.isMe && !card.iFollow;
  return (
    <Sheet open={Boolean(userId)} onClose={onClose}>
      {!card ? <View style={{ padding: 30 }}><Spinner /></View> : (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Avatar user={card} size={84} />
          <Txt size="h2" bold>{card.name}</Txt>
          {card.handle ? <Txt color="primary" bold>{card.handle}</Txt> : null}
          {card.school || card.educationLevel ? <Txt size="xs" color="text2">{[card.educationLevel, card.school].filter(Boolean).join(' · ')}</Txt> : null}
          {card.isPrivate && !card.isMe ? <Badge tone="muted">🔒 {t('settings.private')}</Badge> : null}
          {!hidden ? (
            <View style={{ flexDirection: 'row', width: '100%', marginTop: 12, backgroundColor: colors.surface2, borderRadius: 16, paddingVertical: 12 }}>
              {[[card.posts, t('profile.posts')], [card.followers, t('profile.followers')], [card.following, t('profile.following')]].map(([v, l]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}><Txt size="xl" bold>{v}</Txt><Txt size="xs" color="muted">{l}</Txt></View>
              ))}
            </View>
          ) : null}
          {!card.isMe ? <Button block variant={card.iFollow ? 'soft' : 'primary'} loading={busy} onPress={toggle} style={{ marginTop: 12 }}>{card.iFollow ? t('social.following') : t('social.follow')}</Button> : null}
        </View>
      )}
    </Sheet>
  );
}
