import LoadingScreen from '../../components/LoadingScreen';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachAnalytics } from '../../hooks/useCoachAnalytics';
import { ThemeColors, PINK_RED, GRADIENT } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';

// White cells with black numbers -- always white regardless of theme, so
// this doesn't depend on the screen's theme-aware createStyles(C).
function WhiteCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[whiteCardStyles.card, style]}>{children}</View>;
}
const whiteCardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
});

const TIMEFRAMES = [
  { label: 'Last 7 days', value: 'week' },
  { label: 'Last 30 days', value: 'month' },
  { label: 'All time', value: 'all' },
] as const;

export default function AnalyticsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { kpis, loading, timeframe, setTimeframe } = useCoachAnalytics();

  if (coachLoading || loading) {
    return <LoadingScreen />;
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

      <View style={s.tabRow}>
        {TIMEFRAMES.map(opt => {
          const active = timeframe === opt.value;
          return active ? (
            <Pressable key={opt.value} onPress={() => setTimeframe(opt.value)}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.tabActive}>
                <Text style={s.tabActiveText}>{opt.label}</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable key={opt.value} style={[s.tabInactive, { backgroundColor: C.surfaceAlt }]} onPress={() => setTimeframe(opt.value)}>
              <Text style={[s.tabInactiveText, { color: C.textDim }]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 12, marginTop: 16 }}>
        {/* KPI Tiles */}
        <View style={s.kpiRow}>
          <WhiteCard style={s.kpiCard}>
            <Text style={s.kpiValue}>{kpis.viewed}</Text>
            <Text style={s.kpiLabel}>Prospects Viewed</Text>
          </WhiteCard>
          <WhiteCard style={s.kpiCard}>
            <Text style={s.kpiValue}>{kpis.liked}</Text>
            <Text style={s.kpiLabel}>Likes</Text>
          </WhiteCard>
        </View>

        <View style={s.kpiRow}>
          <WhiteCard style={s.kpiCard}>
            <Text style={s.kpiValue}>{kpis.matched}</Text>
            <Text style={s.kpiLabel}>Matches</Text>
          </WhiteCard>
          <WhiteCard style={s.kpiCard}>
            <Text style={s.kpiValue}>{kpis.saved}</Text>
            <Text style={s.kpiLabel}>Saved</Text>
          </WhiteCard>
        </View>

        <View style={s.kpiRow}>
          <WhiteCard style={s.kpiCard}>
            <Text style={s.kpiValue}>{kpis.messaged}</Text>
            <Text style={s.kpiLabel}>Messaged</Text>
          </WhiteCard>
          <WhiteCard style={s.kpiCard}>
            <Text style={s.kpiValue}>{kpis.conversionRate}%</Text>
            <Text style={s.kpiLabel}>Conversion Rate</Text>
          </WhiteCard>
        </View>

        {/* Funnel -- one continuous brand-gradient fill behind the 3
            stage-proportional sections, rather than 3 flat distinct colors */}
        <WhiteCard>
          <Text style={s.sectionTitle}>Recruiting Funnel</Text>
          <View style={s.funnelBar}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <View style={[s.funnelDivider, { flex: kpis.funnelViewed || 1 }]} />
            <View style={[s.funnelDivider, { flex: kpis.funnelLiked || 1 }]} />
            <View style={[s.funnelDivider, { flex: kpis.funnelMatched || 1, borderRightWidth: 0 }]} />
          </View>
          <View style={s.funnelLabels}>
            <Text style={s.funnelLabel}>{kpis.funnelViewed} Viewed</Text>
            <Text style={s.funnelLabel}>{kpis.funnelLiked} Liked</Text>
            <Text style={s.funnelLabel}>{kpis.funnelMatched} Matched</Text>
          </View>
        </WhiteCard>

        {/* Top Positions */}
        {kpis.topPositions.length > 0 && (
          <WhiteCard>
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
          </WhiteCard>
        )}

        {/* Top States */}
        {kpis.topStates.length > 0 && (
          <WhiteCard>
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
          </WhiteCard>
        )}

        {/* Top Liked Prospects */}
        {kpis.topLiked.length > 0 && (
          <WhiteCard>
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
          </WhiteCard>
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

    tabRow: { flexDirection: 'row', gap: 8 },
    tabActive: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100 },
    tabActiveText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    tabInactive: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100 },
    tabInactiveText: { fontFamily: FontFamily.bodySemi, fontSize: 13 },

    kpiRow: { flexDirection: 'row', gap: 12 },
    kpiCard: { flex: 1, alignItems: 'center', paddingVertical: 20 },
    // Everything below sits on a WhiteCard (always #fff), so uses fixed
    // dark-on-white colors -- black numbers, gray labels -- rather than
    // C.text / C.textDim, which are theme-aware and would go near-white in
    // dark mode. No per-metric accent colors: one uniform black number.
    kpiValue: { fontFamily: FontFamily.headline, fontSize: 28, color: '#1a1a1a', marginBottom: 4 },
    kpiLabel: { fontFamily: FontFamily.body, fontSize: 12, color: '#999' },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#1a1a1a', marginBottom: 10 },
    funnelBar: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
    funnelDivider: { borderRightWidth: 2, borderRightColor: '#fff' },
    funnelLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    funnelLabel: { fontFamily: FontFamily.body, fontSize: 11, color: '#999' },

    breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    breakdownLabel: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#1a1a1a', minWidth: 80 },
    breakdownValue: { fontFamily: FontFamily.body, fontSize: 12, color: '#999' },

    prospectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#1a1a1a' },
    prospectMeta: { fontFamily: FontFamily.body, fontSize: 11, color: '#999', marginTop: 2 },
    prospectScore: { fontFamily: FontFamily.headline, fontSize: 16, color: '#1a1a1a' },

    errorText: { fontFamily: FontFamily.body, fontSize: 14, color: C.error },
  });
}
