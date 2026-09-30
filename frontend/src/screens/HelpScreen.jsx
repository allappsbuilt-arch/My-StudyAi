/** Help & Support - FAQ and contact. */
import { useNavigate } from 'react-router-dom';
import { Mail, MessageCircle, ChevronDown } from 'lucide-react';
import { Page } from '../navigation/AppLayout';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';

// Set VITE_SUPPORT_EMAIL in frontend/.env to show an "Email support" button
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || '';

const FAQ = [
  { q: 'Which files can I upload?', a: 'PDF, MP4 video, DOCX, TXT/Markdown and images (JPG, PNG, WEBP, GIF) up to 50 MB.' },
  { q: 'How does AI analysis work?', a: 'MyStudyAI extracts the text from your file (or looks at the images/video frames), then the AI writes a summary, key points, definitions, important topics, exam questions and personalised recommendations.' },
  { q: 'Why did my video analysis say to add a description?', a: 'The AI sees still frames from the video, not the audio. Adding a short description or transcript when uploading gives much better results.' },
  { q: 'How is study time calculated?', a: 'While the app is open and you are active, one minute is added every minute. Idle time (no activity for 3 minutes) and hidden tabs are not counted.' },
  { q: 'How does my streak work?', a: 'Any day you study, upload, take a quiz or chat with the AI Tutor counts. Miss a full day and the streak restarts.' },
  { q: 'Can other students see my notes or files?', a: 'No. Every note, file, quiz and chat is private to your account.' },
  { q: 'I forgot my password.', a: 'Use “Forgot password?” on the login screen to get a reset link.' },
];

export default function HelpScreen() {
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader back="/profile" title="Help & Support" />

      <div className="settings-group-title">Frequently asked questions</div>
      <div className="card">
        {FAQ.map((f) => (
          <details key={f.q} className="qa">
            <summary>
              <span className="grow">{f.q}</span>
              <ChevronDown size={18} className="muted" />
            </summary>
            <p className="small text-2" style={{ marginTop: 8 }}>{f.a}</p>
          </details>
        ))}
      </div>

      <div className="settings-group-title">Still need help?</div>
      <div className="stack">
        <Button variant="secondary" block icon={<MessageCircle size={18} />} onClick={() => navigate('/tutor', { state: { prompt: 'How do I get the most out of MyStudyAI for exam preparation?' } })}>
          Ask the AI Tutor
        </Button>
        {SUPPORT_EMAIL && (
          <a className="btn block" href={`mailto:${SUPPORT_EMAIL}?subject=MyStudyAI%20support`}>
            <Mail size={18} /> Email support
          </a>
        )}
      </div>
    </Page>
  );
}
