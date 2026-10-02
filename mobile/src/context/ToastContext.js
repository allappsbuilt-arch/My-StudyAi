/** Toast messages: const toast = useToast(); toast.success('Saved!'); toast.error('Oops'); */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { useTheme } from './ThemeContext';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback((type, message, duration = 3500) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, type, message }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const value = useMemo(() => ({
    success: (m) => show('success', m),
    error: (m) => show('error', m, 5000),
    info: (m) => show('info', m),
  }), [show]);

  const icons = { success: CheckCircle2, error: AlertCircle, info: Info };
  const tint = { success: colors.success, error: colors.danger, info: colors.primary };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 90 }]}>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <Pressable key={t.id} onPress={() => dismiss(t.id)} style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: tint[t.type] }]}>
              <Icon size={18} color={tint[t.type]} />
              <Text style={[styles.msg, { color: colors.text }]}>{t.message}</Text>
            </Pressable>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, gap: 8 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderLeftWidth: 4, elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  msg: { flex: 1, fontSize: 14 },
});

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
