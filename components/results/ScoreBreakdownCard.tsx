import { StyleSheet, Text, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../constants/Fonts';

const safeNum = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null) {
    const x = (v as any).current ?? (v as any).value ?? (v as any).score;
    if (typeof x === 'number') return x;
  }
  return null;
};

// Ordered by real weight in the composite V1 Score, not alphabetically.
const CATEGORIES = [
  { key: 'production', label: 'Production', weight: 45 },
  { key: 'physical', label: 'Athletic', weight: 25 },
  { key: 'academic', label: 'Academic', weight: 15 },
  { key: 'intangibles', label: 'Intangibles', weight: 15 },
];

const TIERS = ['Low', 'Fair', 'Good', 'Strong', 'Elite'];

function tierIndex(value: number): number {
  if (value >= 80) return 4;
  if (value >= 60) return 3;
  if (value >= 40) return 2;
  if (value >= 20) return 1;
  return 0;
}

function StatTierBar({ activeIndex }: { activeIndex: number }) {
  return (
    <View style={s.tierRow}>
      {TIERS.map((t, i) => (
        <View key={t} style={s.tierCol}>
          <View style={[s.tierBar, { backgroundColor: i <= activeIndex ? '#000' : '#eee' }]} />
          <Text style={[s.tierLabel, { color: i === activeIndex ? '#000' : '#ccc' }, i === activeIndex && s.tierLabelActive]}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

interface ScoreBreakdownCardProps {
  scoreBreakdown: Record<string, unknown> | null;
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function ScoreBreakdownCard({ scoreBreakdown, isPremium, onUpgrade }: ScoreBreakdownCardProps) {
  if (isPremium && scoreBreakdown) {
    return (
      <View style={s.grid}>
        {CATEGORIES.map(({ key, label, weight }) => {
          const val = safeNum(scoreBreakdown?.[key]) ?? 0;
          return (
            <View key={key} style={s.whiteCard}>
              <Text style={s.whiteLabel}>{label}</Text>
              <Text style={s.whiteValue}>{val}</Text>
              <Text style={s.whiteWeight}>{weight}% of score</Text>
              <StatTierBar activeIndex={tierIndex(val)} />
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={s.lockedWrap}>
      <View style={s.grid}>
        {CATEGORIES.map(({ key, label, weight }) => (
          <View key={key} style={s.dimCard}>
            <Text style={s.dimLabel}>{label}</Text>
            <Text style={s.dimValue}>--</Text>
            <Text style={s.dimWeight}>{weight}% of score</Text>
          </View>
        ))}
      </View>
      <View style={s.overlay}>
        <Ionicons name="lock-closed-outline" size={24} color="#fff" style={{ marginBottom: 12 }} />
        <Text style={s.overlayTitle}>Full Score Breakdown</Text>
        <Text style={s.overlayBody}>
          See your production, physical, academic, and intangibles breakdown — plus your matched programs and verified coach contacts.
        </Text>
        <Pressable onPress={onUpgrade}>
          <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.upgradeBtn}>
            <Text style={s.upgradeBtnText}>Upgrade to Match+ →</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 24 },
  whiteCard: { flexBasis: '46%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center' },
  whiteLabel: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 },
  whiteValue: { fontFamily: FontFamily.statNumber, fontSize: 40, color: '#000', letterSpacing: -1.2 },
  whiteWeight: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: '#999', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  tierRow: { flexDirection: 'row', gap: 5, marginTop: 16, alignSelf: 'stretch' },
  tierCol: { flex: 1, alignItems: 'center' },
  tierBar: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginBottom: 4 },
  tierLabel: { fontFamily: FontFamily.body, fontSize: 8.5 },
  tierLabelActive: { fontFamily: FontFamily.bodyExtraBold },

  lockedWrap: { borderRadius: 16, marginBottom: 24, overflow: 'hidden', position: 'relative', minHeight: 240 },
  dimCard: { flexBasis: '46%', flexGrow: 1, backgroundColor: '#e8e8e8', borderRadius: 16, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center' },
  dimLabel: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: '#bbb', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 },
  dimValue: { fontFamily: FontFamily.statNumber, fontSize: 40, color: '#ccc' },
  dimWeight: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: '#bbb', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(24,25,29,0.78)',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  overlayTitle: { fontFamily: FontFamily.statNumber, fontSize: 15, color: '#fff', marginBottom: 8, textAlign: 'center' },
  overlayBody: { fontFamily: FontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, textAlign: 'center', marginBottom: 20, maxWidth: 300 },
  upgradeBtn: { paddingHorizontal: 28, paddingVertical: 11, borderRadius: 100 },
  upgradeBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },
});
