import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { Colors, GRADIENT } from '../../constants/Colors';

interface ProgramMatch {
  id: string;
  school_name: string;
  division: string | null;
  match_score: number;
  position_fit: string | null;
  match_type: string | null;
}

const MATCH_TYPE_COLOR: Record<string, string> = {
  likely: '#00ff1e',
  realistic: Colors.primary,
  reach: '#F59E0B',
};

function scoreColor(s: number) {
  const t = Math.min(s / 99.9, 1);
  if (t <= 0.5) return `rgb(0,${Math.round(106 + 74 * (t / 0.5))},255)`;
  const p = (t - 0.5) / 0.5;
  return `rgb(0,${Math.round(180 + 75 * p)},${Math.round(255 - 225 * p)})`;
}

export default function ProgramsScreen() {
  const router = useRouter();
  const { athlete, assessment, isPremium, loading: dataLoading } = useAthleteData();
  const [programs, setPrograms] = useState<ProgramMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'likely' | 'realistic' | 'reach'>('all');

  const fetchPrograms = useCallback(async () => {
    if (!athlete?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('id, school_name, division, match_score, position_fit, match_type')
      .eq('athlete_id', athlete.id)
      .order('match_score', { ascending: false });
    setPrograms(data ?? []);
    setLoading(false);
  }, [athlete?.id]);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const filtered = filter === 'all' ? programs : programs.filter(p => p.match_type === filter);
  const score = assessment?.v1_score ? Math.round(assessment.v1_score) : null;

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
        <RefreshControl refreshing={loading} onRefresh={fetchPrograms} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Program Targeting</Text>
        <Text style={styles.subtitle}>Programs matched to your V1 Score and position</Text>
      </View>

      {/* Score chip */}
      {score !== null && (
        <View style={styles.scoreChip}>
          <Text style={styles.scoreChipLabel}>YOUR V1 SCORE</Text>
          <Text style={[styles.scoreChipNum, { color: scoreColor(score) }]}>{score}</Text>
        </View>
      )}

      {/* Upgrade gate */}
      {!isPremium ? (
        <LinearGradient
          colors={['#833AB4', '#C13584', '#E1306C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gate}
        >
          <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.8)" />
          <Text style={styles.gateTitle}>Unlock Program Matches</Text>
          <Text style={styles.gateSub}>
            Upgrade to Pro to see your top program matches, division fit, and recruiting probability.
          </Text>
          <Pressable
            style={styles.gateBtn}
            onPress={() => router.push('/upgrade' as any)}
          >
            <Text style={styles.gateBtnText}>See Plans →</Text>
          </Pressable>
        </LinearGradient>
      ) : programs.length === 0 && !loading ? (
        /* No score yet */
        <View style={styles.emptyCard}>
          <Ionicons name="school-outline" size={32} color={Colors.textDim} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>
            Complete your V1 Assessment to generate your program matches.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push('/assessment' as any)}
          >
            <Text style={styles.emptyBtnText}>Take Assessment →</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Filter tabs */}
          <View style={styles.filters}>
            {(['all', 'likely', 'realistic', 'reach'] as const).map(f => (
              <Pressable
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? `All (${programs.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Program list */}
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.list}>
              {filtered.map((prog) => (
                <View key={prog.id} style={styles.programCard}>
                  <View style={styles.programLeft}>
                    <View style={styles.programInfo}>
                      <Text style={styles.programName}>{prog.school_name}</Text>
                      <Text style={styles.programDivision}>{prog.division ?? 'Unknown Division'}</Text>
                      {prog.position_fit && (
                        <Text style={styles.programPosition}>{prog.position_fit}</Text>
                      )}
                    </View>
                    {prog.match_type && (
                      <View style={[
                        styles.matchTypeBadge,
                        { backgroundColor: (MATCH_TYPE_COLOR[prog.match_type] ?? Colors.textDim) + '20' },
                      ]}>
                        <Text style={[
                          styles.matchTypeBadgeText,
                          { color: MATCH_TYPE_COLOR[prog.match_type] ?? Colors.textDim },
                        ]}>
                          {prog.match_type.charAt(0).toUpperCase() + prog.match_type.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.programRight}>
                    <Text style={[styles.matchScore, { color: scoreColor(prog.match_score) }]}>
                      {prog.match_score}
                    </Text>
                    <Text style={styles.matchScoreLabel}>match</Text>
                  </View>
                </View>
              ))}
              {filtered.length === 0 && (
                <View style={styles.emptyFilter}>
                  <Text style={styles.emptyFilterText}>No {filter} matches</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  header: { gap: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textMuted, lineHeight: 20 },

  scoreChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreChipLabel: { fontSize: 10, fontWeight: '700', color: Colors.textDim, letterSpacing: 1.2 },
  scoreChipNum: { fontSize: 22, fontWeight: '800' },

  gate: {
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  gateTitle: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  gateSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  gateBtn: {
    backgroundColor: '#a3ff47',
    borderRadius: 100,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 4,
  },
  gateBtnText: { fontSize: 15, fontWeight: '800', color: '#1a1b1d' },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 100,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary + '20', borderColor: Colors.primary + '60' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  filterChipTextActive: { color: Colors.primary },

  list: { gap: 10 },
  programCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programLeft: { flex: 1, gap: 6 },
  programInfo: { gap: 2 },
  programName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  programDivision: { fontSize: 12, color: Colors.textMuted },
  programPosition: { fontSize: 11, color: Colors.textDim },
  matchTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchTypeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  programRight: { alignItems: 'center', minWidth: 52 },
  matchScore: { fontSize: 22, fontWeight: '800' },
  matchScoreLabel: { fontSize: 10, color: Colors.textDim, fontWeight: '600', letterSpacing: 0.4 },

  emptyFilter: { padding: 24, alignItems: 'center' },
  emptyFilterText: { color: Colors.textMuted, fontSize: 14 },
});
