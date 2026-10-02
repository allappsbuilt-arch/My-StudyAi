/**
 * All screens. Signed-out: welcome/login stack. Signed-in: bottom tabs (Home, Explore, Record,
 * Socials, Games) with every other screen pushed on top of them.
 */
import { useEffect } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Compass, Gamepad2, Home, Mic, Users } from 'lucide-react-native';
import * as ExpoLinking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { useTheme } from '../context/ThemeContext';
import { useStudyTimer } from '../hooks/useStudyTimer';
import { useDailyReminder } from '../hooks/useDailyReminder';
import { authApi } from '../services/api';
import * as S from '../screens';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = [
  { name: 'Home', label: 'nav.home', icon: Home, component: S.HomeScreen },
  { name: 'Explore', label: 'nav.explore', icon: Compass, component: S.ExploreScreen },
  { name: 'Record', label: 'nav.record', icon: Mic, component: S.RecordScreen, center: true },
  { name: 'Socials', label: 'nav.socials', icon: Users, component: S.SocialsScreen },
  { name: 'Games', label: 'nav.games', icon: Gamepad2, component: S.GamesScreen },
];

function TabBar({ state, navigation }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 8, alignItems: 'flex-end' }}>
      {state.routes.map((route, index) => {
        const item = TABS.find((x) => x.name === route.name);
        const focused = state.index === index;
        const Icon = item.icon;
        const onPress = () => {
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        if (item.center) {
          return (
            <Pressable key={route.key} onPress={onPress} accessibilityLabel={t(item.label)} style={{ flex: 1, alignItems: 'center', marginTop: -26 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
                <Icon size={26} color="#fff" />
              </View>
              <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2, color: focused ? colors.primary : colors.muted }}>{t(item.label)}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable key={route.key} onPress={onPress} accessibilityLabel={t(item.label)} style={{ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 }}>
            <Icon size={22} color={focused ? colors.primary : colors.muted} />
            <Text style={{ fontSize: 11, fontWeight: focused ? '700' : '500', color: focused ? colors.primary : colors.muted }}>{t(item.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {TABS.map((t) => <Tab.Screen key={t.name} name={t.name} component={t.component} />)}
    </Tab.Navigator>
  );
}

const APP_SCREENS = {
  Setup: S.SetupScreen,
  Community: S.CommunityScreen,
  GamePlay: S.GamePlayScreen,
  StudyPlan: S.StudyPlanScreen,
  Flashcards: S.FlashcardsScreen,
  CreateFlashcards: S.CreateFlashcardsScreen,
  Deck: S.DeckScreen,
  FlashcardStudy: S.FlashcardStudyScreen,
  Scan: S.ScanSolveScreen,
  Translate: S.TranslateScreen,
  VoiceToText: S.VoiceToTextScreen,
  TextToVoice: S.TextToVoiceScreen,
  VoiceConversation: S.VoiceConversationScreen,
  Summarize: S.SummarizeScreen,
  Essay: S.EssayScreen,
  Tutor: S.AITutorScreen,
  Materials: S.MaterialsScreen,
  Upload: S.UploadScreen,
  Analysis: S.AnalysisScreen,
  Summary: S.SummaryScreen,
  Notes: S.NotesScreen,
  QuizSetup: S.QuizSetupScreen,
  QuizHistory: S.QuizHistoryScreen,
  Quiz: S.QuizScreen,
  QuizResult: S.QuizResultScreen,
  Progress: S.ProgressScreen,
  Profile: S.ProfileScreen,
  Settings: S.SettingsScreen,
  Courses: S.CoursesScreen,
  StudyHistory: S.StudyHistoryScreen,
  Notifications: S.NotificationsScreen,
  Help: S.HelpScreen,
};

const linking = {
  prefixes: [ExpoLinking.createURL('/'), 'mystudyai://'],
  config: { screens: { ResetPassword: 'reset-password', Tabs: { screens: { Home: 'home' } } } },
};

/** A Supabase recovery link opened the app: sign the student in with it, then ask for a new password. */
function useAuthLinks(navRef) {
  useEffect(() => {
    const handle = async (url) => {
      if (!url || !/access_token=/.test(url)) return;
      try {
        await authApi.sessionFromUrl(url);
        if (/type=recovery/.test(url)) navRef.current?.navigate('ResetPassword');
      } catch { /* invalid or expired link */ }
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [navRef]);
}

export default function AppNavigator({ navRef }) {
  const { initializing, isAuthenticated, skipLogin, skipError, setupIssue, user } = useAuth();
  const { isDark, colors } = useTheme();
  useStudyTimer(isAuthenticated);
  useDailyReminder(user);
  useAuthLinks(navRef);

  const navTheme = { ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background: colors.bg, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } };

  let content;
  if (initializing) content = <Stack.Screen name="Splash" component={S.SplashScreen} />;
  else if (setupIssue) content = <Stack.Screen name="SetupRequired">{() => <S.SetupRequiredScreen issue={setupIssue} />}</Stack.Screen>;
  else if (skipLogin && !isAuthenticated) content = <Stack.Screen name="SkipLoginError">{() => <S.SkipLoginErrorScreen reason={skipError} />}</Stack.Screen>;
  else if (!isAuthenticated) {
    content = (
      <>
        <Stack.Screen name="Welcome" component={S.OnboardingScreen} />
        <Stack.Screen name="Login" component={S.LoginScreen} />
        <Stack.Screen name="Register" component={S.RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={S.ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={S.ResetPasswordScreen} />
      </>
    );
  } else {
    content = (
      <>
        <Stack.Screen name="Tabs" component={Tabs} />
        {Object.entries(APP_SCREENS).map(([name, component]) => <Stack.Screen key={name} name={name} component={component} />)}
        <Stack.Screen name="ResetPassword" component={S.ResetPasswordScreen} />
      </>
    );
  }

  return (
    <NavigationContainer ref={navRef} theme={navTheme} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: Platform.OS === 'web' ? 'none' : 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }}>
        {content}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
