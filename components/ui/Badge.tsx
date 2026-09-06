import { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FontFamily } from '../../constants/Fonts';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

type Tone = 'success' | 'warning' | 'error' | 'primary' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: Tone;
  style?: ViewStyle;
}

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const color = toneColor(C, tone);

  return (
    <View style={[s.badge, { backgroundColor: `${color}22` }, style]}>
      <Text style={[s.text, { color }]}>{label}</Text>
    </View>
  );
}

// A smaller, borderless variant used for inline tags (position codes, filter counts).
export function Pill({ label, tone = 'neutral', active, style }: BadgeProps & { active?: boolean }) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const color = toneColor(C, tone);

  return (
    <View style={[s.pill, active ? { backgroundColor: `${color}18`, borderColor: color } : { borderColor: C.border }, style]}>
      <Text style={[s.pillText, active && { color }]}>{label}</Text>
    </View>
  );
}

function toneColor(C: ThemeColors, tone: Tone): string {
  switch (tone) {
    case 'success': return C.success;
    case 'warning': return C.warning;
    case 'error': return C.error;
    case 'primary': return C.primary;
    default: return C.textDim;
  }
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    badge: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
    text: { fontFamily: FontFamily.bodyExtraBold, fontSize: 9, letterSpacing: 0.5 },
    pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5 },
    pillText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim },
  });
}
