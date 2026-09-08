import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../context/ThemeContext';
import { FontFamily } from '../../constants/Fonts';

interface PercentileCardProps {
  percentile: number;
}

export default function PercentileCard({ percentile }: PercentileCardProps) {
  const C = useColors();
  const pct = Math.max(0, Math.min(100, 100 - percentile));

  return (
    <View style={[s.card, { backgroundColor: C.surface }]}>
      <Text style={[s.eyebrow, { color: C.textDim }]}>How You Stack Up</Text>
      <Text style={[s.big, { color: C.text }]}>Top {percentile}%</Text>
      <Text style={[s.sub, { color: C.textMuted }]}>
        You scored higher than <Text style={{ fontFamily: FontFamily.bodyBold, color: C.text }}>{100 - percentile}%</Text> of athletes assessed on V1Portal
      </Text>
      <View style={[s.track, { backgroundColor: C.surfaceAlt }]}>
        <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 24, marginBottom: 24, alignItems: 'center' },
  eyebrow: { fontFamily: FontFamily.bodyBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12 },
  big: { fontFamily: FontFamily.statNumber, fontSize: 42, letterSpacing: -1.6, lineHeight: 44, marginBottom: 6 },
  sub: { fontFamily: FontFamily.body, fontSize: 13, textAlign: 'center', marginBottom: 14 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', alignSelf: 'stretch' },
  fill: { height: '100%', borderRadius: 3 },
});
