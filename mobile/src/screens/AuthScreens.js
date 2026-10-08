/** Splash, onboarding, login, register, forgot / reset password, and the setup-problem screens. */
import { useEffect, useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Eye, FileUp, Flame, KeyRound, Lock, Mail, RefreshCw, Send, Settings2, ShieldCheck, Sparkles, Trophy, User, UserPlus, WifiOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { authApi, getErrorMessage, PREVIEW } from '../services/api';
import { session } from '../lib/session';
import { Alert, Button, Card, IconButton, IconTile, PasswordInput, ProgressBar, Row, Spinner, TextInput, Txt } from '../components/Ui';
import { Brand, LogoMark } from '../components/Brand';
import { LanguageMenu } from '../components/Misc';
import { reloadApp } from '../utils/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthShell({ children, top }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: 18, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
      {top}
      {children}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ splash */
export function SplashScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <LogoMark size={128} />
      <Text style={{ color: '#fff', fontSize: 30, fontWeight: '800' }}>MyStudyAI</Text>
      <Spinner />
    </View>
  );
}

/* ------------------------------------------------------------------ onboarding */
const SLIDES = [
  { icon: Sparkles, title: 'Welcome to MyStudyAI', text: 'Your AI-powered study companion. Learn faster, remember more, and walk into every exam prepared.', tags: [['AI Tutor', Brain], ['7 day streak', Flame]] },
  { icon: FileUp, title: 'Upload any material', text: 'PDFs, notes, slides, photos or lecture videos - get instant summaries, key points and exam questions.', tags: [['Summary ready', CheckCircle2], ['Key points', Sparkles]] },
  { icon: Trophy, title: 'Practise & track progress', text: 'AI-generated quizzes with explanations, and charts that show exactly how you are improving.', tags: [['Score 92%', Trophy], ['Weekly goal', CheckCircle2]] },
];

export function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  return (
    <AuthShell
      top={
        <Row between>
          <Brand size={34} />
          {!last ? <Button variant="ghost" size="sm" onPress={() => setIndex(SLIDES.length - 1)}>Skip</Button> : null}
        </Row>
      }
    >
      <View style={{ alignItems: 'center', gap: 22, paddingVertical: 24 }}>
        <View style={{ width: 220, height: 200, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 190, height: 190, borderRadius: 95, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 112, height: 112, borderRadius: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <slide.icon size={52} color="#fff" />
            </View>
          </View>
          {slide.tags.map(([label, Icon], i) => (
            <View key={label} style={[{ position: 'absolute', flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border, elevation: 3 }, i === 0 ? { top: 14, left: -6 } : { bottom: 18, right: -6 }]}>
              <Icon size={15} color={colors.primary} />
              <Txt size="sm" bold>{label}</Txt>
            </View>
          ))}
        </View>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Txt size="h1" bold center>{slide.title}</Txt>
          <Txt color="text2" center style={{ maxWidth: 340 }}>{slide.text}</Txt>
        </View>
        <Row gap={6}>
          {SLIDES.map((_, i) => <View key={i} style={{ width: i === index ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i <= index ? colors.primary : colors.surface3 }} />)}
        </Row>
      </View>
      <View style={{ gap: 10 }}>
        {last ? <Button block iconRight={ArrowRight} onPress={() => navigation.navigate('Register')}>Get Started</Button> : <Button block iconRight={ArrowRight} onPress={() => setIndex(index + 1)}>Next</Button>}
        <Button block variant="secondary" onPress={() => navigation.navigate('Login')}>I already have an account - Login</Button>
      </View>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ login */
const GoogleG = () => (
  <Svg width={24} height={24} viewBox="0 0 48 48">
    <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </Svg>
);

const AppleLogo = ({ color }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill={color}>
    <Path d="M16.37 12.64c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.4-3.69zM14.1 5.9c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27z" />
  </Svg>
);

function Header2({ icon, title, text }) {
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      {icon === 'logo' ? <LogoMark size={64} /> : <IconTile icon={icon} size={64} />}
      <Txt size="h1" bold center>{title}</Txt>
      {text ? <Txt color="text2" center>{text}</Txt> : null}
    </View>
  );
}

export function LoginScreen() {
  const { login } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState('');
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const social = async (provider) => {
    setServerError('');
    setOauthBusy(provider);
    try {
      await authApi.oauth(provider);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setOauthBusy('');
    }
  };

  const submit = async () => {
    setServerError('');
    const errs = {};
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter a valid email address.';
    if (!form.password) errs.password = 'Enter your password.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`${t('home.welcome')} ${user.name.split(' ')[0]}!`);
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell top={<Row style={{ justifyContent: 'flex-end' }}><LanguageMenu /></Row>}>
      <Header2 icon="logo" title="MyStudyAI" text={t('auth.tagline')} />
      <Card style={{ gap: 14 }}>
        {serverError ? <Alert>{serverError}</Alert> : null}
        <TextInput label={t('auth.email')} icon={Mail} placeholder={t('auth.emailPh')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={form.email} onChangeText={set('email')} error={errors.email} />
        <PasswordInput label={t('auth.password')} icon={Lock} placeholder={t('auth.passwordPh')} autoComplete="password" value={form.password} onChangeText={set('password')} error={errors.password} onSubmitEditing={submit} />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end' }}><Txt size="sm" bold color="primary">{t('auth.forgot')}</Txt></Pressable>
        <Button block loading={loading} onPress={submit}>{t('auth.signIn')}</Button>
        <Row style={{ justifyContent: 'center' }} gap={6}>
          <Txt size="sm" color="text2">{t('auth.noAccount')}</Txt>
          <Pressable onPress={() => navigation.navigate('Register')}><Txt size="sm" bold color="primary">{t('auth.signUp')}</Txt></Pressable>
        </Row>
      </Card>
      <Row gap={12}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Txt size="sm" color="muted">{t('auth.orContinue')}</Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </Row>
      <Row gap={16} style={{ justifyContent: 'center' }}>
        <Pressable onPress={() => social('google')} disabled={Boolean(oauthBusy)} accessibilityLabel="Continue with Google" style={{ width: 62, height: 54, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: oauthBusy ? 0.5 : 1 }}><GoogleG /></Pressable>
        <Pressable onPress={() => social('apple')} disabled={Boolean(oauthBusy)} accessibilityLabel="Continue with Apple" style={{ width: 62, height: 54, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: oauthBusy ? 0.5 : 1 }}><AppleLogo color={colors.text} /></Pressable>
      </Row>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ register */
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export function RegisterScreen() {
  const { register } = useAuth();
  const toast = useToast();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { colors } = useTheme();
  const [confirmSent, setConfirmSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const strength = passwordStrength(form.password);
  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Use at least 8 characters.';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Include at least one letter and one number.';
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password });
      if (res.needsConfirmation) { setConfirmSent(true); setLoading(false); return; }
      toast.success("Account created! Let's personalise your experience.");
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <AuthShell>
        <Header2 icon={Mail} title="Check your email" text={`We sent a confirmation link to ${form.email}. Open it, then log in.`} />
        <Button block onPress={() => navigation.navigate('Login')}>{t('auth.signIn')}</Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell top={<Row style={{ justifyContent: 'flex-end' }}><LanguageMenu /></Row>}>
      <Header2 icon="logo" title={t('auth.createAccount')} text={t('auth.tagline')} />
      <Card style={{ gap: 14 }}>
        {serverError ? <Alert>{serverError}</Alert> : null}
        <TextInput label={t('auth.fullName')} icon={User} placeholder="e.g. Priya Sharma" autoComplete="name" value={form.name} onChangeText={set('name')} error={errors.name} />
        <TextInput label={t('auth.email')} icon={Mail} placeholder={t('auth.emailPh')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={form.email} onChangeText={set('email')} error={errors.email} />
        <PasswordInput label={t('auth.password')} icon={Lock} placeholder="At least 8 characters" value={form.password} onChangeText={set('password')} error={errors.password} hint={form.password ? `Strength: ${strengthLabel}` : 'Use letters and numbers'} />
        {form.password ? <ProgressBar thin value={(strength / 4) * 100} color={strength < 2 ? colors.danger : strength < 3 ? colors.warning : colors.success} /> : null}
        <PasswordInput label={t('auth.confirm')} icon={Lock} placeholder="Repeat your password" value={form.confirmPassword} onChangeText={set('confirmPassword')} error={errors.confirmPassword} />
        <Button block loading={loading} icon={UserPlus} onPress={submit}>{t('auth.createAccount')}</Button>
        <Row style={{ justifyContent: 'center' }} gap={6}>
          <Txt size="sm" color="text2">{t('auth.haveAccount')}</Txt>
          <Pressable onPress={() => navigation.navigate('Login')}><Txt size="sm" bold color="primary">{t('auth.signIn')}</Txt></Pressable>
        </Row>
      </Card>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ forgot / reset */
export function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
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

  return (
    <AuthShell top={<IconButton icon={ArrowLeft} onPress={() => navigation.navigate('Login')} label="Back to login" />}>
      <Header2 icon={KeyRound} title="Forgot password?" text="Enter your account email and we'll send you a link to reset your password." />
      {result ? (
        <Card style={{ gap: 14 }}>
          <Alert type="success" icon={Send}>{result.message}</Alert>
          <Button block variant="secondary" onPress={() => navigation.navigate('Login')}>Back to Login</Button>
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          <TextInput label="Email" icon={Mail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} error={error} />
          <Button block loading={loading} icon={Send} onPress={submit}>Send reset link</Button>
        </Card>
      )}
    </AuthShell>
  );
}

export function ResetPasswordScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const [ready, setReady] = useState(null);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let done = false;
    const { data: sub } = session.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) { done = true; setReady(true); }
    });
    session.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setTimeout(() => !done && setReady(false), 2500);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    const errs = {};
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) errs.password = 'Use 8+ characters with letters and numbers.';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setServerError('');
    try {
      await authApi.resetPassword({ password: form.password });
      await session.auth.signOut();
      toast.success('Password updated. Please log in.');
    } catch (err) {
      setServerError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <Header2 icon={ShieldCheck} title="Set a new password" text="Choose a strong password you haven't used before." />
      {ready === null ? <Spinner size="large" /> : !ready ? (
        <Card style={{ gap: 14 }}>
          <Alert>This reset link is invalid or has expired. Please request a new link.</Alert>
          <Button block onPress={() => navigation.navigate('ForgotPassword')}>Request new link</Button>
        </Card>
      ) : (
        <Card style={{ gap: 14 }}>
          {serverError ? <Alert>{serverError}</Alert> : null}
          <PasswordInput label="New password" icon={Lock} value={form.password} onChangeText={(v) => setForm({ ...form, password: v })} error={errors.password} />
          <PasswordInput label="Confirm new password" icon={Lock} value={form.confirmPassword} onChangeText={(v) => setForm({ ...form, confirmPassword: v })} error={errors.confirmPassword} />
          <Button block loading={loading} onPress={submit}>Reset password</Button>
        </Card>
      )}
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ problems */
export function SkipLoginErrorScreen({ reason }) {
  const disabled = reason === 'anonymous_disabled';
  return (
    <AuthShell>
      <Header2
        icon={WifiOff}
        title="Can't open MyStudyAI"
        text={disabled
          ? 'Skip-login needs guest accounts. In Supabase open Authentication → Sign In / Providers and turn on "Allow anonymous sign-ins", then reload.'
          : 'Could not reach Supabase. Check your internet connection and the keys in mobile/.env, then reload.'}
      />
      {!disabled && reason ? <Txt size="xs" color="muted" center>{reason}</Txt> : null}
      <Button block icon={RefreshCw} onPress={reloadApp}>Try again</Button>
      <Txt size="xs" color="muted" center>To use normal accounts instead, set EXPO_PUBLIC_SKIP_LOGIN=false in mobile/.env.</Txt>
    </AuthShell>
  );
}

const ISSUES = {
  backend_offline: { title: 'Start the MyStudyAI server', text: "The app can't reach its backend. A phone cannot use localhost: set EXPO_PUBLIC_API_URL to your computer's address.", steps: ['Open a terminal in the backend folder', 'npm run dev', 'In mobile/.env: EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:5000/api', 'Restart Expo, then reload.'] },
  not_configured: { title: 'Connect the server to Supabase', text: 'The backend is running but has no Supabase keys.', steps: ['Supabase → Project Settings → API', 'In backend/.env set:', 'SUPABASE_URL=https://<project-ref>.supabase.co\nSUPABASE_ANON_KEY=<anon key>\nSUPABASE_SERVICE_ROLE_KEY=<service_role key>', 'The server restarts automatically; then reload.'] },
  not_migrated: { title: 'Create the database tables', text: "Supabase is connected, but the MyStudyAI tables don't exist yet.", steps: ['Supabase → SQL Editor', 'Run the files in backend/supabase/migrations in order, then backend/supabase/seed.sql', 'Then reload.'] },
  unreachable: { title: "Can't reach Supabase", text: "The server couldn't connect to your Supabase project.", steps: ['Check SUPABASE_URL and the keys in backend/.env', 'Check your internet connection', 'If the project is paused, restore it in the Supabase dashboard.'] },
};

export function SetupRequiredScreen({ issue }) {
  const info = ISSUES[issue] || ISSUES.unreachable;
  const { colors } = useTheme();
  return (
    <AuthShell>
      <Header2 icon="logo" title={info.title} text={info.text} />
      <Card style={{ gap: 12 }}>
        <Row><Settings2 size={16} color={colors.text2} /><Txt size="sm" bold>Setup</Txt></Row>
        {info.steps.map((s) => (
          s.includes('\n') || /^(npm|EXPO_|SUPABASE_)/.test(s)
            ? <View key={s} style={{ backgroundColor: colors.surface2, borderRadius: 10, padding: 10 }}><Text selectable style={{ fontFamily: 'monospace', fontSize: 12, color: colors.text }}>{s}</Text></View>
            : <Txt key={s} size="sm">• {s}</Txt>
        ))}
        <Button block icon={RefreshCw} onPress={reloadApp}>I've done this - reload</Button>
      </Card>
    </AuthShell>
  );
}
