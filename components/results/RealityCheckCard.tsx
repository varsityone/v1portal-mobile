import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';
import { FontFamily } from '../../constants/Fonts';

const safeNum = (v: unknown): number | null => {
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null) {
    const x = (v as any).current ?? (v as any).value ?? (v as any).score;
    if (typeof x === 'number') return x;
  }
  return null;
};

const STRENGTH_LABELS: Record<string, string> = {
  physical: 'Athleticism',
  production: 'Production',
  academic: 'Academics',
  intangibles: 'Intangibles',
};

interface RealityCheckCardProps {
  scoreBreakdown: Record<string, unknown> | null;
  gateResults: any;
  developmentPotential: any;
  developmentPathway: any;
}

export default function RealityCheckCard({ scoreBreakdown, gateResults, developmentPotential, developmentPathway }: RealityCheckCardProps) {
  const C = useColors();

  const topStrengthEntry = scoreBreakdown
    ? Object.entries(scoreBreakdown)
        .filter(([k]) => Object.keys(STRENGTH_LABELS).includes(k))
        .sort(([, a], [, b]) => (safeNum(b) ?? 0) - (safeNum(a) ?? 0))[0]
    : null;
  const topStrengthLabel = topStrengthEntry ? STRENGTH_LABELS[topStrengthEntry[0]] : null;
  const topStrengthVal = topStrengthEntry ? safeNum(topStrengthEntry[1]) : null;

  const failedGates = (gateResults?.failedGates ?? []) as any[];
  const keyFlagFailures = (failedGates[0]?.failures ?? []) as string[];
  const keyFlag = keyFlagFailures[0] ?? null;
  const keyFlagCategory = failedGates[0]?.category ?? null;
  const otherKeyFlags = keyFlagFailures.slice(1);

  const devTrajectory = developmentPotential?.trajectory ?? null;
  const devRecommendation = developmentPotential?.recommendation ?? null;
  const topPriority = developmentPathway?.priorities?.[0] ?? null;

  if (!topStrengthLabel && !keyFlag && !devTrajectory) return null;

  const hasSecondary = !!(keyFlag || devTrajectory || topPriority);

  return (
    <View style={{ marginBottom: 24 }}>
      {topStrengthLabel && (
        <View style={[s.strengthCard, { backgroundColor: C.surface, marginBottom: hasSecondary ? 14 : 0 }]}>
          <View style={s.strengthIcon}>
            <Ionicons name="arrow-up-circle" size={30} color="#71ff7e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.strengthEyebrow}>Top Strength</Text>
            <Text style={[s.strengthValue, { color: C.text }]}>
              {topStrengthLabel}{topStrengthVal !== null ? ` — ${topStrengthVal}%` : ''}
            </Text>
            <Text style={[s.strengthBody, { color: C.textDim }]}>
              This is your highest-scoring category and your best recruiting leverage point.
            </Text>
          </View>
        </View>
      )}

      {hasSecondary && (
        <View style={s.secondaryGrid}>
          {keyFlag && (
            <View style={[s.secondaryCard, { backgroundColor: C.surface }]}>
              <Ionicons name="flag" size={22} color="#e63535" style={s.secondaryIcon} />
              <View style={{ flex: 1 }}>
                <Text style={s.flagEyebrow}>Key Flag{keyFlagCategory ? ` — ${keyFlagCategory}` : ''}</Text>
                <Text style={[s.secondaryValue, { color: C.text }]}>{keyFlag}</Text>
                <Text style={[s.secondaryBody, { color: C.textDim, marginBottom: otherKeyFlags.length ? 10 : 0 }]}>
                  This is the single biggest gap between where you are and where coaches need you to be. Address it first.
                </Text>
                {otherKeyFlags.length > 0 && (
                  <View style={s.flagBox}>
                    <Text style={s.flagBoxLabel}>Also Flagged</Text>
                    {otherKeyFlags.map((f, i) => (
                      <Text key={i} style={[s.flagBoxItem, { color: C.text, marginTop: i > 0 ? 2 : 0 }]}>{f}</Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {(devTrajectory || topPriority) && (
            <View style={[s.secondaryCard, { backgroundColor: C.surface }]}>
              <Ionicons name="arrow-forward-circle" size={22} color="#ffd000" style={s.secondaryIcon} />
              <View style={{ flex: 1 }}>
                <Text style={s.devEyebrow}>Development Path</Text>
                {devTrajectory && <Text style={[s.secondaryValue, { color: C.text }]}>{devTrajectory}</Text>}
                {devRecommendation && (
                  <Text style={[s.secondaryBody, { color: C.textDim, marginBottom: topPriority ? 10 : 0 }]}>{devRecommendation}</Text>
                )}
                {topPriority && (
                  <View style={s.devBox}>
                    <Text style={s.devBoxLabel}>Top Priority</Text>
                    <Text style={s.devBoxTitle}>{topPriority.area}</Text>
                    <Text style={s.devBoxBody}>{topPriority.target}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  strengthCard: { borderRadius: 16, padding: 26, flexDirection: 'row', alignItems: 'center', gap: 22 },
  strengthIcon: { flexShrink: 0 },
  strengthEyebrow: { fontFamily: FontFamily.bodyExtraBold, fontSize: 10, color: '#71ff7e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  strengthValue: { fontFamily: FontFamily.statNumber, fontSize: 22, marginBottom: 4 },
  strengthBody: { fontFamily: FontFamily.body, fontSize: 12.5, lineHeight: 18 },

  secondaryGrid: { gap: 14 },
  secondaryCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 14, padding: 18 },
  secondaryIcon: { flexShrink: 0, marginTop: 2 },
  secondaryValue: { fontFamily: FontFamily.statNumber, fontSize: 22, marginBottom: 4 },
  secondaryBody: { fontFamily: FontFamily.body, fontSize: 11, lineHeight: 16 },

  flagEyebrow: { fontFamily: FontFamily.bodyExtraBold, fontSize: 10, color: '#e63535', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  flagBox: { backgroundColor: 'rgba(230,53,53,0.14)', borderRadius: 8, padding: 12 },
  flagBoxLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9.5, color: '#e63535', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  flagBoxItem: { fontFamily: FontFamily.bodyBold, fontSize: 12 },

  devEyebrow: { fontFamily: FontFamily.bodyExtraBold, fontSize: 10, color: '#ffd000', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  devBox: { backgroundColor: '#ffb400', borderRadius: 8, padding: 12 },
  devBoxLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9.5, color: 'rgba(0,0,0,0.65)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  devBoxTitle: { fontFamily: FontFamily.bodyBold, fontSize: 12.5, color: '#111', marginBottom: 2 },
  devBoxBody: { fontFamily: FontFamily.body, fontSize: 11.5, lineHeight: 16, color: 'rgba(0,0,0,0.75)' },
});
