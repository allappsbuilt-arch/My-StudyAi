/** Lightweight SVG charts: BarChart, LineChart, HBarList (no chart library). */
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Circle, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { ProgressBar } from './Ui';

function niceMax(max) {
  if (max <= 0) return 10;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function BarChart({ data, valueKey, labelKey, formatValue = (v) => v, todayIndex, height = 160 }) {
  const { colors } = useTheme();
  const [sel, setSel] = useState(null);
  const max = niceMax(Math.max(...data.map((d) => d[valueKey] || 0)));
  return (
    <View>
      <View style={{ height: 22, alignItems: 'center', justifyContent: 'center' }}>
        {sel !== null && data[sel] ? (
          <Text style={{ color: colors.text2, fontSize: 12 }}>
            {data[sel].tooltipLabel || data[sel][labelKey]}: <Text style={{ fontWeight: '700', color: colors.text }}>{formatValue(data[sel][valueKey] || 0)}</Text>
          </Text>
        ) : null}
      </View>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {data.map((d, i) => {
          const v = d[valueKey] || 0;
          return (
            <Pressable key={i} onPress={() => setSel(sel === i ? null : i)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <View style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 2, borderRadius: 6, backgroundColor: v ? (i === todayIndex ? colors.primary : colors.primary + '99') : colors.surface3 }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: i === todayIndex ? colors.primary : colors.muted, fontWeight: i === todayIndex ? '700' : '400' }}>{d[labelKey]}</Text>
        ))}
      </View>
    </View>
  );
}

export function LineChart({ points, height = 170, max = 100, formatValue = (v) => `${v}%` }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState(null);
  const pad = { top: 16, right: 16, bottom: 16, left: 38 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const x = (i) => pad.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v) => pad.top + h - (v / max) * h;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${pad.top + h} L${x(0)},${pad.top + h} Z` : '';
  const hp = hover !== null ? points[hover] : null;

  return (
    <View onLayout={(e) => setWidth(Math.max(240, Math.round(e.nativeEvent.layout.width)))}>
      <View style={{ height: 22, alignItems: 'center', justifyContent: 'center' }}>
        {hp ? <Text style={{ color: colors.text2, fontSize: 12 }}>{hp.label}: <Text style={{ fontWeight: '700', color: colors.text }}>{formatValue(hp.value)}</Text></Text> : null}
      </View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.18" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 50, 100].map((g) => (
          <G key={g}>
            <Line x1={pad.left} x2={width - pad.right} y1={y((g / 100) * max)} y2={y((g / 100) * max)} stroke={colors.border} strokeDasharray="4 4" />
            <SvgText x={pad.left - 8} y={y((g / 100) * max) + 4} textAnchor="end" fontSize="11" fill={colors.muted}>{formatValue((g / 100) * max)}</SvgText>
          </G>
        ))}
        {area ? <Path d={area} fill="url(#lc-fill)" /> : null}
        <Path d={path} fill="none" stroke={colors.primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <G key={i}>
            <Circle cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4.5} fill={colors.primary} stroke={colors.surface} strokeWidth="2" />
            <Rect x={x(i) - w / Math.max(points.length, 2) / 2} y={pad.top} width={w / Math.max(points.length, 2)} height={h} fill="transparent" onPress={() => setHover(hover === i ? null : i)} />
          </G>
        ))}
      </Svg>
    </View>
  );
}

export function HBarList({ items, formatValue = (v) => `${v}%`, max = 100 }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      {items.map((it) => (
        <View key={it.label} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: colors.text }}>{it.label}</Text>
            <Text style={{ fontWeight: '700', color: colors.text }}>{formatValue(it.value)}</Text>
          </View>
          <ProgressBar thin value={Math.min(100, (it.value / max) * 100)} />
          {it.sub ? <Text style={{ fontSize: 11, color: colors.muted }}>{it.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}
