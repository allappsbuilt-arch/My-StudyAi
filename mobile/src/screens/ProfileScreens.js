/** Profile, Settings, My Courses, Study History, Notifications, Help & Support. */
import { useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AlertTriangle, AtSign, Award, BarChart3, Bell, BellRing, Brain, BookOpen, Camera, Check, CheckCircle2, ChevronDown, Circle, Clock, Download, Eye, FileUp, Flame, Gamepad2, GraduationCap,
  Globe, HelpCircle, History, Layers, ListChecks, Lock, LogOut, Mail, MessageCircle, Moon, NotebookPen, Pencil, School, Settings as SettingsIcon, Share2, Sparkles, StickyNote, Trash2, Trophy, User, Users,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { LANGUAGES, useI18n } from '../context/I18nContext';
import { dataApi, getErrorMessage, handleOf, materialApi, progressApi, quizApi, userApi } from '../services/api';
import { useApi } from '../hooks/useApi';
import Screen from '../components/Screen';
import { Avatar } from '../components/Brand';
import { Alert, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorState, Field, GroupTitle, IconButton, IconTile, ListRow, PasswordInput, Row, Select, SkeletonList, Spinner, Switch, TextInput, Txt } from '../components/Ui';
import { formatDate, formatDateTime, formatMinutes, timeAgo } from '../utils/format';
import { EDUCATION_LEVELS, SUBJECTS } from '../utils/constants';
import { pickImage } from '../utils/files';

/* ---------------------------------------------------------------- profile */
export function ProfileScreen() {
  const { user, logout, setUser, skipLogin } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [uploading, setUploading] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data, loading } = useApi(() => userApi.getProfile(), []);
  const stats = data?.stats;
  const handle = user?.email || user?.preferences?.username ? handleOf(user) : '@guest_student';
  const go = (n) => navigation.navigate(n);

  const changePicture = async () => {
    try {
      const file = await pickImage();
      if (!file) return;
      setUploading(true);
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

  const share = () => Share.share({ message: `I'm studying with MyStudyAI - ${stats?.streak || 0} day streak!` }).catch(() => {});

  const doLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const LINKS = [
    { to: 'Courses', label: t('profile.courses'), icon: BookOpen },
    { to: 'Progress', label: t('f.analytics'), icon: BarChart3 },
    { to: 'StudyHistory', label: t('profile.history'), icon: History },
    { to: 'Notifications', label: t('profile.notifications'), icon: Bell },
    { to: 'Settings', label: t('profile.settings'), icon: SettingsIcon },
    { to: 'Help', label: t('profile.help'), icon: HelpCircle },
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
    <Screen title={t('nav.profile')} back actions={<Row><IconButton icon={SettingsIcon} onPress={() => go('Settings')} label={t('profile.settings')} /><IconButton icon={Share2} onPress={share} label="Share" /></Row>}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View>
          <Avatar user={user} size={96} />
          <Pressable onPress={changePicture} disabled={uploading} accessibilityLabel="Change profile picture" style={{ position: 'absolute', right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            {uploading ? <Spinner /> : <Camera size={16} color="#fff" />}
          </Pressable>
        </View>
        <Txt size="h2" bold>{user?.name}</Txt>
        <Txt bold color="primary">{handle}</Txt>
        <Row wrap gap={8} style={{ justifyContent: 'center' }}>
          {user?.educationLevel ? <Badge>{user.educationLevel}</Badge> : null}
          <Badge tone="muted">Member since {formatDate(user?.createdAt, { month: 'short', year: 'numeric' })}</Badge>
        </Row>
        <Txt size="xs" color="text2">
          {data?.social?.posts ?? 0} {t('profile.posts')} · {data?.social?.communities ?? 0} {t('profile.communities')}{user?.preferences?.school ? ` · ${user.preferences.school}` : ''}
        </Txt>
        {user?.avatarUrl ? <Button variant="ghost" size="sm" icon={Trash2} onPress={removePicture}>Remove picture</Button> : null}
      </View>

      <Card style={{ flexDirection: 'row' }}>
        {[[stats?.streak ?? 0, t('profile.streak')], [data?.social?.followers ?? 0, t('profile.followers')], [data?.social?.following ?? 0, t('profile.following')]].map(([v, l]) => (
          <View key={l} style={{ flex: 1, alignItems: 'center' }}><Txt size="h2" bold>{v}</Txt><Txt size="xs" color="muted">{l}</Txt></View>
        ))}
      </Card>

      <Card style={{ gap: 14 }}>
        <Txt size="lg" bold>{t('profile.studyStats')}</Txt>
        {loading ? <SkeletonList count={1} height={140} /> : (
          <Row wrap gap={0} center={false}>
            {STAT_CELLS.map((s) => (
              <View key={s.l} style={{ width: '33.33%', alignItems: 'center', gap: 4, paddingVertical: 8 }}>
                <IconTile icon={s.icon} size={36} />
                <Txt bold>{s.v}</Txt>
                <Txt size="xs" color="muted" center>{s.l}</Txt>
              </View>
            ))}
          </Row>
        )}
      </Card>

      <Card padded={false}>
        {LINKS.map((l, i) => <ListRow key={l.to} first={i === 0} icon={l.icon} title={l.label} onPress={() => go(l.to)} />)}
      </Card>

      {!skipLogin ? <Card padded={false}><ListRow first icon={LogOut} danger title={t('profile.logout')} onPress={() => setConfirmLogout(true)} right={null} /></Card> : null}

      <ConfirmDialog open={confirmLogout} title={`${t('profile.logout')}?`} message="You'll need to log in again to access your study materials." confirmLabel={t('profile.logout')} loading={loggingOut} onConfirm={doLogout} onCancel={() => setConfirmLogout(false)} />
    </Screen>
  );
}

/* ---------------------------------------------------------------- settings */
const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

export function SettingsScreen() {
  const { user, updateUser, skipLogin } = useAuth();
  const { isDark, setTheme, colors } = useTheme();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.preferences?.username || '');
  const [school, setSchool] = useState(user?.preferences?.school || '');
  const [exporting, setExporting] = useState(false);
  const prefs = user?.preferences || {};
  const [level, setLevel] = useState(user?.educationLevel || '');
  const [subjects, setSubjects] = useState(user?.preferences?.subjects || []);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const savePref = async (p) => {
    try { await updateUser({ preferences: p }); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const toggleDark = (value) => { setTheme(value ? 'dark' : 'light'); savePref({ darkMode: value }); };
  const changeLanguage = (code) => { setLang(code); savePref({ language: code }); toast.success(LANGUAGES.find((l) => l.code === code)?.native); };

  const saveProfile = async () => {
    if (name.trim().length < 2) return setProfileError('Name must be at least 2 characters.');
    setSavingProfile(true);
    setProfileError('');
    try {
      if (username && !/^[a-z0-9_.]{3,30}$/.test(username)) throw new Error('Username: 3-30 characters, lowercase letters, numbers, _ or .');
      await updateUser({ name: name.trim(), educationLevel: level || null, preferences: { subjects, username, school: school.trim() } });
      toast.success('Profile saved');
    } catch (err) {
      setProfileError(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
    return undefined;
  };

  const changePassword = async () => {
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Enter your current password.';
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) errs.newPassword = 'Use 8+ characters with letters and numbers.';
    if (pw.confirm !== pw.newPassword) errs.confirm = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingPw(true);
    setPwError('');
    try {
      await updateUser({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed');
    } catch (err) {
      setPwError(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <Screen title={t('settings.title')} back>
      <GroupTitle>{t('settings.appearance')}</GroupTitle>
      <Card padded={false}><ListRow first icon={Moon} title={t('settings.darkMode')} right={<Switch checked={isDark} onChange={toggleDark} />} /></Card>

      <GroupTitle>{t('settings.language')}</GroupTitle>
      <Card padded={false}>
        {LANGUAGES.map((l, i) => <ListRow key={l.code} first={i === 0} icon={Globe} title={l.native} desc={l.label} onPress={() => changeLanguage(l.code)} right={lang === l.code ? <Check size={20} color={colors.primary} /> : null} />)}
      </Card>

      <GroupTitle>{t('settings.notifications')}</GroupTitle>
      <Card padded={false}>
        <ListRow first icon={BellRing} title={t('settings.push')} right={<Switch checked={Boolean(prefs.pushNotifications)} onChange={(v) => savePref({ pushNotifications: v })} />} />
        <ListRow icon={Bell} title={t('settings.reminders')} right={<Switch checked={Boolean(prefs.studyReminders)} onChange={(v) => savePref({ studyReminders: v })} />} />
        <ListRow icon={Flame} title={t('settings.streakAlerts')} right={<Switch checked={Boolean(prefs.streakAlerts)} onChange={(v) => savePref({ streakAlerts: v })} />} />
        <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Select label={t('settings.reminderTime')} value={prefs.reminderTime || '18:00'} onChange={(v) => savePref({ reminderTime: v })} options={TIME_SLOTS} />
        </View>
      </Card>

      <GroupTitle>{t('settings.privacy')}</GroupTitle>
      <Card padded={false}>
        <View style={{ padding: 14 }}>
          <Select label={t('settings.visibility')} value={prefs.profileVisibility || 'public'} onChange={(v) => savePref({ profileVisibility: v })} options={[{ value: 'public', label: t('settings.public') }, { value: 'private', label: t('settings.private') }]} />
        </View>
        <ListRow icon={BarChart3} title={t('settings.showStats')} right={<Switch checked={Boolean(prefs.showStudyStats)} onChange={(v) => savePref({ showStudyStats: v })} />} />
        <ListRow icon={Circle} title={t('settings.showOnline')} right={<Switch checked={Boolean(prefs.showOnlineStatus)} onChange={(v) => savePref({ showOnlineStatus: v })} />} />
      </Card>

      <GroupTitle>{t('settings.data')}</GroupTitle>
      <Card padded={false}>
        <ListRow first icon={Download} title={t('settings.export')} right={<Txt size="xs" color="muted">JSON</Txt>} disabled={exporting}
          onPress={async () => { setExporting(true); try { await dataApi.exportAll(); toast.success('Export ready'); } catch (err) { toast.error(getErrorMessage(err)); } finally { setExporting(false); } }} />
        <ListRow icon={Trash2} title={t('settings.clearCache')} right={null} onPress={async () => { const n = await dataApi.clearLocalCache(); toast.success(`${t('settings.cacheCleared')} (${n})`); }} />
      </Card>

      <GroupTitle>{t('settings.account')}</GroupTitle>
      <Card style={{ gap: 14 }}>
        {profileError ? <Alert>{profileError}</Alert> : null}
        <TextInput label="Full name" icon={User} value={name} onChangeText={setName} maxLength={100} />
        <TextInput label="MyStudy ID (Username)" icon={AtSign} autoCapitalize="none" value={username} onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30))} hint="Your unique @username on MyStudyAI" />
        <TextInput label="School or Institution" icon={School} value={school} onChangeText={setSchool} maxLength={120} />
        {user?.email ? <TextInput label="Email" icon={Mail} value={user.email} editable={false} hint="Email can't be changed." /> : null}
        <Select label="Education level" value={level} onChange={setLevel} options={EDUCATION_LEVELS} placeholder="Not set" />
        <Field label="My subjects">
          <Row wrap gap={8}>
            {[...new Set([...SUBJECTS, ...subjects])].map((s) => <Chip key={s} label={s} selected={subjects.includes(s)} onPress={() => setSubjects(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s])} />)}
          </Row>
        </Field>
        <Button loading={savingProfile} icon={GraduationCap} onPress={saveProfile}>Save profile</Button>
      </Card>

      {!skipLogin ? (
        <>
          <GroupTitle>{t('settings.security')}</GroupTitle>
          <Card style={{ gap: 14 }}>
            {pwError ? <Alert>{pwError}</Alert> : null}
            <PasswordInput label="Current password" icon={Lock} value={pw.currentPassword} onChangeText={(v) => setPw({ ...pw, currentPassword: v })} error={pwErrors.currentPassword} />
            <PasswordInput label="New password" icon={Lock} value={pw.newPassword} onChangeText={(v) => setPw({ ...pw, newPassword: v })} error={pwErrors.newPassword} />
            <PasswordInput label="Confirm new password" icon={Lock} value={pw.confirm} onChangeText={(v) => setPw({ ...pw, confirm: v })} error={pwErrors.confirm} />
            <Button variant="secondary" loading={savingPw} onPress={changePassword}>Change password</Button>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- courses */
export function CoursesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(() => userApi.getProfile(), []);

  const activity = Object.fromEntries((data?.courses || []).map((c) => [c.subject, c.items]));
  const all = [...new Set([...(user?.preferences?.subjects || []), ...Object.keys(activity)])];

  return (
    <Screen title="My Courses" back actions={<IconButton icon={SettingsIcon} onPress={() => navigation.navigate('Settings')} label="Edit subjects" />}>
      {loading && !data ? <SkeletonList count={4} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : all.length === 0 ? (
        <EmptyState icon={BookOpen} title="No courses yet" message="Choose your subjects in Settings, or create notes and quizzes to see them here." action={<Button onPress={() => navigation.navigate('Settings')}>Choose subjects</Button>} />
      ) : all.map((s) => (
        <Card key={s} style={{ gap: 12 }}>
          <Row>
            <IconTile icon={BookOpen} />
            <View style={{ flex: 1 }}>
              <Txt bold numberOfLines={1}>{s}</Txt>
              <Txt size="xs" color="muted">{activity[s] ? `${activity[s]} notes, quizzes & materials` : 'No study items yet'}</Txt>
            </View>
          </Row>
          <Row>
            <Button variant="soft" size="sm" icon={ListChecks} onPress={() => navigation.navigate('QuizSetup', { subject: s })}>Quiz</Button>
            <Button variant="ghost" size="sm" icon={NotebookPen} onPress={() => navigation.navigate('Notes')}>Notes</Button>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

/* ---------------------------------------------------------------- history */
const ICONS = { upload: FileUp, analysis: Brain, quiz: Trophy, note: StickyNote, chat: MessageCircle, deck: Layers, game: Gamepad2, streak: Flame, badge: Award };

export function StudyHistoryScreen() {
  const navigation = useNavigation();
  const { data, loading, error, reload } = useApi(() => progressApi.overview({ activityLimit: 50 }), []);
  const items = data?.recentActivity || [];

  const open = (a) => {
    if (a.type === 'upload' || a.type === 'analysis') navigation.navigate('Summary', { id: a.refId });
    else if (a.type === 'quiz') navigation.navigate('QuizHistory');
    else if (a.type === 'note') navigation.navigate('Notes');
    else if (a.type === 'chat') navigation.navigate('Tutor', { conversationId: a.meta });
  };

  const groups = items.reduce((acc, a) => {
    const key = new Date(a.at).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {});

  return (
    <Screen title="Study History" back>
      {loading && !data ? <SkeletonList count={5} height={60} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : items.length === 0 ? (
        <EmptyState icon={History} title="No history yet" message="Your uploads, quizzes, notes and AI chats will appear here." />
      ) : Object.entries(groups).map(([day, list]) => (
        <View key={day} style={{ gap: 8 }}>
          <GroupTitle>{day}</GroupTitle>
          <Card padded={false}>
            {list.map((a, i) => <ListRow key={`${a.type}-${a.refId}-${i}`} first={i === 0} icon={ICONS[a.type] || Sparkles} title={a.title} desc={formatDateTime(a.at)} onPress={() => open(a)} right={null} />)}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

/* ---------------------------------------------------------------- notifications */
export function NotificationsScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { user, updateUser } = useAuth();
  const prefs = user?.preferences || {};

  const { data, loading, error, reload } = useApi(async () => {
    const [overview, materials, quizzes] = await Promise.all([progressApi.overview({ activityLimit: 1 }), materialApi.list(), quizApi.history()]);
    return { overview, materials: materials.materials, pending: quizzes.notAttempted };
  }, []);

  const items = [];
  if (data) {
    if (prefs.studyReminders && !data.overview.streak.studiedToday) {
      items.push({ icon: Flame, tone: 'warning', title: data.overview.streak.current ? `Keep your ${data.overview.streak.current}-day streak alive!` : 'Start a study streak today', text: 'Study for a few minutes, take a quiz or ask the AI Tutor.', go: () => navigation.navigate('QuizSetup') });
    }
    data.materials.slice(0, 20).forEach((m) => {
      if (m.analysisStatus === 'completed') items.push({ icon: CheckCircle2, tone: 'success', title: 'Study guide ready', text: m.filename, go: () => navigation.navigate('Summary', { id: m.id }), at: m.uploadedAt });
      if (m.analysisStatus === 'failed') items.push({ icon: AlertTriangle, tone: 'danger', title: 'Analysis failed', text: `${m.filename} - tap to retry`, go: () => navigation.navigate('Analysis', { id: m.id }), at: m.uploadedAt });
    });
    data.pending.slice(0, 5).forEach((q) => items.push({ icon: ListChecks, title: 'Quiz waiting for you', text: `${q.topic} · ${q.totalQuestions} questions`, go: () => navigation.navigate('Quiz', { id: q.id }), at: q.createdAt }));
  }

  const setPref = async (key, value) => {
    try { await updateUser({ preferences: { [key]: value } }); } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <Screen title="Notifications" back>
      <GroupTitle>Preferences</GroupTitle>
      <Card padded={false}>
        <ListRow first icon={Clock} title="Study Reminders" desc="Remind me when I haven't studied today" right={<Switch checked={Boolean(prefs.studyReminders)} onChange={(v) => setPref('studyReminders', v)} />} />
        <ListRow icon={BellRing} title="Push Notifications" desc="A daily reminder on this device" right={<Switch checked={Boolean(prefs.pushNotifications)} onChange={(v) => setPref('pushNotifications', v)} />} />
      </Card>

      <GroupTitle>Updates</GroupTitle>
      {loading && !data ? <SkeletonList count={3} height={64} /> : error && !data ? <ErrorState message={error} onRetry={reload} /> : items.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" message="New updates about your materials and quizzes will appear here." />
      ) : (
        <Card padded={false}>
          {items.map((n, i) => <ListRow key={i} first={i === 0} icon={n.icon} tone={n.tone || undefined} title={n.title} desc={`${n.text}${n.at ? ` · ${timeAgo(n.at)}` : ''}`} onPress={n.go} right={null} />)}
        </Card>
      )}
    </Screen>
  );
}

/* ---------------------------------------------------------------- help */
const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || '';

const FAQ = [
  { q: 'Which files can I upload?', a: 'PDF, MP4 video, DOCX, TXT/Markdown and images (JPG, PNG, WEBP, GIF) up to 50 MB.' },
  { q: 'How does AI analysis work?', a: 'MyStudyAI extracts the text from your file (or looks at the images/video frames), then the AI writes a summary, key points, definitions, important topics, exam questions and personalised recommendations.' },
  { q: 'Why did my video analysis say to add a description?', a: 'The AI sees still frames from the video, not the audio. Adding a short description or transcript when uploading gives much better results.' },
  { q: 'How is study time calculated?', a: 'While the app is open and you are active, one minute is added every minute. Idle time (no activity for 3 minutes) and time in the background are not counted.' },
  { q: 'How does my streak work?', a: 'Any day you study, upload, take a quiz or chat with the AI Tutor counts. Miss a full day and the streak restarts.' },
  { q: 'Can other students see my notes or files?', a: 'No. Every note, file, quiz and chat is private to your account.' },
  { q: 'I forgot my password.', a: 'Use "Forgot password?" on the login screen to get a reset link.' },
];

export function HelpScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(null);
  return (
    <Screen title="Help & Support" back>
      <GroupTitle>Frequently asked questions</GroupTitle>
      <Card padded={false}>
        {FAQ.map((f, i) => (
          <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} style={{ padding: 14, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <Row between><Txt bold style={{ flex: 1 }}>{f.q}</Txt><ChevronDown size={18} color={colors.muted} style={{ transform: [{ rotate: open === i ? '180deg' : '0deg' }] }} /></Row>
            {open === i ? <Txt size="sm" color="text2">{f.a}</Txt> : null}
          </Pressable>
        ))}
      </Card>

      <GroupTitle>Still need help?</GroupTitle>
      <Button variant="secondary" block icon={MessageCircle} onPress={() => navigation.navigate('Tutor', { prompt: 'How do I get the most out of MyStudyAI for exam preparation?' })}>Ask the AI Tutor</Button>
      {SUPPORT_EMAIL ? <Button block icon={Mail} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=MyStudyAI%20support`)}>Email support</Button> : null}
    </Screen>
  );
}
