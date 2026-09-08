import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../../constants/Fonts';
import { RECRUITING_LEVEL_BANDS } from '../../lib/recruitingLevels';

interface RecruitingGapCardProps {
  v1Score: number;
}

export default function RecruitingGapCard({ v1Score }: RecruitingGapCardProps) {
  const currentIndex = RECRUITING_LEVEL_BANDS.findIndex(b => v1Score >= b.minScore);
  const nextBand = currentIndex > 0 ? RECRUITING_LEVEL_BANDS[currentIndex - 1] : null;

  if (!nextBand) return null;

  const pts = nextBand.minScore - v1Score;

  return (
    <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
      <Text style={s.eyebrow}>Recruiting Gap</Text>
      <View style={s.row}>
        <View style={s.ptsWrap}>
          <Text style={s.pts}>{pts}</Text>
          <Text style={s.ptsLabel}>pts needed</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.nextLevel}>→ {nextBand.level}</Text>
          <Text style={s.body}>
            Improve your production and physical scores for the highest-leverage path to the next tier.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 24, marginBottom: 24 },
  eyebrow: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  ptsWrap: { alignItems: 'center', flexShrink: 0 },
  pts: { fontFamily: FontFamily.statNumber, fontSize: 40, color: '#fff', lineHeight: 42 },
  ptsLabel: { fontFamily: FontFamily.body, fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  nextLevel: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff', marginBottom: 6 },
  body: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
});
