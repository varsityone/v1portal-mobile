import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachAnalytics } from '../../hooks/useCoachAnalytics';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { FilterChips } from '../../components/ui/FilterChips';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';

export default function AnalyticsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { kpis, loading, timeframe, setTimeframe } = useCoachAnalytics();

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!kpis) {
    return <View style={s.center}><Text style={s.errorText}>Unable to load analytics</Text></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>INSIGHTS</Text>
        <Text style={s.title}>Recruiting Analytics</Text>
      </View>

      <FilterChips
        options={[
          { label: 'Last 7 days', value: 'week' },
          { label: 'Last 30 days', value: 'month' },
          { label: 'All time', value: 'all' },
        ]}
        selected={[timeframe]}
        onToggle={(t) => setTimeframe(t as any)}
      />

      <View style={{ gap: 12, marginTop: 16 }}>
        {/* KPI Tiles */}
        <View style={s.kpiRow}>
          <Card style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#3b82f6' }]}>{kpis.viewed}</Text>
            <Text style={s.kpiLabel}>Prospects Viewed</Text>
          </Card>
          <Card style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#ec4899' }]}>{kpis.liked}</Text>
            <Text style={s.kpiLabel}>Likes</Text>
          </Card>
        </View>

        <View style={s.kpiRow}>
          <Card style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#22c55e' }]}>{kpis.matched}</Text>
            <Text style={s.kpiLabel}>Matches</Text>
          </Card>
          <Card style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#a855f7' }]}>{kpis.saved}</Text>
            <Text style={s.kpiLabel}>Saved</Text>
          </Card>
        </View>

        <View style={s.kpiRow}>
          <Card style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#f59e0b' }]}>{kpis.messaged}</Text>
            <Text style={s.kpiLabel}>Messaged</Text>
          </Card>
          <Card style={s.kpiCard}>
            <Text style={[s.kpiValue, { color: '#06b6d4' }]}>{kpis.conversionRate}%</Text>
            <Text style={s.kpiLabel}>Conversion Rate</Text>
          </Card>
        </View>

        {/* Funnel */}
        <Card>
          <Text style={s.sectionTitle}>Recruiting Funnel</Text>
          <View style={s.funnelBar}>
            <View style={[s.funnelSegment, { flex: kpis.funnelViewed, backgroundColor: '#3b82f6' }]} />
            <View style={[s.funnelSegment, { flex: kpis.funnelLiked, backgroundColor: '#ec4899' }]} />
            <View style={[s.funnelSegment, { flex: kpis.funnelMatched, backgroundColor: '#22c55e' }]} />
          </View>
          <View style={s.funnelLabels}>
            <Text style={s.funnelLabel}>{kpis.funnelViewed} Viewed</Text>
            <Text style={s.funnelLabel}>{kpis.funnelLiked} Liked</Text>
            <Text style={s.funnelLabel}>{kpis.funnelMatched} Matched</Text>
          </View>
        </Card>

        {/* Top Positions */}
        {kpis.topPositions.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>Top Positions</Text>
            <View style={{ gap: 8 }}>
              {kpis.topPositions.map((pos, i) => (
                <View key={i} style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>{pos.position}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.breakdownValue}>{pos.count} views</Text>
                  <Text style={s.breakdownValue}>{pos.avgScore} avg</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Top States */}
        {kpis.topStates.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>Top States</Text>
            <View style={{ gap: 8 }}>
              {kpis.topStates.map((st, i) => (
                <View key={i} style={s.breakdownRow}>
                  <Text style={s.breakdownLabel}>{st.state}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.breakdownValue}>{st.count} views</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Top Liked Prospects */}
        {kpis.topLiked.length > 0 && (
          <Card>
            <Text style={s.sectionTitle}>Top Liked Prospects</Text>
            <View style={{ gap: 10 }}>
              {kpis.topLiked.map((athlete) => (
                <View key={athlete.id} style={s.prospectRow}>
                  <Avatar uri={athlete.profile_photo_url} name={athlete.full_name} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.prospectName} numberOfLines={1}>{athlete.full_name}</Text>
                    <Text style={s.prospectMeta}>{athlete.position ?? '—'}</Text>
                  </View>
                  {athlete.v1_score != null && <Text style={s.prospectScore}>{athlete.v1_score}</Text>}
                </View>
              ))}
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    kpiRow: { flexDirection: 'row', gap: 12 },
    kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
    kpiValue: { fontFamily: FontFamily.headline, fontSize: 28, color: C.primary, marginBottom: 4 },
    kpiLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 10 },
    funnelBar: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', gap: 2, marginBottom: 10 },
    funnelSegment: { borderRadius: 12 },
    funnelLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    funnelLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim },

    breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    breakdownLabel: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text, minWidth: 80 },
    breakdownValue: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },

    prospectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    prospectMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    prospectScore: { fontFamily: FontFamily.headline, fontSize: 16, color: C.primary },

    errorText: { fontFamily: FontFamily.body, fontSize: 14, color: C.error },
  });
}
