/** Notice shown while the development UI preview (sample data, nothing saved) is on. */
import { Eye } from 'lucide-react';
import { PREVIEW, exitPreview } from '../services/api';

export default function PreviewBanner() {
  if (!PREVIEW) return null;
  const fromEnv = String(import.meta.env.VITE_UI_PREVIEW || '').toLowerCase() === 'true';
  return (
    <div className="demo-banner" role="status">
      <Eye size={16} />
      <span className="grow">UI preview: sample data, nothing is saved. Connect Supabase for real data.</span>
      {!fromEnv && (
        <button onClick={exitPreview} style={{ font: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
          Exit
        </button>
      )}
    </div>
  );
}
