import { useRef } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/context/ThemeContext';
import { I18nProvider } from './src/context/I18nContext';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';
import { markActivity } from './src/hooks/useStudyTimer';

export default function App() {
  const navRef = useRef(null);
  if (__DEV__ && typeof window !== 'undefined') window.__nav = navRef; // dev aid: window.__nav.current.navigate('Notes')
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <ToastProvider>
            <AuthProvider>
              <View style={{ flex: 1 }} onTouchStart={markActivity}>
                <AppNavigator navRef={navRef} />
              </View>
            </AuthProvider>
          </ToastProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
