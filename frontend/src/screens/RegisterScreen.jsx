/** 3. Register screen */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { TextInput, PasswordInput } from '../components/FormFields';
import Button from '../components/Button';
import { Alert } from '../components/Feedback';
import { LogoMark } from '../components/Brand';
import LanguageMenu from '../components/LanguageMenu';
import { useI18n } from '../context/I18nContext';

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [confirmSent, setConfirmSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const strength = passwordStrength(form.password);
  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Include at least one letter and one number.';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      if (res.needsConfirmation) {
        setConfirmSent(true);
        setLoading(false);
        return;
      }
      toast.success('Account created! Let’s personalise your experience.');
      // PublicOnlyRoute sends new students to the /setup wizard
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="auth-page">
        <div className="auth-card page-enter">
          <div className="head">
            <div className="icon-tile lg"><Mail size={28} /></div>
            <h1>Check your email</h1>
            <p className="text-2">We sent a confirmation link to <strong>{form.email}</strong>. Open it, then log in.</p>
          </div>
          <Button size="lg" block onClick={() => navigate('/login')}>{t('auth.signIn')}</Button>
        </div>
      </div>
    );
  }

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
          <h1 style={{ marginTop: 10 }}>{t('auth.createAccount')}</h1>
          <p className="text-2">{t('auth.tagline')}</p>
        </div>

        <form className="auth-panel" onSubmit={submit} noValidate>
          {serverError && <Alert>{serverError}</Alert>}
          <TextInput label={t('auth.fullName')} icon={User} placeholder="e.g. Priya Sharma" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
          <TextInput label={t('auth.email')} type="email" icon={Mail} placeholder={t('auth.emailPh')} autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
          <PasswordInput
            label={t('auth.password')}
            icon={Lock}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            hint={form.password ? `Strength: ${strengthLabel}` : 'Use letters and numbers'}
          />
          {form.password && (
            <div className="progress thin" aria-hidden="true">
              <span style={{ width: `${(strength / 4) * 100}%`, background: strength < 2 ? 'var(--danger)' : strength < 3 ? 'var(--warning)' : 'var(--success)' }} />
            </div>
          )}
          <PasswordInput label={t('auth.confirm')} icon={Lock} placeholder="Repeat your password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
          <Button type="submit" size="lg" block loading={loading} icon={<UserPlus size={18} />} className="grad square">
            {t('auth.createAccount')}
          </Button>
          <p className="auth-foot">
            {t('auth.haveAccount')} <button type="button" onClick={() => navigate('/login')}>{t('auth.signIn')}</button>
          </p>
        </form>
      </div>
    </div>
  );
}
