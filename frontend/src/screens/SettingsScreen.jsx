/** Settings - appearance, language, notifications, account details, study preferences, change password. */
import { useState } from 'react';
import { Moon, User, Mail, GraduationCap, Lock, BookOpen, Globe, Bell, BellRing, Check, Flame, Clock, Eye, BarChart3, Circle, Download, Trash2, AtSign, School } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { LANGUAGES, useI18n } from '../context/I18nContext';
import { getErrorMessage, dataApi } from '../services/api';
import { Page } from '../navigation/AppLayout';
import { SimpleHeader } from '../components/Ui';
import Button from '../components/Button';
import { TextInput, PasswordInput, Select, Toggle } from '../components/FormFields';
import { Alert } from '../components/Feedback';
import { EDUCATION_LEVELS, SUBJECTS } from '../utils/constants';

export default function SettingsScreen() {
  const { user, updateUser, skipLogin } = useAuth();
  const { isDark, setTheme } = useTheme();
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

  const savePref = async (prefs) => {
    try {
      await updateUser({ preferences: prefs });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const toggleDark = (value) => {
    setTheme(value ? 'dark' : 'light');
    savePref({ darkMode: value });
  };

  const changeLanguage = (code) => {
    setLang(code);
    savePref({ language: code });
    toast.success(LANGUAGES.find((l) => l.code === code)?.native);
  };

  const togglePush = async (value) => {
    if (value && 'Notification' in window && Notification.permission === 'default') {
      const res = await Notification.requestPermission();
      if (res !== 'granted') toast.info('Allow notifications in your browser to get reminders.');
    }
    savePref({ pushNotifications: value });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
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
  };

  const changePassword = async (e) => {
    e.preventDefault();
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
    <Page>
      <SimpleHeader back="/profile" title={t('settings.title')} />

      <div className="settings-group-title">{t('settings.appearance')}</div>
      <div className="card list-card">
        <div className="list-item">
          <span className="icon-tile sm"><Moon size={18} /></span>
          <span className="grow bold">{t('settings.darkMode')}</span>
          <Toggle checked={isDark} onChange={toggleDark} label={t('settings.darkMode')} />
        </div>
      </div>

      <div className="settings-group-title">{t('settings.language')}</div>
      <div className="card list-card" role="radiogroup" aria-label={t('settings.language')}>
        {LANGUAGES.map((l) => (
          <button key={l.code} className="list-item" role="radio" aria-checked={lang === l.code} onClick={() => changeLanguage(l.code)}>
            <span className="icon-tile sm"><Globe size={18} /></span>
            <span className="grow">
              <span className="bold" style={{ display: 'block' }}>{l.native}</span>
              <span className="tiny muted">{l.label}</span>
            </span>
            {lang === l.code && <Check size={20} color="var(--primary)" />}
          </button>
        ))}
      </div>

      <div className="settings-group-title">{t('settings.notifications')}</div>
      <div className="card list-card">
        <div className="list-item">
          <span className="icon-tile sm"><BellRing size={18} /></span>
          <span className="grow bold">{t('settings.push')}</span>
          <Toggle checked={Boolean(user?.preferences?.pushNotifications)} onChange={togglePush} label={t('settings.push')} />
        </div>
        <div className="list-item">
          <span className="icon-tile sm"><Bell size={18} /></span>
          <span className="grow bold">{t('settings.reminders')}</span>
          <Toggle checked={Boolean(user?.preferences?.studyReminders)} onChange={(v) => savePref({ studyReminders: v })} label={t('settings.reminders')} />
        </div>
        <div className="list-item">
          <span className="icon-tile sm"><Flame size={18} /></span>
          <span className="grow bold">{t('settings.streakAlerts')}</span>
          <Toggle checked={Boolean(prefs.streakAlerts)} onChange={(v) => savePref({ streakAlerts: v })} label={t('settings.streakAlerts')} />
        </div>
        <label className="list-item" style={{ cursor: 'pointer' }}>
          <span className="icon-tile sm"><Clock size={18} /></span>
          <span className="grow bold">{t('settings.reminderTime')}</span>
          <input type="time" className="time-input" value={prefs.reminderTime || '18:00'} onChange={(e) => e.target.value && savePref({ reminderTime: e.target.value })} aria-label={t('settings.reminderTime')} />
        </label>
      </div>

      <div className="settings-group-title">{t('settings.privacy')}</div>
      <div className="card list-card">
        <label className="list-item" style={{ cursor: 'pointer' }}>
          <span className="icon-tile sm"><Eye size={18} /></span>
          <span className="grow bold">{t('settings.visibility')}</span>
          <select className="inline-select" value={prefs.profileVisibility || 'public'} onChange={(e) => savePref({ profileVisibility: e.target.value })} aria-label={t('settings.visibility')}>
            <option value="public">{t('settings.public')}</option>
            <option value="private">{t('settings.private')}</option>
          </select>
        </label>
        <div className="list-item">
          <span className="icon-tile sm"><BarChart3 size={18} /></span>
          <span className="grow bold">{t('settings.showStats')}</span>
          <Toggle checked={Boolean(prefs.showStudyStats)} onChange={(v) => savePref({ showStudyStats: v })} label={t('settings.showStats')} />
        </div>
        <div className="list-item">
          <span className="icon-tile sm"><Circle size={18} /></span>
          <span className="grow bold">{t('settings.showOnline')}</span>
          <Toggle checked={Boolean(prefs.showOnlineStatus)} onChange={(v) => savePref({ showOnlineStatus: v })} label={t('settings.showOnline')} />
        </div>
      </div>

      <div className="settings-group-title">{t('settings.data')}</div>
      <div className="card list-card">
        <button className="list-item" onClick={async () => { setExporting(true); try { await dataApi.exportAll(); toast.success('Download started'); } catch (err) { toast.error(getErrorMessage(err)); } finally { setExporting(false); } }} disabled={exporting}>
          <span className="icon-tile sm"><Download size={18} /></span>
          <span className="grow bold">{t('settings.export')}</span>
          <span className="tiny muted">JSON</span>
        </button>
        <button className="list-item" onClick={() => { const n = dataApi.clearLocalCache(); toast.success(`${t('settings.cacheCleared')} (${n})`); }}>
          <span className="icon-tile sm"><Trash2 size={18} /></span>
          <span className="grow bold">{t('settings.clearCache')}</span>
        </button>
      </div>

      <div className="settings-group-title">{t('settings.account')}</div>
      <form className="card stack" onSubmit={saveProfile}>
        {profileError && <Alert>{profileError}</Alert>}
        <TextInput label="Full name" icon={User} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <TextInput label="MyStudy ID (Username)" icon={AtSign} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30))} hint="Your unique @username on MyStudyAI" />
        <TextInput label="School or Institution" icon={School} value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} />
        {user?.email && <TextInput label="Email" icon={Mail} value={user.email} disabled hint="Email can’t be changed." />}
        <Select label="Education level" value={level} onChange={(e) => setLevel(e.target.value)} options={EDUCATION_LEVELS} placeholder="Not set" />
        <div className="field">
          <label><BookOpen size={14} style={{ verticalAlign: -2 }} /> My subjects</label>
          <div className="chips wrap">
            {[...new Set([...SUBJECTS, ...subjects])].map((s) => (
              <button type="button" key={s} className={`chip ${subjects.includes(s) ? 'active' : ''}`} onClick={() => setSubjects(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s])} aria-pressed={subjects.includes(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" loading={savingProfile} icon={<GraduationCap size={18} />}>
          Save profile
        </Button>
      </form>

      {!skipLogin && (<>
      <div className="settings-group-title">{t('settings.security')}</div>
      <form className="card stack" onSubmit={changePassword}>
        {pwError && <Alert>{pwError}</Alert>}
        <PasswordInput label="Current password" icon={Lock} autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} error={pwErrors.currentPassword} />
        <PasswordInput label="New password" icon={Lock} autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} error={pwErrors.newPassword} />
        <PasswordInput label="Confirm new password" icon={Lock} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={pwErrors.confirm} />
        <Button type="submit" variant="secondary" loading={savingPw}>
          Change password
        </Button>
      </form>
      </>)}
    </Page>
  );
}
