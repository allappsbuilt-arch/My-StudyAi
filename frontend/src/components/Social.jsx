/** Socials building blocks: post card, create-post sheet, comments sheet. */
import { useEffect, useRef, useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ImagePlus, X, Trash2, Send } from 'lucide-react';
import { socialApi, getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Brand';
import Modal from './Modal';
import Button from './Button';
import { Spinner } from './Feedback';
import { timeAgo } from '../utils/format';

export function PostCard({ post, onChange, onDeleted, onOpenUser }) {
  const toast = useToast();
  const { t } = useI18n();
  const [menu, setMenu] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const like = async () => {
    const next = { ...post, likedByMe: !post.likedByMe, likes: post.likes + (post.likedByMe ? -1 : 1) };
    onChange(next); // optimistic
    try {
      await socialApi.toggleLike(post.id, post.likedByMe);
    } catch (err) {
      onChange(post);
      toast.error(getErrorMessage(err));
    }
  };

  const share = async () => {
    const text = `${post.author.name} on MyStudyAI: ${post.content}`.slice(0, 500);
    try {
      if (navigator.share) await navigator.share({ title: 'MyStudyAI', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t('common.copied'));
      }
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

  return (
    <article className="card post-card pop-in">
      <div className="post-head">
        <button className="plain-btn" onClick={() => onOpenUser?.(post.author.id)} aria-label={`View ${post.author.name}`}>
          <Avatar user={post.author} size="sm" />
        </button>
        <div className="grow">
          <button className="plain-btn who truncate" onClick={() => onOpenUser?.(post.author.id)}>{post.author.name}</button>
          <div className="when">
            {timeAgo(post.createdAt)}
            {post.communityName && ` · ${post.communityName}`}
          </div>
        </div>
        {post.isMine && (
          <div style={{ position: 'relative' }}>
            <button className="icon-btn plain sm" onClick={() => setMenu((m) => !m)} aria-label="Post options">
              <MoreHorizontal size={20} />
            </button>
            {menu && (
              <div className="card" style={{ position: 'absolute', right: 0, top: 38, padding: 6, zIndex: 5, minWidth: 170 }}>
                <button className="list-item" style={{ color: 'var(--danger)' }} onClick={remove} disabled={busy}>
                  <Trash2 size={16} /> {t('socials.deletePost')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {post.content && <div className="post-body">{post.content}</div>}
      {post.imageUrl && <img className="post-image" src={post.imageUrl} alt="" loading="lazy" />}
      <div className="post-actions">
        <button className={post.likedByMe ? 'liked' : ''} onClick={like} aria-pressed={post.likedByMe} aria-label="Like">
          <Heart size={19} /> {post.likes}
        </button>
        <button onClick={() => setCommentsOpen(true)} aria-label={t('socials.comments')}>
          <MessageCircle size={19} /> {post.comments}
        </button>
        <button onClick={share} aria-label="Share">
          <Share2 size={18} />
        </button>
      </div>
      <CommentsSheet open={commentsOpen} post={post} onClose={() => setCommentsOpen(false)} onCount={(n) => onChange({ ...post, comments: n })} />
    </article>
  );
}

function CommentsSheet({ open, post, onClose, onCount }) {
  const { t } = useI18n();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setList(null);
    socialApi.comments(post.id).then(setList).catch((err) => {
      toast.error(getErrorMessage(err));
      setList([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post.id]);

  const send = async (e) => {
    e.preventDefault();
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
    <Modal open={open} onClose={onClose} title={t('socials.comments')}>
      <div className="stack" style={{ maxHeight: '50dvh', overflowY: 'auto' }}>
        {list === null ? (
          <div className="center" style={{ padding: 20 }}><Spinner /></div>
        ) : list.length === 0 ? (
          <p className="small text-2 center">No comments yet.</p>
        ) : (
          list.map((c) => (
            <div key={c.id} className="row" style={{ alignItems: 'flex-start' }}>
              <Avatar user={c.author} size="sm" />
              <div className="grow" style={{ background: 'var(--surface-2)', borderRadius: 14, padding: '8px 12px' }}>
                <div className="small bold">{c.author.name} <span className="tiny muted" style={{ fontWeight: 400 }}>· {timeAgo(c.createdAt)}</span></div>
                <div className="small" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.content}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <form className="chat-input" onSubmit={send} style={{ marginTop: 14 }}>
        <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('socials.writeComment')} maxLength={1000} aria-label={t('socials.writeComment')} />
        <button type="submit" className="icon-btn primary" disabled={sending || !text.trim()} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </Modal>
  );
}

export function CreatePostSheet({ open, onClose, onPosted, communityId }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) return toast.error('Images must be JPG, PNG, WEBP or GIF.');
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const close = () => {
    setText('');
    setImage(null);
    setPreview('');
    onClose();
  };

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
    <Modal
      open={open}
      onClose={close}
      title={t('socials.createPost')}
      footer={
        <>
          <Button variant="secondary" onClick={close}>{t('common.cancel')}</Button>
          <Button onClick={post} loading={posting} disabled={!text.trim() && !image}>{t('common.post')}</Button>
        </>
      }
    >
      <div className="row" style={{ marginBottom: 10 }}>
        <Avatar user={user} size="sm" />
        <span className="bold">{user?.name}</span>
      </div>
      <textarea className="composer-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={t('socials.mind')} maxLength={5000} aria-label={t('socials.mind')} />
      {preview && (
        <div className="thumb-preview" style={{ margin: '8px 0' }}>
          <img src={preview} alt="Selected" />
          <button onClick={() => { setImage(null); setPreview(''); }} aria-label="Remove image"><X size={14} /></button>
        </div>
      )}
      <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => fileRef.current?.click()}>
        <ImagePlus size={18} /> {t('socials.addImages')}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pick} />
    </Modal>
  );
}

/** Another student's profile card with Follow / Unfollow. */
export function UserSheet({ userId, onClose }) {
  const { t } = useI18n();
  const toast = useToast();
  const [card, setCard] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setCard(null);
    socialApi.userCard(userId).then(setCard).catch((err) => {
      toast.error(getErrorMessage(err));
      onClose();
    });
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

  return (
    <Modal open={Boolean(userId)} onClose={onClose} labelledBy="user-sheet-name">
      {!card ? (
        <div className="center" style={{ padding: 30 }}><Spinner /></div>
      ) : (
        <div className="profile-hero pop-in" style={{ paddingBottom: 0 }}>
          <Avatar user={card} size="xl" />
          <h2 id="user-sheet-name">{card.name}</h2>
          {card.handle && <div className="handle">{card.handle}</div>}
          {(card.school || card.educationLevel) && <div className="tiny text-2">{[card.educationLevel, card.school].filter(Boolean).join(' · ')}</div>}
          {card.isPrivate && !card.isMe && <div className="badge neutral" style={{ marginTop: 8 }}>🔒 {t('settings.private')}</div>}
          <div className="card stat-strip" style={{ width: '100%', marginTop: 14, display: card.isPrivate && !card.isMe && !card.iFollow ? 'none' : undefined }}>
            <div><span className="v">{card.posts}</span><span className="l">{t('profile.posts')}</span></div>
            <div><span className="v">{card.followers}</span><span className="l">{t('profile.followers')}</span></div>
            <div><span className="v">{card.following}</span><span className="l">{t('profile.following')}</span></div>
          </div>
          {!card.isMe && (
            <Button block variant={card.iFollow ? 'soft' : 'primary'} loading={busy} onClick={toggle} style={{ marginTop: 14 }}>
              {card.iFollow ? t('social.following') : t('social.follow')}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
