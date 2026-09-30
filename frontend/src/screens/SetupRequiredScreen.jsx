/**
 * Shown when the app can't run yet: missing Supabase keys, backend not running,
 * or database migrations not applied. Explains exactly what to fix.
 */
import { Settings2, RefreshCw, Eye } from 'lucide-react';
import { startPreview } from '../services/api';
import Button from '../components/Button';
import { LogoMark } from '../components/Brand';

const ISSUES = {
  frontend_env: {
    title: 'Connect Supabase',
    text: 'The app needs your Supabase project URL and anon key.',
    steps: ['Supabase → Project Settings → API', 'Create Frontend/.env.local with:', 'VITE_SUPABASE_URL=https://<project-ref>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon key>', 'Restart "npm run dev" in the Frontend folder.'],
  },
  backend_offline: {
    title: 'Start the MyStudyAI server',
    text: 'The app can’t reach its backend on port 5000.',
    steps: ['Open a terminal in the Backend folder', 'npm run dev', 'Then reload this page.'],
  },
  not_configured: {
    title: 'Connect the server to Supabase',
    text: 'The backend is running but has no Supabase keys.',
    steps: ['Supabase → Project Settings → API', 'In Backend/.env set:', 'SUPABASE_URL=https://<project-ref>.supabase.co\nSUPABASE_ANON_KEY=<anon key>\nSUPABASE_SERVICE_ROLE_KEY=<service_role key>', 'The server restarts automatically; then reload this page.'],
  },
  not_migrated: {
    title: 'Create the database tables',
    text: 'Supabase is connected, but the MyStudyAI tables don’t exist yet.',
    steps: ['Supabase → SQL Editor', 'Run the files in backend/supabase/migrations in order, then backend/supabase/seed.sql', '(or: npx supabase link && npx supabase db push)', 'Then reload this page.'],
  },
  unreachable: {
    title: 'Can’t reach Supabase',
    text: 'The server couldn’t connect to your Supabase project.',
    steps: ['Check SUPABASE_URL and the keys in Backend/.env', 'Check your internet connection', 'If the project is paused, restore it in the Supabase dashboard.'],
  },
};

export default function SetupRequiredScreen({ issue }) {
  const info = ISSUES[issue] || ISSUES.unreachable;
  return (
    <div className="auth-page">
      <div className="auth-card page-enter">
        <div className="head">
          <div className="auth-logo"><LogoMark size={64} className="" /></div>
          <h1 style={{ marginTop: 10 }}>{info.title}</h1>
          <p className="text-2">{info.text}</p>
        </div>
        <div className="auth-panel">
          <div className="row small bold"><Settings2 size={16} /> Setup</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
            {info.steps.map((s) =>
              s.includes('\n') || /^(npm|VITE_|SUPABASE_)/.test(s) ? (
                <pre key={s} className="setup-code">{s}</pre>
              ) : (
                <li key={s} className="small">{s}</li>
              )
            )}
          </ol>
          <Button block icon={<RefreshCw size={18} />} onClick={() => window.location.reload()}>
            I’ve done this - reload
          </Button>
          {import.meta.env.DEV && (
            <Button block variant="secondary" icon={<Eye size={18} />} onClick={startPreview}>
              Preview the UI with sample data
            </Button>
          )}
          <p className="tiny muted center">Full guide: README.md and backend/supabase/README.md</p>
        </div>
      </div>
    </div>
  );
}
