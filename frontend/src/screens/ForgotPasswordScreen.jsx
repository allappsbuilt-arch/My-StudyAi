/** Forgot password: request a reset link by e-mail. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send, KeyRound, ExternalLink } from 'lucide-react';
import { authApi, getErrorMessage } from '../services/api';
import { TextInput } from '../components/FormFields';
import Button from '../components/Button';
import { Alert } from '../components/Feedback';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      setResult(await authApi.forgotPassword(email.trim()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const localLink = result?.resetLink ? new URL(result.resetLink) : null;

  return (
    <div className="auth-page">
      <div className="auth-card fade-in">
        <div>
          <button className="icon-btn" onClick={() => navigate('/login')} aria-label="Back to login">
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="head">
          <div className="icon-tile lg">
            <KeyRound size={28} />
          </div>
          <h1>Forgot password?</h1>
          <p className="text-2">Enter your account email and we’ll send you a link to reset your password.</p>
        </div>

        {result ? (
          <div className="card stack">
            <Alert type="success" icon={Send}>
              {result.message}
            </Alert>
            {localLink && (
              <Button block icon={<ExternalLink size={18} />} onClick={() => navigate(localLink.pathname + localLink.search)}>
                Open reset link
              </Button>
            )}
            <Button block variant="secondary" onClick={() => navigate('/login')}>
              Back to Login
            </Button>
          </div>
        ) : (
          <form className="card" onSubmit={submit} noValidate>
            <TextInput label="Email" type="email" icon={Mail} placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <Button type="submit" size="lg" block loading={loading} icon={<Send size={18} />}>
              Send reset link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
