/** Login (Supabase Auth) - logo tile, card with email + password, forgot link, sign-up link. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';
import { authApi, getErrorMessage } from '../services/api';
import { TextInput, PasswordInput } from '../components/FormFields';
import Button from '../components/Button';
import { Alert } from '../components/Feedback';
import { LogoMark } from '../components/Brand';
import LanguageMenu from '../components/LanguageMenu';

export default function LoginScreen() {
  const { login } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const [oauthBusy, setOauthBusy] = useState('');
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Google / Apple: Supabase redirects to the provider and back to /home
  const social = async (provider) => {
    setServerError('');
    setOauthBusy(provider);
    try {
      await authApi.oauth(provider);
    } catch (err) {
      setServerError(getErrorMessage(err));
      setOauthBusy('');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`${t('home.welcome')} ${user.name.split(' ')[0]}!`);
      // PublicOnlyRoute takes the student to /home (or /setup the first time)
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card page-enter">
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <LanguageMenu />
        </div>
        <div className="head">
          <div className="auth-logo">
            <LogoMark size={64} className="" />
          </div>
          <h1 style={{ marginTop: 10 }}>MyStudyAI</h1>
          <p className="text-2">{t('auth.tagline')}</p>
        </div>

        <form className="auth-panel" onSubmit={submit} noValidate>
          {serverError && <Alert>{serverError}</Alert>}
          <TextInput label={t('auth.email')} type="email" icon={Mail} placeholder={t('auth.emailPh')} autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <PasswordInput label={t('auth.password')} icon={Lock} placeholder={t('auth.passwordPh')} autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
          <button type="button" className="forgot-link" onClick={() => navigate('/forgot-password')}>
            {t('auth.forgot')}
          </button>
          <Button type="submit" size="lg" block loading={loading} className="grad square">
            {t('auth.signIn')}
          </Button>
          <p className="auth-foot">
            {t('auth.noAccount')} <button type="button" onClick={() => navigate('/register')}>{t('auth.signUp')}</button>
          </p>
        </form>

        <div className="divider">{t('auth.orContinue')}</div>
        <div className="social-row">
          <button type="button" className="social-btn" onClick={() => social('google')} disabled={Boolean(oauthBusy)} aria-label="Continue with Google">
            <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
          </button>
          <button type="button" className="social-btn" onClick={() => social('apple')} disabled={Boolean(oauthBusy)} aria-label="Continue with Apple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ color: 'var(--text)' }}>
              <path d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.4-3.69zM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
