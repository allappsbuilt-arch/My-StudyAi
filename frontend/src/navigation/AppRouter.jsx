/**
 * All screens and their URLs.
 */
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppLayout from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SetupScreen from '../screens/SetupScreen';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import RecordScreen from '../screens/RecordScreen';
import SocialsScreen from '../screens/SocialsScreen';
import CommunityScreen from '../screens/CommunityScreen';
import GamesScreen from '../screens/GamesScreen';
import GamePlayScreen from '../screens/GamePlayScreen';
import StudyPlanScreen from '../screens/StudyPlanScreen';
import FlashcardsScreen from '../screens/FlashcardsScreen';
import CreateFlashcardsScreen from '../screens/CreateFlashcardsScreen';
import DeckScreen from '../screens/DeckScreen';
import FlashcardStudyScreen from '../screens/FlashcardStudyScreen';
import ScanSolveScreen from '../screens/ScanSolveScreen';
import TranslateScreen from '../screens/TranslateScreen';
import VoiceToTextScreen from '../screens/VoiceToTextScreen';
import TextToVoiceScreen from '../screens/TextToVoiceScreen';
import VoiceConversationScreen from '../screens/VoiceConversationScreen';
import SummarizeScreen from '../screens/SummarizeScreen';
import EssayScreen from '../screens/EssayScreen';
import AITutorScreen from '../screens/AITutorScreen';
import MaterialsScreen from '../screens/MaterialsScreen';
import UploadScreen from '../screens/UploadScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import SummaryScreen from '../screens/SummaryScreen';
import NotesScreen from '../screens/NotesScreen';
import QuizSetupScreen from '../screens/QuizSetupScreen';
import QuizScreen from '../screens/QuizScreen';
import QuizResultScreen from '../screens/QuizResultScreen';
import QuizHistoryScreen from '../screens/QuizHistoryScreen';
import ProgressScreen from '../screens/ProgressScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CoursesScreen from '../screens/CoursesScreen';
import StudyHistoryScreen from '../screens/StudyHistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import NotFoundScreen from '../screens/NotFoundScreen';
import SkipLoginErrorScreen from '../screens/SkipLoginErrorScreen';
import SetupRequiredScreen from '../screens/SetupRequiredScreen';

export default function AppRouter() {
  const { initializing, isAuthenticated, skipLogin, skipError, setupIssue } = useAuth();

  // Splash screen while the saved Supabase session is restored
  if (initializing) return <SplashScreen />;

  // Keys missing, server down or tables not created: explain how to fix it
  if (setupIssue) return <SetupRequiredScreen issue={setupIssue} />;

  // Skip-login mode but the guest sign-in failed: explain instead of showing login pages
  if (skipLogin && !isAuthenticated) return <SkipLoginErrorScreen reason={skipError} />;

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? '/home' : '/welcome'} replace />} />

      {/* Public screens */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/welcome" element={<OnboardingScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordScreen />} />

      {/* Logged-in screens */}
      <Route element={<ProtectedRoute />}>
        <Route path="/setup" element={<SetupScreen />} />
        <Route element={<AppLayout />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/explore" element={<ExploreScreen />} />
          <Route path="/study" element={<Navigate to="/explore" replace />} />
          <Route path="/record" element={<RecordScreen />} />
          <Route path="/socials" element={<SocialsScreen />} />
          <Route path="/socials/c/:slug" element={<CommunityScreen />} />
          <Route path="/games" element={<GamesScreen />} />
          <Route path="/games/:game" element={<GamePlayScreen />} />
          <Route path="/plan" element={<StudyPlanScreen />} />
          <Route path="/flashcards" element={<FlashcardsScreen />} />
          <Route path="/flashcards/new" element={<CreateFlashcardsScreen />} />
          <Route path="/flashcards/:id" element={<DeckScreen />} />
          <Route path="/flashcards/:id/study" element={<FlashcardStudyScreen />} />
          <Route path="/scan" element={<ScanSolveScreen />} />
          <Route path="/translate" element={<TranslateScreen />} />
          <Route path="/translate/voice" element={<VoiceToTextScreen />} />
          <Route path="/translate/speak" element={<TextToVoiceScreen />} />
          <Route path="/translate/conversation" element={<VoiceConversationScreen />} />
          <Route path="/summarize" element={<SummarizeScreen />} />
          <Route path="/essay" element={<EssayScreen />} />
          <Route path="/tutor" element={<AITutorScreen />} />
          <Route path="/materials" element={<MaterialsScreen />} />
          <Route path="/materials/upload" element={<UploadScreen />} />
          <Route path="/materials/:id/analysis" element={<AnalysisScreen />} />
          <Route path="/materials/:id/summary" element={<SummaryScreen />} />
          <Route path="/notes" element={<NotesScreen />} />
          <Route path="/quiz" element={<QuizSetupScreen />} />
          <Route path="/quiz/history" element={<QuizHistoryScreen />} />
          <Route path="/quiz/:id" element={<QuizScreen />} />
          <Route path="/quiz/result/:attemptId" element={<QuizResultScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/profile/settings" element={<SettingsScreen />} />
          <Route path="/profile/courses" element={<CoursesScreen />} />
          <Route path="/profile/history" element={<StudyHistoryScreen />} />
          <Route path="/profile/notifications" element={<NotificationsScreen />} />
          <Route path="/profile/help" element={<HelpScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
