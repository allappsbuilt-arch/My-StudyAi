/** Shown in skip-login mode when the app could not sign in as the guest student. */
import { WifiOff, RefreshCw } from 'lucide-react';
import Button from '../components/Button';

export default function SkipLoginErrorScreen({ reason }) {
  const disabled = reason === 'anonymous_disabled';
  return (
    <div className="auth-page">
      <div className="auth-card page-enter">
        <div className="head">
          <div className="icon-tile lg danger"><WifiOff size={28} /></div>
          <h1>Can’t open MyStudyAI</h1>
          <p className="text-2">
            {disabled
              ? 'Skip-login needs guest accounts. In Supabase open Authentication → Sign In / Providers and turn on "Allow anonymous sign-ins", then reload.'
              : 'Could not reach Supabase. Check your internet connection and the keys in Frontend/.env, then reload.'}
          </p>
          {!disabled && reason && <p className="tiny muted">{reason}</p>}
        </div>
        <Button size="lg" block icon={<RefreshCw size={18} />} onClick={() => window.location.reload()}>
          Try again
        </Button>
        <p className="tiny muted center">To use normal accounts instead, set VITE_SKIP_LOGIN=false in Frontend/.env.</p>
      </div>
    </div>
  );
}
