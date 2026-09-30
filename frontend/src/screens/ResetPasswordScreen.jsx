/**
 * Reset password - opened from Supabase's e-mailed recovery link.
 * Supabase signs the student in with a short "recovery" session; we then set the new password.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { authApi, getErrorMessage } from '../services/api';
import { supabase } from '../lib/supabase';
import { PasswordInput } from '../components/FormFields';
import Button from '../components/Button';
import { Alert, Spinner } from '../components/Feedback';
import { useToast } from '../context/ToastContext';

export default function ResetPasswordScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [ready, setReady] = useState(null); // null = checking, true = can reset, false = link invalid
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return setReady(false);
    let done = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        done = true;
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      // Give Supabase a moment to read the link before saying it is invalid
      else setTimeout(() => !done && setReady(false), 2500);
    });
    return () => sub.subscription.unsubscribe();
  }, [params]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'Use 8+ characters with letters and numbers.';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setServerError('');
    try {
      await authApi.resetPassword({ password: form.password });
      await supabase.auth.signOut();
      toast.success('Password updated. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card page-enter">
        <div className="head">
          <div className="icon-tile lg">
            <ShieldCheck size={28} />
          </div>
          <h1>Set a new password</h1>
          <p className="text-2">Choose a strong password you haven’t used before.</p>
        </div>
        {ready === null ? (
          <div className="center" style={{ padding: 30 }}><Spinner /></div>
        ) : !ready ? (
          <div className="auth-panel">
            <Alert>This reset link is invalid or has expired. Please request a new link.</Alert>
            <Button block onClick={() => navigate('/forgot-password')}>
              Request new link
            </Button>
          </div>
        ) : (
          <form className="auth-panel" onSubmit={submit} noValidate>
            {serverError && <Alert>{serverError}</Alert>}
            <PasswordInput label="New password" icon={Lock} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
            <PasswordInput label="Confirm new password" icon={Lock} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} error={errors.confirmPassword} />
            <Button type="submit" size="lg" block loading={loading} className="grad square">
              Reset password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
