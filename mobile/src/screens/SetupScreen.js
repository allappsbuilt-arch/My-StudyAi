/** First-time setup wizard (after registering): role -> profile -> level -> subjects -> methods -> personalise. */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, Award, Bell, BookOpen, Briefcase, Check, CheckCircle2, GraduationCap, Grid3x3, Layers, Mic, Moon, Plus, School, User, Users, Video } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { EDUCATION_LEVELS, STUDY_METHODS, SUBJECTS } from '../utils/constants';
import { Button, Card, Chip, IconButton, IconTile, ProgressBar, Row, Switch, TextInput, Txt } from '../components/Ui';

const LEVEL_ICONS = [School, BookOpen, GraduationCap, Award, Briefcase, User];
const METHOD_ICONS = { Flashcards: Layers, 'Practice Tests': GraduationCap, 'Reading Summaries': BookOpen, 'Video Summaries': Video, 'Voice Quizzing': Mic, 'All of the above': Grid3x3 };
const STEPS = ['Account', 'Profile', 'Level', 'Subjects', 'Preferences', 'Setup'];
const ALL_METHODS = 'All of the above';

function OptionCard({ icon: Icon, label, on, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.surface }}>
      <IconTile icon={Icon} size={38} />
      <Txt bold style={{ flex: 1 }}>{label}</Txt>
      {on ? <CheckCircle2 size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function SetupScreen() {
  const { user, updateUser } = useAuth();
  const { isDark, setTheme, colors } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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
    return toggleIn(methods, setMethods, m);
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
      navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSaving(false);
    }
  };

  const Head = ({ title, text }) => (
    <View style={{ alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <Txt size="h1" bold center>{title}</Txt>
      <Txt color="text2" center>{text}</Txt>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        <ProgressBar thin value={((step + 1) / STEPS.length) * 100} />
        <Row between><Txt size="sm" color="text2">Step {step + 1} of {STEPS.length}</Txt><Txt size="sm" bold color="primary">{STEPS[step]}</Txt></Row>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Head title="I am a..." text="This helps us personalize your experience" />
            {[{ v: 'student', t: 'Student', d: "I'm here to learn and study", icon: GraduationCap }, { v: 'teacher', t: 'Teacher', d: "I'm here to teach and manage classes", icon: Users }].map((r) => (
              <Pressable key={r.v} onPress={() => setRole(r.v)} style={{ alignItems: 'center', gap: 8, padding: 22, borderRadius: 22, borderWidth: 2, borderColor: role === r.v ? colors.primary : colors.border, backgroundColor: role === r.v ? colors.primarySoft : colors.surface }}>
                <IconTile icon={r.icon} size={58} />
                <Txt size="lg" bold>{r.t}</Txt>
                <Txt size="sm" color="text2">{r.d}</Txt>
              </Pressable>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Head title="What's your name?" text="Let's get to know each other" />
            <Card style={{ gap: 14 }}>
              <TextInput label="Full Name" value={name} onChangeText={setName} maxLength={100} autoComplete="name" />
              <TextInput label="MyStudy ID (Username)" value={username} autoCapitalize="none" onChangeText={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30))} hint="This will be your unique @username on MyStudyAI" error={username && username.length < 3 ? 'Use at least 3 characters.' : undefined} />
              <TextInput label="School or Institution (Optional)" value={school} onChangeText={setSchool} maxLength={120} />
            </Card>
          </>
        )}

        {step === 2 && (
          <>
            <Head title="What's your level?" text="This helps us tailor content for you" />
            {EDUCATION_LEVELS.map((l, i) => <OptionCard key={l} icon={LEVEL_ICONS[i]} label={l} on={level === l} onPress={() => setLevel(l)} />)}
          </>
        )}

        {step === 3 && (
          <>
            <Head title="What do you study?" text="Pick as many subjects as you like" />
            <Card style={{ gap: 14 }}>
              <Row wrap gap={8}>
                {[...new Set([...SUBJECTS, ...subjects])].map((s) => <Chip key={s} label={s} selected={subjects.includes(s)} onPress={() => toggleIn(subjects, setSubjects, s)} />)}
              </Row>
              <Row>
                <View style={{ flex: 1 }}><TextInput label="Add custom subject" placeholder="e.g. Astronomy" value={custom} onChangeText={setCustom} onSubmitEditing={addCustom} maxLength={60} /></View>
                <IconButton icon={Plus} bg={colors.primary} color="#fff" onPress={addCustom} label="Add subject" style={{ marginTop: 22, opacity: custom.trim() ? 1 : 0.5 }} />
              </Row>
              <Txt size="sm" color="text2">Selected ({subjects.length})</Txt>
            </Card>
          </>
        )}

        {step === 4 && (
          <>
            <Head title="How do you like to learn?" text="Choose your preferred study methods" />
            {[...STUDY_METHODS, ALL_METHODS].map((m) => {
              const on = m === ALL_METHODS ? methods.length === STUDY_METHODS.length : methods.includes(m);
              return <OptionCard key={m} icon={METHOD_ICONS[m] || Check} label={m} on={on} onPress={() => toggleMethod(m)} />;
            })}
          </>
        )}

        {step === 5 && (
          <>
            <Head title="Personalise" text="You can change these anytime" />
            <Card style={{ gap: 16 }}>
              <Row><IconTile icon={Moon} size={38} /><Txt bold style={{ flex: 1 }}>Dark Mode</Txt><Switch checked={isDark} onChange={(v) => setTheme(v ? 'dark' : 'light')} /></Row>
              <Row><IconTile icon={Bell} size={38} /><Txt bold style={{ flex: 1 }}>Study Reminders</Txt><Switch checked={reminders} onChange={setReminders} /></Row>
            </Card>
            <View style={{ alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Txt size="h2" bold>Ready to start learning?</Txt>
              <Txt color="text2" center>You're all set! Tap "Start" to begin your journey with MyStudyAI.</Txt>
            </View>
          </>
        )}
      </ScrollView>

      <Row between style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 14), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
        {step > 0 ? <IconButton icon={ArrowLeft} onPress={() => setStep(step - 1)} label="Previous step" /> : <Button variant="ghost" size="sm" onPress={() => finish(true)} disabled={saving}>Skip setup</Button>}
        {step < STEPS.length - 1
          ? <Button disabled={!canContinue} iconRight={ArrowRight} onPress={() => setStep(step + 1)}>Continue</Button>
          : <Button loading={saving} iconRight={ArrowRight} onPress={() => finish(false)}>Start</Button>}
      </Row>
    </View>
  );
}
