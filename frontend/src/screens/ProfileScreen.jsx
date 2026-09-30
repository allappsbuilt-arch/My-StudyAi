/** Profile - picture, name, handle, social stats, study statistics, and links (courses, history, settings...). */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, BookOpen, History, Bell, Settings, HelpCircle, LogOut, ChevronRight, Clock, Layers, GraduationCap, Trophy, Flame, Users, Share2, Trash2, BarChart3, Pencil,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';
import { userApi, getErrorMessage, handleOf } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Page } from '../navigation/AppLayout';
import { Avatar } from '../components/Brand';
import { ConfirmDialog } from '../components/Modal';
import { Spinner, Skeleton } from '../components/Feedback';
import { formatDate, formatMinutes } from '../utils/format';

export default function ProfileScreen() {
  const { user, logout, setUser, skipLogin } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data, loading } = useApi(() => userApi.getProfile(), []);
  const stats = data?.stats;
  const handle = user?.email || user?.preferences?.username ? handleOf(user) : '@guest_student';

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await userApi.uploadAvatar(file);
      setUser(res.user);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const removePicture = async () => {
    try {
      const res = await userApi.updateProfile({ removeAvatar: true });
      setUser(res.user);
      toast.success('Profile picture removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const share = async () => {
    const text = `I'm studying with MyStudyAI - ${stats?.streak || 0} day streak!`;
    try {
      if (navigator.share) await navigator.share({ title: 'MyStudyAI', text });
      else {
        await navigator.clipboard.writeText(text);
        toast.success(t('common.copied'));
      }
    } catch { /* closed */ }
  };

  const doLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  const LINKS = [
    { to: '/profile/courses', label: t('profile.courses'), icon: BookOpen },
    { to: '/progress', label: t('f.analytics'), icon: BarChart3 },
    { to: '/profile/history', label: t('profile.history'), icon: History },
    { to: '/profile/notifications', label: t('profile.notifications'), icon: Bell },
    { to: '/profile/settings', label: t('profile.settings'), icon: Settings },
    { to: '/profile/help', label: t('profile.help'), icon: HelpCircle },
  ];

  const STAT_CELLS = [
    { icon: Clock, v: stats ? formatMinutes(stats.studyTime) : '–', l: t('profile.studyTime') },
    { icon: Layers, v: stats?.cards ?? '–', l: t('profile.cards') },
    { icon: GraduationCap, v: stats?.quizzesCompleted ?? '–', l: t('profile.quizzes') },
    { icon: Trophy, v: stats ? `${Math.round(stats.averageScore)}%` : '–', l: t('profile.avgScore') },
    { icon: Flame, v: stats ? `${stats.streak}d` : '–', l: t('profile.streak') },
    { icon: Users, v: data?.social?.following ?? '–', l: t('profile.following') },
  ];

  return (
    <Page>
      <div className="profile-top-actions">
        <button className="icon-btn" onClick={() => navigate('/profile/settings')} aria-label={t('profile.settings')}><Settings size={20} /></button>
        <button className="icon-btn" onClick={share} aria-label="Share"><Share2 size={19} /></button>
      </div>

      <div className="profile-hero pop-in">
        <div className="avatar-edit">
          <Avatar user={user} size="xl" />
          <button className="icon-btn primary sm" onClick={() => fileRef.current?.click()} aria-label="Change profile picture" disabled={uploading}>
            {uploading ? <Spinner /> : <Camera size={16} />}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
        </div>
        <h2>{user?.name}</h2>
        <div className="handle">{handle}</div>
        <div className="row wrap" style={{ gap: 8, justifyContent: 'center', marginTop: 6 }}>
          {user?.educationLevel && <span className="badge">{user.educationLevel}</span>}
          <span className="badge neutral">Member since {formatDate(user?.createdAt, { month: 'short', year: 'numeric' })}</span>
        </div>
        <div className="tiny text-2">
          {data?.social?.posts ?? 0} {t('profile.posts')} · {data?.social?.communities ?? 0} {t('profile.communities')}
          {user?.preferences?.school ? ` · ${user.preferences.school}` : ''}
        </div>
        {user?.avatarUrl && (
          <button className="btn ghost sm" onClick={removePicture}>
            <Trash2 size={14} /> Remove picture
          </button>
        )}
      </div>

      <div className="card stat-strip">
        <div><span className="v">{stats?.streak ?? 0}</span><span className="l">{t('profile.streak')}</span></div>
        <div><span className="v">{data?.social?.followers ?? 0}</span><span className="l">{t('profile.followers')}</span></div>
        <div><span className="v">{data?.social?.following ?? 0}</span><span className="l">{t('profile.following')}</span></div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginBottom: 16 }}>{t('profile.studyStats')}</h3>
        {loading ? (
          <Skeleton height={140} />
        ) : (
          <div className="stat3">
            {STAT_CELLS.map((s) => (
              <div key={s.l} className="cell">
                <span className="icon-tile sm"><s.icon size={18} /></span>
                <span className="v">{s.v}</span>
                <span className="l">{s.l}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card list-card" style={{ marginTop: 14 }}>
        {LINKS.map((l) => (
          <button key={l.to} className="list-item" onClick={() => navigate(l.to)}>
            <span className="icon-tile sm"><l.icon size={18} /></span>
            <span className="grow bold">{l.label}</span>
            <ChevronRight size={18} className="chev" />
          </button>
        ))}
      </div>

      {!skipLogin && (
      <div className="card list-card" style={{ marginTop: 14 }}>
        <button className="list-item" onClick={() => setConfirmLogout(true)} style={{ color: 'var(--danger)' }}>
          <span className="icon-tile sm danger"><LogOut size={18} /></span>
          <span className="grow bold">{t('profile.logout')}</span>
        </button>
      </div>
      )}

      <button className="fab" onClick={() => navigate('/profile/settings')} aria-label={t('profile.edit')}>
        <Pencil size={22} />
      </button>

      <ConfirmDialog
        open={confirmLogout}
        title={`${t('profile.logout')}?`}
        message="You’ll need to log in again to access your study materials."
        confirmLabel={t('profile.logout')}
        loading={loggingOut}
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </Page>
  );
}
