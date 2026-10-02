/**
 * Screen wrapper: safe area, optional header ("<- Title" + actions), scroll + keyboard handling.
 *
 *   <Screen title="Notes" back actions={<IconButton .../>}> ... </Screen>
 *   <Screen scroll={false} ...>  (for chat-style screens that manage their own list)
 */
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Txt } from './Ui';

export function goBack(navigation, fallback = 'Tabs') {
  if (navigation.canGoBack()) navigation.goBack();
  else navigation.navigate(fallback);
}

export function Header({ title, eyebrow, back, actions, left }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
      {back ? (
        <Pressable onPress={() => (typeof back === 'string' ? navigation.navigate(back) : goBack(navigation))} hitSlop={8} accessibilityLabel="Go back" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
      ) : null}
      {left}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Txt size="sm" color="muted">{eyebrow}</Txt> : null}
        <Txt size="h2" bold numberOfLines={1}>{title}</Txt>
      </View>
      {actions}
    </View>
  );
}

export default function Screen({ title, eyebrow, back, actions, left, children, scroll = true, onRefresh, refreshing = false, padded = true, footer, header = true }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const showHeader = header && (title || back || actions || left);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      {showHeader ? <Header title={title} eyebrow={eyebrow} back={back} actions={actions} left={left} /> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: padded ? 16 : 0, paddingTop: showHeader ? 4 : padded ? 16 : 0, paddingBottom: footer ? 16 : 32 + (footer ? 0 : 0), gap: 14 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
        {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
}

/** Section title with optional "See all" link. */
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
      <Txt size="lg" bold>{title}</Txt>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Txt size="sm" bold color="primary">{action}</Txt></Pressable> : null}
    </View>
  );
}
