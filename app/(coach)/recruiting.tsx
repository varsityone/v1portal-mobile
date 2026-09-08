import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachTargeting, STATES } from '../../hooks/useCoachTargeting';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';

const POSITION_COLORS: Record<string, string> = {
  QB: '#f59e0b', RB: '#22c55e', WR: '#3b82f6', TE: '#8b5cf6',
  OL: '#ef4444', DL: '#ec4899', LB: '#f97316', CB: '#06b6d4',
  S: '#14b8a6', K: '#a855f7', P: '#a855f7', LS: '#6b7280',
};

export default function RecruitingScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { coach, loading: coachLoading } = useCoachData();
  const { selectedStates, prospects, stats, analytics, loading, toggleState, clearAll } = useCoachTargeting();

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  const scoreBuckets = analytics
    ? [
        { label: 'Excellent (90+)', value: analytics.scoreDistribution.excellent },
        { label: 'Strong (80-89)', value: analytics.scoreDistribution.strong },
        { label: 'Developing (<80)', value: analytics.scoreDistribution.developing },
        { label: 'No Score', value: analytics.scoreDistribution.unknown },
      ].filter(b => b.value > 0)
    : [];
  const scored = analytics ? analytics.scoreDistribution.excellent + analytics.scoreDistribution.strong + analytics.scoreDistribution.developing : 0;
  const scoreTotal = analytics ? (scored + analytics.scoreDistribution.unknown || 1) : 1;
  const filledPct = (scored / scoreTotal) * 100;
  const maxPosCount = analytics && analytics.topPositions.length > 0 ? Math.max(...analytics.topPositions.map(p => p.count), 1) : 1;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Geographic Targeting</Text>
        <Text style={s.subtitle}>Tap states to build your recruiting focus areas. The prospects list updates in real-time to show athletes in your targeted regions.</Text>
      </View>

      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statBoxLabel}>Total Athletes</Text>
          <Text style={[s.statBoxValue, stats.totalAthletes === 0 && s.statBoxValueZero]}>{stats.totalAthletes}</Text>
          <Text style={s.statBoxSub}>In V1Portal</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statBoxLabel}>Targeted States</Text>
          <Text style={[s.statBoxValue, stats.targetedStates === 0 && s.statBoxValueZero]}>{stats.targetedStates}</Text>
          <Text style={s.statBoxSub}>Selected</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statBoxLabel}>Targeted Athletes</Text>
          <Text style={[s.statBoxValue, stats.targetedAthletes === 0 && s.statBoxValueZero]}>{stats.targetedAthletes}</Text>
          <Text style={s.statBoxSub}>In your regions</Text>
        </View>
      </View>

      <Card style={s.mapCard}>
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Select Target States</Text>
          {stats.targetedStates > 0 && (
            <Pressable onPress={clearAll}>
              <Text style={s.clearAllText}>Clear All</Text>
            </Pressable>
          )}
        </View>
        <View style={s.stateGrid}>
          {STATES.map(state => (
            <Pressable
              key={state}
              style={[s.stateBtn, selectedStates.has(state) && s.stateBtnActive]}
              onPress={() => toggleState(state)}
            >
              <Text style={[s.stateText, selectedStates.has(state) && s.stateTextActive]}>{state}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <View style={{ marginTop: 16 }}>
        <Text style={s.sectionTitleDark}>Targeted Athletes ({prospects.length})</Text>
        {prospects.length === 0 ? (
          <Text style={s.emptyText}>Tap states above to see targeted athletes</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingVertical: 4 }}>
            {prospects.map(prospect => (
              <Pressable
                key={prospect.id}
                style={s.prospectCard}
                onPress={() => router.push(`/(coach)/recruits/${prospect.id}` as any)}
              >
                {prospect.profile_photo_url ? (
                  <Image source={{ uri: prospect.profile_photo_url }} style={s.prospectPhoto} />
                ) : (
                  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.prospectPhoto} />
                )}
                <Text style={s.prospectName} numberOfLines={1}>{prospect.full_name ?? 'Unknown'}</Text>
                <Text style={s.prospectSub} numberOfLines={1}>
                  {[prospect.position, prospect.state].filter(Boolean).join(' · ')}
                </Text>
                {prospect.v1_score != null && (
                  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.scoreBadge}>
                    <Text style={s.scoreBadgeText}>{prospect.v1_score}</Text>
                  </LinearGradient>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {analytics && (
        <View style={{ marginTop: 16 }}>
          <Text style={s.sectionTitleDark}>Insights</Text>

          <View style={s.insightsCard}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[s.avgScoreValue, analytics.averageScore == null && s.statBoxValueZero]}>{analytics.averageScore ?? '—'}</Text>
              <Text style={s.statBoxLabel}>Avg V1 Score</Text>
            </View>
            <View style={{ marginTop: 20 }}>
              <Text style={s.qualityLabel}>Score Quality · {prospects.length} prospect{prospects.length === 1 ? '' : 's'}</Text>
              <View style={s.qualityTrack}>
                <View style={[s.qualityFill, { width: `${filledPct}%` }]} />
              </View>
              <View style={s.legendWrap}>
                {scoreBuckets.map(b => (
                  <View key={b.label} style={s.legendItem}>
                    <View style={[s.legendDot, { backgroundColor: b.label === 'No Score' ? '#eee' : '#000' }]} />
                    <Text style={s.legendLabel}>{b.label}</Text>
                    <Text style={s.legendValue}>{b.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {analytics.topPositions.length > 0 && (
            <View style={[s.insightsCard, { marginTop: 12 }]}>
              <Text style={s.qualityLabel}>Position Breakdown</Text>
              <View style={{ gap: 14, marginTop: 12 }}>
                {analytics.topPositions.map(pos => {
                  const color = POSITION_COLORS[pos.position] ?? '#9a9da2';
                  return (
                    <View key={pos.position} style={s.posRow}>
                      <View style={{ width: 60 }}>
                        <Text style={[s.posLabel, { color }]}>{pos.position}</Text>
                        <Text style={s.posAvg}>Avg {pos.avgScore || '—'}</Text>
                      </View>
                      <View style={s.posBarTrack}>
                        <View style={[s.posBarFill, { width: `${(pos.count / maxPosCount) * 100}%`, backgroundColor: color }]} />
                      </View>
                      <Text style={s.posCount}>{pos.count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 18 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 10, alignItems: 'center' },
    statBoxLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, textAlign: 'center' },
    statBoxValue: { fontFamily: FontFamily.mono, fontSize: 34, color: '#000', letterSpacing: -1 },
    statBoxValueZero: { color: '#ccc' },
    statBoxSub: { fontFamily: FontFamily.bodySemi, fontSize: 10, color: '#999', marginTop: 8 },

    mapCard: {},
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    sectionTitleDark: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 10 },
    clearAllText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },

    stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stateBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    stateBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    stateText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    stateTextActive: { color: '#ffffff' },

    emptyText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, paddingVertical: 8 },

    prospectCard: { width: 130, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
    prospectPhoto: { width: 68, height: 68, borderRadius: 34, marginBottom: 10 },
    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text, textAlign: 'center' },
    prospectSub: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, marginTop: 2, textAlign: 'center' },
    scoreBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 100 },
    scoreBadgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 12, color: '#fff' },

    insightsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
    avgScoreValue: { fontFamily: FontFamily.mono, fontSize: 44, color: '#000', letterSpacing: -1 },
    qualityLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    qualityTrack: { height: 12, borderRadius: 100, backgroundColor: '#eee', overflow: 'hidden' },
    qualityFill: { height: '100%', backgroundColor: '#000', borderRadius: 100 },
    legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendLabel: { fontFamily: FontFamily.body, fontSize: 11, color: '#777' },
    legendValue: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#000' },

    posRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    posLabel: { fontFamily: FontFamily.monoBold, fontSize: 12, color: '#000' },
    posAvg: { fontFamily: FontFamily.body, fontSize: 10, color: '#bbb', marginTop: 1 },
    posBarTrack: { flex: 1, height: 8, borderRadius: 100, backgroundColor: '#eee', overflow: 'hidden' },
    posBarFill: { height: '100%', backgroundColor: '#000', borderRadius: 100 },
    posCount: { fontFamily: FontFamily.mono, fontSize: 15, color: '#000', width: 22, textAlign: 'right' },
  });
}
