/**
 * First-time setup wizard (after registering): level -> subjects -> study methods -> personalise.
 * Choices are saved to the student's profile.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, GraduationCap, School, BookOpen, Award, Briefcase, Moon, Bell, Plus, Users, CheckCircle2, User, Layers, Video, Mic, Grid3x3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { EDUCATION_LEVELS, SUBJECTS, STUDY_METHODS } from '../utils/constants';
import { Toggle, TextInput } from '../components/FormFields';
import Button from '../components/Button';

const LEVEL_ICONS = [School, BookOpen, GraduationCap, Award, Briefcase, User];
const METHOD_ICONS = { Flashcards: Layers, 'Practice Tests': GraduationCap, 'Reading Summaries': BookOpen, 'Video Summaries': Video, 'Voice Quizzing': Mic, 'All of the above': Grid3x3 };
const STEPS = ['Account', 'Profile', 'Level', 'Subjects', 'Preferences', 'Setup'];
const ALL_METHODS = 'All of the above';

export default function SetupScreen() {
  const { user, updateUser } = useAuth();
  const { isDark, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState(user?.preferences?.role || 'student');
  const [name, setName] = useState(user?.name || '');
  const [school, setSchool] = useState(user?.preferences?.school || '');
  const [username, setUsername] = useState(user?.preferences?.username || `study_${Math.floor(100000 + Math.random() * 900000)}`);
  const [level, setLevel] = useState(user?.educationLevel || '');
  const [subjects, setSubjects] = useState(user?.preferences?.subjects || []);
  const [methods, setMethods] = useState(user?.preferences?.studyMethods || []);
  const [reminders, setReminders] = useState(user?.preferences?.studyReminders ?? true);
  const [custom, setCustom] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleIn = (list, setList, value) => setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  const canContinue = [Boolean(role), name.trim().length >= 2 && /^[a-z0-9_.]{3,30}$/.test(username), Boolean(level), subjects.length > 0, methods.length > 0, true][step];
  const toggleMethod = (m) => {
    if (m === ALL_METHODS) return setMethods(methods.length === STUDY_METHODS.length ? [] : [...STUDY_METHODS]);
    toggleIn(methods, setMethods, m);
  };

  const addCustom = () => {
    const s = custom.trim();
    if (s && !subjects.includes(s)) setSubjects([...subjects, s]);
    setCustom('');
  };

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      await updateUser({
        ...(skip ? {} : { educationLevel: level || null, name: name.trim() }),
        preferences: skip
          ? { onboarded: true, darkMode: isDark }
          : { onboarded: true, darkMode: isDark, studyReminders: reminders, subjects, studyMethods: methods, role, school: school.trim(), username },
      });
      toast.success('All set! Welcome to MyStudyAI 🎉');
      navigate('/home', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="onboard-page">
      <div className="stepper-top">
        <div className="setup-progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
        <div className="labels">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{STEPS[step]}</span>
        </div>
      </div>

      <div className="onboard-body fade-in" key={step}>
        {step === 0 && (
          <>
            <div className="head">
              <h1>I am a...</h1>
              <p className="text-2">This helps us personalize your experience</p>
            </div>
            <div className="stack">
              {[
                { v: 'student', t: 'Student', d: "I'm here to learn and study", icon: GraduationCap },
                { v: 'teacher', t: 'Teacher', d: "I'm here to teach and manage classes", icon: Users },
              ].map((r) => (
                <button key={r.v} className={`role-card ${role === r.v ? 'selected' : ''}`} onClick={() => setRole(r.v)} aria-pressed={role === r.v}>
                  <span className="icon-tile lg"><r.icon size={26} /></span>
                  <span className="t">{r.t}</span>
                  <span className="d">{r.d}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="head">
              <h1>What’s your name?</h1>
              <p className="text-2">Let’s get to know each other</p>
            </div>
            <div className="card stack">
              <TextInput label="Full Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" />
              <TextInput
                label="MyStudy ID (Username)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30))}
                hint="This will be your unique @username on MyStudyAI"
                error={username && username.length < 3 ? 'Use at least 3 characters.' : undefined}
              />
              <TextInput label="School or Institution (Optional)" value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="head">
              <h1>What’s your level?</h1>
              <p className="text-2">This helps us tailor content for you</p>
            </div>
            <div className="stack">
              {EDUCATION_LEVELS.map((l, i) => {
                const Icon = LEVEL_ICONS[i];
                return (
                  <button key={l} className={`option-card ${level === l ? 'selected' : ''}`} onClick={() => setLevel(l)} aria-pressed={level === l}>
                    <span className="icon-tile sm">
                      <Icon size={18} />
                    </span>
                    {l}
                    {level === l && <Check size={20} className="check" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="head">
              <h1>What do you study?</h1>
              <p className="text-2">Pick as many subjects as you like</p>
            </div>
            <div className="card">
              <div className="subject-grid">
                {[...new Set([...SUBJECTS, ...subjects])].map((s) => (
                  <button key={s} className={`chip ${subjects.includes(s) ? 'active' : ''}`} onClick={() => toggleIn(subjects, setSubjects, s)} aria-pressed={subjects.includes(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 18 }}>
                <label htmlFor="custom-subject">Add custom subject</label>
                <div className="row">
                  <input id="custom-subject" className="input filled" placeholder="e.g. Astronomy" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} maxLength={60} />
                  <button className="icon-btn primary" onClick={addCustom} aria-label="Add subject" disabled={!custom.trim()}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>
              <div className="small text-2" style={{ marginTop: 12 }}>Selected ({subjects.length})</div>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="head">
              <h1>How do you like to learn?</h1>
              <p className="text-2">Choose your preferred study methods</p>
            </div>
            <div className="stack">
              {[...STUDY_METHODS, ALL_METHODS].map((m) => {
                const on = m === ALL_METHODS ? methods.length === STUDY_METHODS.length : methods.includes(m);
                return (
                  <button key={m} className={`option-card ${on ? 'selected' : ''}`} onClick={() => toggleMethod(m)} aria-pressed={on}>
                    <span className="icon-tile sm">{(() => { const I = METHOD_ICONS[m] || Check; return <I size={18} />; })()}</span>
                    {m}
                    {on && <CheckCircle2 size={20} className="check" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="head">
              <h1>Personalise</h1>
              <p className="text-2">You can change these anytime</p>
            </div>
            <div className="card list-card">
              <div className="list-item">
                <span className="icon-tile sm">
                  <Moon size={18} />
                </span>
                <span className="grow bold">Dark Mode</span>
                <Toggle checked={isDark} onChange={(v) => setTheme(v ? 'dark' : 'light')} label="Dark mode" />
              </div>
              <div className="list-item">
                <span className="icon-tile sm">
                  <Bell size={18} />
                </span>
                <span className="grow bold">Study Reminders</span>
                <Toggle checked={reminders} onChange={setReminders} label="Study reminders" />
              </div>
            </div>
            <div className="center stack" style={{ gap: 6, marginTop: 8 }}>
              <h2>Ready to start learning?</h2>
              <p className="text-2">You’re all set! Click “Start” to begin your journey with MyStudyAI.</p>
            </div>
          </>
        )}
      </div>

      <div className="dots" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />
        ))}
      </div>

      <div className="onboard-foot">
        {step > 0 ? (
          <button className="icon-btn" onClick={() => setStep(step - 1)} aria-label="Previous step">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <button className="btn ghost sm" onClick={() => finish(true)} disabled={saving}>
            Skip setup
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <Button disabled={!canContinue} iconRight={<ArrowRight size={18} />} onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button loading={saving} iconRight={<ArrowRight size={18} />} onClick={() => finish(false)}>
            Start
          </Button>
        )}
      </div>
    </div>
  );
}
