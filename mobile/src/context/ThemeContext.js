/** Light / dark theme, remembered on the device and in the student's profile. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import { dark, light } from '../theme';

const ThemeContext = createContext(null);
const KEY = 'mystudyai_theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'));

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === 'light' || v === 'dark') setThemeState(v); }).catch(() => {});
  }, []);

  const setTheme = useCallback((t) => {
    const next = t === 'dark' ? 'dark' : 'light';
    setThemeState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }, []);
  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(() => ({ theme, isDark: theme === 'dark', colors: theme === 'dark' ? dark : light, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** const styles = useStyles((c) => StyleSheet.create({ ... })) - rebuilt when the theme changes. */
export function useStyles(factory) {
  const { colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(colors), [colors]);
}
