/** 2. Onboarding / welcome - three short slides, then Get Started or Login. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, FileUp, Trophy, Sparkles, CheckCircle2, Flame } from 'lucide-react';
import Button from '../components/Button';
import { Brand } from '../components/Brand';

const SLIDES = [
  {
    icon: Sparkles,
    title: 'Welcome to MyStudyAI',
    text: 'Your AI-powered study companion. Learn faster, remember more, and walk into every exam prepared.',
    floats: [
      { t: 'AI Tutor', icon: Brain, style: { top: 18, left: -18 } },
      { t: '7 day streak', icon: Flame, style: { bottom: 24, right: -24 } },
    ],
  },
  {
    icon: FileUp,
    title: 'Upload any material',
    text: 'PDFs, notes, slides, photos or lecture videos - get instant summaries, key points and exam questions.',
    floats: [
      { t: 'Summary ready', icon: CheckCircle2, style: { top: 26, right: -28 } },
      { t: 'Key points', icon: Sparkles, style: { bottom: 20, left: -20 } },
    ],
  },
  {
    icon: Trophy,
    title: 'Practise & track progress',
    text: 'AI-generated quizzes with explanations, and charts that show exactly how you are improving.',
    floats: [
      { t: 'Score 92%', icon: Trophy, style: { top: 20, left: -14 } },
      { t: 'Weekly goal', icon: CheckCircle2, style: { bottom: 26, right: -18 } },
    ],
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const slide = SLIDES[index];
  const Icon = slide.icon;
  const last = index === SLIDES.length - 1;

  return (
    <div className="onboard-page">
      <div className="row-between">
        <Brand size={34} />
        {!last && (
          <button className="btn ghost sm" onClick={() => setIndex(SLIDES.length - 1)}>
            Skip
          </button>
        )}
      </div>

      <div className="onboard-body" key={index}>
        <div className="hero-illustration fade-in">
          <div className="orb">
            <div className="icon-tile solid" style={{ width: 112, height: 112, borderRadius: 34 }}>
              <Icon size={52} />
            </div>
            {slide.floats.map((f) => (
              <div key={f.t} className="floaty" style={f.style}>
                <f.icon size={15} color="var(--primary)" />
                {f.t}
              </div>
            ))}
          </div>
        </div>
        <div className="head fade-in">
          <h1>{slide.title}</h1>
          <p className="text-2" style={{ maxWidth: 380, margin: '0 auto' }}>
            {slide.text}
          </p>
        </div>
        <div className="dots" aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <span key={i} className={i === index ? 'on' : i < index ? 'done' : ''} />
          ))}
        </div>
      </div>

      <div className="stack">
        {last ? (
          <Button size="lg" block iconRight={<ArrowRight size={18} />} onClick={() => navigate('/register')}>
            Get Started
          </Button>
        ) : (
          <Button size="lg" block iconRight={<ArrowRight size={18} />} onClick={() => setIndex(index + 1)}>
            Next
          </Button>
        )}
        <Button size="lg" block variant="secondary" onClick={() => navigate('/login')}>
          I already have an account - Login
        </Button>
      </div>
    </div>
  );
}
