/** MyStudyAI logo, brand lockup, bot icon and avatar. */
import { Image, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { initials } from '../utils/format';

export function LogoMark({ size = 40 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="msai-g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60a5fa" />
          <Stop offset="1" stopColor="#1d4ed8" />
        </LinearGradient>
      </Defs>
      <Rect width="64" height="64" rx="16" fill="#0b1220" />
      <Path d="M14 22c6-3 12-3 18 1v24c-6-4-12-4-18-1z" fill="url(#msai-g)" />
      <Path d="M50 22c-6-3-12-3-18 1v24c6-4 12-4 18-1z" fill="url(#msai-g)" opacity={0.75} />
      <Path d="M47 9l1.8 4.2L53 15l-4.2 1.8L47 21l-1.8-4.2L41 15l4.2-1.8z" fill="#93c5fd" />
    </Svg>
  );
}

export function Brand({ size = 36 }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <Text style={{ fontSize: size * 0.58, fontWeight: '800', color: colors.text }}>
        MyStudy<Text style={{ color: colors.primary }}>AI</Text>
      </Text>
    </View>
  );
}

export function BotIcon({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="7" width="16" height="12" rx="5" fill="#3b82f6" />
      <Circle cx="9.5" cy="13" r="1.6" fill="#fff" />
      <Circle cx="14.5" cy="13" r="1.6" fill="#fff" />
      <Path d="M12 3.5v3.5" stroke="#93c5fd" strokeWidth="1.6" strokeLinecap="round" />
      <Circle cx="12" cy="3.2" r="1.3" fill="#93c5fd" />
    </Svg>
  );
}

export function Avatar({ user, size = 44 }) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
  if (user?.avatarUrl) return <View style={box}><Image source={{ uri: user.avatarUrl }} style={{ width: size, height: size }} /></View>;
  return (
    <View style={box}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: size * 0.38 }}>{initials(user?.name)}</Text>
    </View>
  );
}
