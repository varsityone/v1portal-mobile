import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAthleteData } from '../../hooks/useAthleteData';
import { useAthleteScoreHistory } from '../../hooks/useAthleteScoreHistory';
import { isAthletePremium } from '../../lib/subscription';
import { getRecruitingLevelBand } from '../../lib/recruitingLevels';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

const SCORE_WEIGHTS = {
  Production: 45,
  Physical: 25,
  Academic: 15,
  Intangibles: 15,
};

export default function ResultsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { athlete, assessment, loading } = useAthleteData();
  const { history } = useAthleteScoreHistory();

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!athlete || !assessment) {
    return (
      <View style={s.container}>
        <EmptyState
          icon="analytics"
          title="Complete Assessment"
          body="Take the V1 Assessment to see your recruiting profile and college fit analysis."
        />
      </View>
    );
  }

  const isPremium = isAthletePremium(athlete);
  const currentScore = athlete.v1_score ?? 0;
  const band = getRecruitingLevelBand(currentScore);

  if (!isPremium) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.eyebrow}>MY</Text>
          <Text style={s.title}>V1 Score</Text>
        </View>
        <Card style={s.scoreCard}>
          <Text style={s.scoreLabel}>Current Score</Text>
          <Text style={s.scoreValue}>{currentScore}</Text>
        </Card>
        <EmptyState
          icon="lock"
          title="Unlock Full Results"
          body="Upgrade to V1 Plus to see detailed score breakdown, percentile ranking, recruiting gap analysis, and more."
          actionLabel="View Plans"
          onAction={() => router.push('/upgrade' as any)}
        />
      </View>
    );
  }

  // Calculate percentile
  const scorePercent = Math.min(Math.round((currentScore / 100) * 100), 100);

  // History chart data
  const chartData = history.slice(-10).map((h, i) => ({
    x: i,
    y: h.v1_score,
  }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>MY</Text>
        <Text style={s.title}>V1 Score</Text>
      </View>

      {/* Score display */}
      <Card style={s.scoreCard}>
        <Text style={s.scoreLabel}>Your V1 Score</Text>
        <Text style={s.scoreValue}>{currentScore}</Text>
      </Card>

      {/* Recruiting level */}
      {band && (
        <Card style={s.levelCard}>
          <Text style={s.sectionTitle}>Recruiting Level</Text>
          <Text style={s.levelBand}>{band.description}</Text>
          <Text style={s.levelDetail}>Target: {band.targets}</Text>
        </Card>
      )}

      {/* Score breakdown */}
      <Card>
        <Text style={s.sectionTitle}>Score Breakdown</Text>
        {Object.entries(SCORE_WEIGHTS).map(([label, pct]) => (
          <View key={label} style={s.breakdownItem}>
            <View style={s.breakdownLabelRow}>
              <Text style={s.breakdownLabel}>{label}</Text>
              <Text style={s.breakdownValue}>{pct}%</Text>
            </View>
            <View style={s.breakdownBar}>
              <View style={[s.breakdownFill, { width: `${pct}%` }]} />
            </View>
          </View>
        ))}
      </Card>

      {/* Percentile */}
      <Card>
        <Text style={s.sectionTitle}>Percentile Ranking</Text>
        <View style={s.percentileDisplay}>
          <Text style={s.percentileValue}>{scorePercent}th</Text>
          <Text style={s.percentileLabel}>percentile among assessed athletes</Text>
        </View>
      </Card>

      {/* Score history chart */}
      {chartData.length > 1 && (
        <Card>
          <Text style={s.sectionTitle}>Score History</Text>
          <View style={s.chartPlaceholder}>
            <View style={s.miniChart}>
              {chartData.map((point, i) => (
                <View
                  key={i}
                  style={[
                    s.miniChartBar,
                    {
                      height: `${(point.y / Math.max(...chartData.map(p => p.y))) * 100}%`,
                      backgroundColor: point.y >= currentScore ? '#22c55e' : '#8b5cf6',
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={s.chartLabel}>{history.length} assessment{'s' !== history.length ? '' : 's'} recorded</Text>
        </Card>
      )}

      {/* Recruiting gap */}
      <Card>
        <Text style={s.sectionTitle}>Your Recruiting Gap</Text>
        <View style={s.gapAnalysis}>
          <View style={s.gapRow}>
            <Text style={s.gapLabel}>D1 Threshold</Text>
            <Text style={s.gapValue}>80+</Text>
            <View style={[s.gapIndicator, { backgroundColor: currentScore >= 80 ? '#22c55e' : '#ef4444' }]} />
          </View>
          <View style={s.gapRow}>
            <Text style={s.gapLabel}>FCS Threshold</Text>
            <Text style={s.gapValue}>65+</Text>
            <View style={[s.gapIndicator, { backgroundColor: currentScore >= 65 ? '#22c55e' : '#ef4444' }]} />
          </View>
          <View style={s.gapRow}>
            <Text style={s.gapLabel}>D2/D3 Range</Text>
            <Text style={s.gapValue}>50+</Text>
            <View style={[s.gapIndicator, { backgroundColor: currentScore >= 50 ? '#22c55e' : '#ef4444' }]} />
          </View>
        </View>
      </Card>

      {/* Reality check */}
      <Card style={s.realityCard}>
        <Text style={s.sectionTitle}>Reality Check</Text>
        <Text style={s.realityText}>
          {currentScore >= 80
            ? 'You\'re in D1 territory. Focus on film, measurables, and academic progress.'
            : currentScore >= 65
              ? 'Strong FCS prospect. Build a film highlight reel and contact programs directly.'
              : currentScore >= 50
                ? 'Competitive at D2/D3 level. Demonstrate coachability and game film quality.'
                : 'Build your profile. Work with coaches to identify and improve key areas.'}
        </Text>
      </Card>

      {/* Retake button */}
      <Pressable style={s.retakeBtn} onPress={() => router.push('/profile' as any)}>
        <Text style={s.retakeBtnText}>Retake Assessment</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    scoreCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 16 },
    scoreLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginBottom: 8 },
    scoreValue: { fontFamily: FontFamily.headline, fontSize: 48, color: C.primary },

    levelCard: { marginBottom: 16 },
    levelBand: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.primary, marginTop: 4 },
    levelDetail: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 4 },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 12 },

    breakdownItem: { marginBottom: 14 },
    breakdownLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    breakdownLabel: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    breakdownValue: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim },
    breakdownBar: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
    breakdownFill: { height: '100%', borderRadius: 4, backgroundColor: C.primary },

    percentileDisplay: { alignItems: 'center', paddingVertical: 12 },
    percentileValue: { fontFamily: FontFamily.headline, fontSize: 32, color: C.primary },
    percentileLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 4 },

    chartPlaceholder: { height: 100, justifyContent: 'flex-end', marginVertical: 12 },
    miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 60 },
    miniChartBar: { flex: 1, borderRadius: 2 },
    chartLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 8 },

    gapAnalysis: { gap: 12 },
    gapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    gapLabel: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, color: C.text },
    gapValue: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.primary, minWidth: 40, textAlign: 'right' },
    gapIndicator: { width: 12, height: 12, borderRadius: 6 },

    realityCard: { backgroundColor: C.primary + '15', borderLeftWidth: 4, borderLeftColor: C.primary },
    realityText: { fontFamily: FontFamily.body, fontSize: 12, color: C.text, lineHeight: 18, marginTop: 8 },

    retakeBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    retakeBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#ffffff' },
  });
}
