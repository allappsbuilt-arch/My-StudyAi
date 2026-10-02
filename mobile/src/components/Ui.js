/**
 * Core building blocks: Txt, Card, Button, IconButton, Chip, Row helpers, inputs, Switch,
 * Segmented, Tabs, Modal sheet, ConfirmDialog, AlertDialog, ProgressBar/Ring, state views.
 */
import { useState } from 'react';
import {
  ActivityIndicator, Modal as RNModal, Pressable, Switch as RNSwitch, Text, TextInput as RNTextInput, View, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AlertTriangle, ChevronRight, Eye, EyeOff, RefreshCw, Search, WifiOff, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

/* ---------------------------------------------------------------- text */
const SIZES = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, h2: 22, h1: 26, hero: 32 };

export function Txt({ size = 'md', bold, weight, color = 'text', center, style, children, ...rest }) {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontSize: SIZES[size] || size, color: colors[color] || color, fontWeight: weight || (bold ? '700' : '400'), textAlign: center ? 'center' : undefined }, style]}
    >
      {children}
    </Text>
  );
}

/* ---------------------------------------------------------------- layout */
export const shadowSm = (c) => ({ shadowColor: c.shadow, shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 });

export function Card({ children, style, onPress, tone, padded = true, ...rest }) {
  const { colors } = useTheme();
  const bg = tone === 'primary' ? colors.primary : tone === 'soft' ? colors.primarySoft : colors.surface;
  const base = [{ backgroundColor: bg, borderRadius: radius.lg, borderWidth: tone ? 0 : 1, borderColor: colors.border, padding: padded ? 16 : 0 }, shadowSm(colors), style];
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]} {...rest}>{children}</Pressable>;
  return <View style={base} {...rest}>{children}</View>;
}

export function Row({ children, gap = 10, between, center = true, wrap, style }) {
  return <View style={[{ flexDirection: 'row', alignItems: center ? 'center' : 'flex-start', gap, justifyContent: between ? 'space-between' : undefined, flexWrap: wrap ? 'wrap' : undefined }, style]}>{children}</View>;
}

export const Spacer = ({ h = 12 }) => <View style={{ height: h }} />;

export function IconTile({ icon: Icon, size = 44, color, bg, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg || colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon size={size * 0.5} color={color || colors.primary} />
    </View>
  );
}

/* ---------------------------------------------------------------- buttons */
export function Button({ children, variant = 'primary', size, block, loading, disabled, icon: Icon, iconRight: IconRight, onPress, style }) {
  const { colors } = useTheme();
  const v = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.danger, fg: '#fff', border: colors.danger },
    soft: { bg: colors.primarySoft, fg: colors.primary, border: 'transparent' },
  }[variant];
  const sm = size === 'sm';
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [{
        backgroundColor: v.bg, borderColor: v.border, borderWidth: 1, borderRadius: sm ? 12 : 16, paddingVertical: sm ? 9 : 14, paddingHorizontal: sm ? 14 : 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: block ? 'stretch' : 'flex-start', opacity: off ? 0.55 : pressed ? 0.85 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : Icon ? <Icon size={sm ? 16 : 18} color={v.fg} /> : null}
      {typeof children === 'string' ? <Text style={{ color: v.fg, fontWeight: '700', fontSize: sm ? 13 : 15 }}>{children}</Text> : children}
      {!loading && IconRight ? <IconRight size={sm ? 16 : 18} color={v.fg} /> : null}
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress, size = 40, color, bg, label, style, active }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? (active ? colors.primarySoft : colors.surface), borderWidth: bg ? 0 : 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Icon size={size * 0.5} color={color || (active ? colors.primary : colors.text)} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon: Icon, style }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }, style]}
    >
      {Icon ? <Icon size={14} color={selected ? colors.primary : colors.text2} /> : null}
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? colors.primary : colors.text2 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ children, tone = 'primary', style }) {
  const { colors } = useTheme();
  const map = { primary: [colors.primarySoft, colors.primary], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning], danger: [colors.dangerSoft, colors.danger], muted: [colors.surface2, colors.text2] }[tone];
  return (
    <View style={[{ backgroundColor: map[0], borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }, style]}>
      <Text style={{ color: map[1], fontSize: 11, fontWeight: '700' }}>{children}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- inputs */
export function Field({ label, error, hint, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text2 }}>{label}</Text> : null}
      {children}
      {error ? <Text style={{ fontSize: 12, color: colors.danger }}>{error}</Text> : hint ? <Text style={{ fontSize: 12, color: colors.muted }}>{hint}</Text> : null}
    </View>
  );
}

const inputBox = (c, error, focused) => ({
  flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1.5,
  borderColor: error ? c.danger : focused ? c.primary : c.border, paddingHorizontal: 14,
});

export function TextInput({ label, error, hint, icon: Icon, right, multiline, style, inputStyle, ...rest }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} error={error} hint={hint}>
      <View style={[inputBox(colors, error, focused), multiline && { alignItems: 'flex-start', paddingVertical: 8 }, style]}>
        {Icon ? <Icon size={18} color={colors.muted} /> : null}
        <RNTextInput
          {...rest}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colors.muted}
          style={[{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: multiline ? 6 : 13, minHeight: multiline ? 96 : undefined, textAlignVertical: multiline ? 'top' : 'center' }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null, inputStyle]}
        />
        {right}
      </View>
    </Field>
  );
}

export function PasswordInput(props) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  return (
    <TextInput
      {...props}
      secureTextEntry={!show}
      autoCapitalize="none"
      autoCorrect={false}
      right={<Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>{show ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}</Pressable>}
    />
  );
}

export const TextArea = (props) => <TextInput multiline {...props} />;

export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return <TextInput value={value} onChangeText={onChange} placeholder={placeholder} icon={Search} returnKeyType="search" />;
}

/** Choose one option from a list in a bottom sheet. */
export function Select({ label, value, onChange, options = [], placeholder = 'Select...', error }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const current = opts.find((o) => o.value === value);
  return (
    <Field label={label} error={error}>
      <Pressable onPress={() => setOpen(true)} style={[inputBox(colors, error, false), { paddingVertical: 14, justifyContent: 'space-between' }]}>
        <Text style={{ color: current ? colors.text : colors.muted, fontSize: 15, flex: 1 }}>{current ? current.label : placeholder}</Text>
        <ChevronRight size={18} color={colors.muted} style={{ transform: [{ rotate: '90deg' }] }} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label || placeholder}>
        <ScrollView style={{ maxHeight: 380 }}>
          {opts.map((o) => (
            <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }} style={{ paddingVertical: 14 }}>
              <Text style={{ fontSize: 15, color: o.value === value ? colors.primary : colors.text, fontWeight: o.value === value ? '700' : '400' }}>{o.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>
    </Field>
  );
}

export function Switch({ checked, onChange, disabled }) {
  const { colors } = useTheme();
  return <RNSwitch value={Boolean(checked)} onValueChange={onChange} disabled={disabled} trackColor={{ false: colors.surface3, true: colors.primary }} thumbColor="#fff" />;
}

/* ---------------------------------------------------------------- tabs */
export function Segmented({ options, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: 14, padding: 4 }}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11, backgroundColor: on ? colors.surface : 'transparent' }}>
            {o.icon ? <o.icon size={15} color={on ? colors.primary : colors.text2} /> : null}
            <Text style={{ fontSize: 13, fontWeight: '700', color: on ? colors.primary : colors.text2 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Tabs({ tabs, value, onChange }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
      {tabs.map((t) => {
        const on = value === t.value;
        return (
          <Pressable key={t.value} onPress={() => onChange(t.value)} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2.5, borderBottomColor: on ? colors.primary : 'transparent' }}>
            <Text style={{ fontWeight: '700', color: on ? colors.primary : colors.muted }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ExploreRow({ icon, title, desc, onPress, right }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
      <IconTile icon={icon} />
      <View style={{ flex: 1 }}>
        <Txt bold>{title}</Txt>
        {desc ? <Txt size="sm" color="text2">{desc}</Txt> : null}
      </View>
      {right || <ChevronRight size={20} color={colors.muted} />}
    </Card>
  );
}

/* ---------------------------------------------------------------- modals */
export function Sheet({ open, onClose, title, children, footer, center }) {
  const { colors } = useTheme();
  return (
    <RNModal visible={open} transparent animationType={center ? 'fade' : 'slide'} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: center ? 'center' : 'flex-end', padding: center ? 24 : 0 }} onPress={onClose}>
          <Pressable
            onPress={() => {}}
            style={[{ backgroundColor: colors.surface, padding: 20, gap: 14, maxHeight: '88%', borderRadius: radius.xl }, center ? null : { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 30 }]}
          >
            {title ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt size="xl" bold style={{ flex: 1 }}>{title}</Txt>
                <Pressable onPress={onClose} hitSlop={8}><X size={22} color={colors.text2} /></Pressable>
              </View>
            ) : null}
            {children}
            {footer ? <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', danger = true, loading, onConfirm, onCancel }) {
  return (
    <Sheet open={open} onClose={onCancel} title={title} center footer={<><Button variant="secondary" onPress={onCancel} disabled={loading}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={loading}>{confirmLabel}</Button></>}>
      <Txt color="text2">{message}</Txt>
    </Sheet>
  );
}

export function AlertDialog({ open, title, message, onClose, okLabel = 'OK' }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} center footer={<Button variant="ghost" size="sm" onPress={onClose}>{okLabel}</Button>}>
      <Txt color="text2">{message}</Txt>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- progress */
export function ProgressBar({ value = 0, thin, onHero, color }) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height: thin ? 6 : 10, borderRadius: 99, backgroundColor: onHero ? 'rgba(255,255,255,0.28)' : colors.surface3, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 99, backgroundColor: onHero ? '#fff' : color || colors.primary }} />
    </View>
  );
}

export function ProgressRing({ value = 0, size = 120, stroke = 10, color, track, children }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track || colors.surface3} strokeWidth={stroke} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || colors.primary} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c}`} strokeDashoffset={c - (pct / 100) * c} />
      </Svg>
      {children}
    </View>
  );
}

/* ---------------------------------------------------------------- states */
export function Spinner({ size = 'small' }) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={colors.primary} />;
}

export function PageLoader({ label = 'Loading...' }) {
  return (
    <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
      <Spinner size="large" />
      <Txt color="muted">{label}</Txt>
    </View>
  );
}

export function SkeletonList({ count = 3, height = 72 }) {
  const { colors } = useTheme();
  return <View style={{ gap: 12 }}>{Array.from({ length: count }).map((_, i) => <View key={i} style={{ height, borderRadius: 20, backgroundColor: colors.surface2 }} />)}</View>;
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 10 }}>
      {icon ? <IconTile icon={icon} size={64} /> : null}
      <Txt size="lg" bold center>{title}</Txt>
      {message ? <Txt color="text2" center>{message}</Txt> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry }) {
  const { colors } = useTheme();
  const offline = /reach the MyStudyAI server|connection/i.test(message || '');
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 10 }}>
      <IconTile icon={offline ? WifiOff : AlertTriangle} size={64} color={colors.danger} bg={colors.dangerSoft} />
      <Txt size="lg" bold center>{offline ? "You're offline" : 'Something went wrong'}</Txt>
      <Txt color="text2" center>{message}</Txt>
      {onRetry ? <Button variant="secondary" size="sm" icon={RefreshCw} onPress={() => onRetry()}>Try again</Button> : null}
    </View>
  );
}

export function Alert({ type = 'error', icon: Icon = AlertTriangle, children }) {
  const { colors } = useTheme();
  const map = { error: [colors.dangerSoft, colors.danger], info: [colors.primarySoft, colors.primary], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning] }[type];
  return (
    <View style={{ flexDirection: 'row', gap: 10, backgroundColor: map[0], padding: 12, borderRadius: 14, alignItems: 'flex-start' }}>
      <Icon size={18} color={map[1]} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, color: map[1], fontSize: 13.5, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

/* ---------------------------------------------------------------- list rows */
export function GroupTitle({ children }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: 6 }}>{children}</Text>;
}

/** Row inside a <Card padded={false}> list: icon tile, title/desc, right element (switch, chevron, value...). */
export function ListRow({ icon: Icon, title, desc, right, onPress, danger, first, tone, disabled }) {
  const { colors } = useTheme();
  const body = (
    <>
      {Icon ? <IconTile icon={Icon} size={38} color={danger ? colors.danger : tone ? colors[tone] : undefined} bg={danger ? colors.dangerSoft : tone ? colors[`${tone}Soft`] : undefined} /> : null}
      <View style={{ flex: 1 }}>
        <Txt bold color={danger ? 'danger' : 'text'} numberOfLines={2}>{title}</Txt>
        {desc ? <Txt size="xs" color="muted" numberOfLines={2}>{desc}</Txt> : null}
      </View>
      {right !== undefined ? right : onPress ? <ChevronRight size={18} color={colors.muted} /> : null}
    </>
  );
  const style = { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border };
  return onPress ? <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [style, pressed && { backgroundColor: colors.surface2 }]}>{body}</Pressable> : <View style={style}>{body}</View>;
}
