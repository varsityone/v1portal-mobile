import { StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '../constants/Fonts';

// Mirrors web's components/StatCard.tsx (TierBar + tier helpers) and the
// inline white stat-card markup used throughout app/dashboard/page.tsx.

export const ACTIVITY_TIERS = ['Start', 'Build', 'Active', 'Strong', 'Elite'];
export const MESSAGE_TIERS = ['Behind', 'Slow', 'Steady', 'Sharp', 'Caught Up'];

export function activityTierIndex(value: number, thresholds: number[]): number {
  let idx = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (value >= thresholds[i]) idx = i + 1;
  }
  return idx;
}

export function unreadTierIndex(count: number): number {
  if (count === 0) return 4;
  if (count <= 2) return 3;
  if (count <= 5) return 2;
  if (count <= 10) return 1;
  return 0;
}

export function TierBar({ tiers, activeIndex }: { tiers: string[]; activeIndex: number }) {
  return (
    <View style={s.row}>
      {tiers.map((t, i) => (
        <View key={t} style={s.col}>
          <View style={[s.seg, i <= activeIndex ? s.segOn : s.segOff]} />
          <Text style={[s.label, i === activeIndex ? s.labelOn : s.labelOff]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  sub: string;
  tiers: string[];
  activeIndex: number;
  onPress?: () => void;
}

export default function StatCard({ label, value, sub, tiers, activeIndex }: StatCardProps) {
  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>{label}</Text>
      <Text style={[s.value, value === 0 && s.valueZero]}>{value}</Text>
      <Text style={s.sub}>{sub}</Text>
      <TierBar tiers={tiers} activeIndex={activeIndex} />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  value: {
    fontFamily: FontFamily.statNumber,
    fontSize: 72,
    lineHeight: 82,
    color: '#000',
    letterSpacing: -3,
    marginBottom: 12,
  },
  valueZero: { color: '#ccc' },
  sub: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 12,
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: 6, marginTop: 16, alignSelf: 'stretch' },
  col: { flex: 1, alignItems: 'center' },
  seg: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginBottom: 5 },
  segOn: { backgroundColor: '#000' },
  segOff: { backgroundColor: '#eee' },
  label: { fontFamily: FontFamily.body, fontSize: 9, letterSpacing: 0.2 },
  labelOn: { fontFamily: FontFamily.bodyExtraBold, color: '#000' },
  labelOff: { color: '#ccc' },
});
