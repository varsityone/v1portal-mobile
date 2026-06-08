import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { Colors, GRADIENT } from '../../constants/Colors';
import { LinearGradient } from 'expo-linear-gradient';

interface Stats {
  profileViews: number;
  emailsSent: number;
  emailsReplied: number;
  programsMatched: number;
  responseRate: number;
  coachesInterested: number;
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <View style={sc.card}>
      <View style={[sc.iconBox, { backgroundColor: (color ?? Colors.primary) + '18' }]}>
        <Ionicons name={icon as any} size={20} color={color ?? Colors.primary} />
      </View>
      <Text style={sc.value}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
      {sub && <Text style={sc.sub}>{sub}</Text>}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  value: { fontSize: 28, fontWeight: '800', color: Colors.text },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  sub: { fontSize: 10, color: Colors.textDim, marginTop: 1 },
});

export default function AnalyticsScreen() {
  const { athlete, assessment, loading: dataLoading } = useAthleteData();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!athlete?.id) return;
    setLoading(true);

    const [
      { count: emailsSent },
      { count: replied },
      { count: interested },
      { count: programsMatched },
    ] = await Promise.all([
      supabase.from('coach_outreach').select('*', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
      supabase.from('coach_outreach').select('*', { count: 'exact', head: true }).eq('athlete_id', athlete.id).eq('status', 'replied'),
      supabase.from('coach_outreach').select('*', { count: 'exact', head: true }).eq('athlete_id', athlete.id).eq('status', 'interested'),
      supabase.from('matches').select('*', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
    ]);

    const sent = emailsSent ?? 0;
    const rep = replied ?? 0;

    setStats({
      profileViews: 0,
      emailsSent: sent,
      emailsReplied: rep,
      programsMatched: programsMatched ?? 0,
      responseRate: sent > 0 ? Math.round((rep / sent) * 100) : 0,
      coachesInterested: interested ?? 0,
    });
    setLoading(false);
  }, [athlete?.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const score = assessment?.v1_score ? Math.round(assessment.v1_score) : null;
  const bd = assessment?.score_breakdown;
  const breakdown = bd ? [
    { label: 'Athletic',    value: bd.physical    ?? 0, max: 40, color: Colors.primary },
    { label: 'Academic',    value: bd.academic    ?? 0, max: 35, color: '#00b4ff'      },
    { label: 'Production',  value: bd.production  ?? 0, max: 15, color: '#00ff1e'      },
    { label: 'Intangibles', value: bd.intangibles ?? 0, max: 10, color: '#F59E0B'      },
  ] : [];

  if (dataLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchStats} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Your recruiting activity at a glance</Text>
      </View>

      {/* Score breakdown */}
      {score !== null && (
        <View style={styles.scoreSection}>
          <Text style={styles.sectionLabel}>V1 SCORE BREAKDOWN</Text>
          <View style={styles.scoreCard}>
            {breakdown.map(bar => (
              <View key={bar.label} style={styles.barRow}>
                <Text style={styles.barLabel}>{bar.label}</Text>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={[bar.color, bar.color + 'aa']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${(bar.value / bar.max) * 100}%` }]}
                  />
                </View>
                <Text style={[styles.barValue, { color: bar.color }]}>{bar.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Outreach stats */}
      <View>
        <Text style={styles.sectionLabel}>OUTREACH</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="mail-outline"
            label="Emails Sent"
            value={stats?.emailsSent ?? '—'}
            color="#006aff"
          />
          <StatCard
            icon="chatbubble-outline"
            label="Replies"
            value={stats?.emailsReplied ?? '—'}
            color="#00b4ff"
          />
          <StatCard
            icon="star-outline"
            label="Interested"
            value={stats?.coachesInterested ?? '—'}
            color="#a3ff47"
          />
          <StatCard
            icon="trending-up-outline"
            label="Response Rate"
            value={stats ? `${stats.responseRate}%` : '—'}
            sub={stats?.emailsSent ? `of ${stats.emailsSent} sent` : undefined}
            color={Colors.primary}
          />
        </View>
      </View>

      {/* Programs */}
      <View>
        <Text style={styles.sectionLabel}>PROGRAM TARGETING</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="school-outline"
            label="Programs Matched"
            value={stats?.programsMatched ?? '—'}
            color="#00ff1e"
          />
          <StatCard
            icon="eye-outline"
            label="Profile Views"
            value={stats?.profileViews ?? 0}
            sub="Coming soon"
            color={Colors.textMuted}
          />
        </View>
      </View>

      {/* No assessment yet */}
      {!assessment && (
        <View style={styles.noDataCard}>
          <Ionicons name="analytics-outline" size={28} color={Colors.textDim} />
          <Text style={styles.noDataTitle}>Complete your assessment</Text>
          <Text style={styles.noDataSub}>
            Take the V1 Assessment to generate your score breakdown and recruiting analytics.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 3 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textDim,
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  scoreSection: { gap: 10 },
  scoreCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, width: 76 },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barValue: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'right' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  noDataCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noDataTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  noDataSub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
