import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface ProgramMatch {
  id: string;
  school_name: string;
  division: string | null;
  match_score: number;
  position_fit: string | null;
  match_type: string | null;
  programs?: { logo_url: string | null } | null;
}

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
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const MATCH_TYPE_COLOR = useMemo(() => ({
    likely:    '#00ff1e',
    realistic: C.primary,
    reach:     '#F59E0B',
  }), [C]);

  const fetchPrograms = useCallback(async () => {
    if (!athlete?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('matches')
      .select('id, school_name, division, match_score, position_fit, match_type, programs(logo_url)')
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
      <View style={s.center}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchPrograms} tintColor={C.primary} />
      }
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Program Targeting</Text>
        <Text style={s.subtitle}>Programs matched to your V1 Score and position</Text>
      </View>

      {/* Score chip */}
      {score !== null && (
        <View style={s.scoreChip}>
          <Text style={s.scoreChipLabel}>YOUR V1 SCORE</Text>
          <Text style={[s.scoreChipNum, { color: scoreColor(score) }]}>{score}</Text>
        </View>
      )}

      {/* Upgrade gate */}
      {!isPremium ? (
        <LinearGradient
          colors={['#833AB4', '#C13584', '#E1306C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.gate}
        >
          <Ionicons name="lock-closed" size={28} color="rgba(255,255,255,0.8)" />
          <Text style={s.gateTitle}>Unlock Program Matches</Text>
          <Text style={s.gateSub}>
            Upgrade to Pro to see your top program matches, division fit, and recruiting probability.
          </Text>
          <Pressable
            style={s.gateBtn}
            onPress={() => router.push('/upgrade' as any)}
          >
            <Text style={s.gateBtnText}>See Plans →</Text>
          </Pressable>
        </LinearGradient>
      ) : programs.length === 0 && !loading ? (
        <View style={s.emptyCard}>
          <Ionicons name="school-outline" size={32} color={C.icon} />
          <Text style={s.emptyTitle}>No matches yet</Text>
          <Text style={s.emptySub}>
            Complete your V1 Assessment to generate your program matches.
          </Text>
          <Pressable onPress={() => router.push('/assessment' as any)}>
            <LinearGradient
              colors={['#ff0000', '#aa00ff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
              style={s.emptyBtn}
            >
              <Text style={s.emptyBtnText}>Take Assessment →</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Filter tabs */}
          <View style={s.filters}>
            {(['all', 'likely', 'realistic', 'reach'] as const).map(f => (
              <Pressable
                key={f}
                style={[s.filterChip, filter === f && s.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
                  {f === 'all' ? `All (${programs.length})` : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Program list */}
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={s.list}>
              {filtered.map((prog) => (
                <View key={prog.id} style={s.programCard}>
                  {prog.programs?.logo_url ? (
                    <View style={s.programLogo}>
                      <Image source={{ uri: prog.programs.logo_url }} style={s.programLogoImg} resizeMode="contain" />
                    </View>
                  ) : (
                    <View style={s.programLogoFallback}>
                      <Text style={s.programLogoFallbackText}>
                        {(prog.school_name ?? 'P').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={s.programLeft}>
                    <View style={s.programInfo}>
                      <Text style={s.programName}>{prog.school_name}</Text>
                      <Text style={s.programDivision}>{prog.division ?? 'Unknown Division'}</Text>
                      {!!prog.position_fit && (
                        <Text style={s.programPosition}>{prog.position_fit}</Text>
                      )}
                    </View>
                    {!!prog.match_type && (
                      <View style={[
                        s.matchTypeBadge,
                        { backgroundColor: (MATCH_TYPE_COLOR[prog.match_type as keyof typeof MATCH_TYPE_COLOR] ?? C.textDim) + '20' },
                      ]}>
                        <Text style={[
                          s.matchTypeBadgeText,
                          { color: MATCH_TYPE_COLOR[prog.match_type as keyof typeof MATCH_TYPE_COLOR] ?? C.textDim },
                        ]}>
                          {prog.match_type.charAt(0).toUpperCase() + prog.match_type.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={s.programRight}>
                    <Text style={[s.matchScore, { color: C.text }]}>
                      {prog.match_score}
                    </Text>
                    <Text style={s.matchScoreLabel}>match</Text>
                  </View>
                </View>
              ))}
              {filtered.length === 0 && (
                <View style={s.emptyFilter}>
                  <Text style={s.emptyFilterText}>No {filter} matches</Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { gap: 4 },
    title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: C.textMuted, lineHeight: 20 },

    scoreChip: {
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    scoreChipLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.2 },
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
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 28,
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
    emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
    emptyBtn: {
      backgroundColor: C.primary + '20',
      borderRadius: 100,
      paddingHorizontal: 22,
      paddingVertical: 10,
      marginTop: 4,
      borderWidth: 1,
      borderColor: C.primary + '40',
    },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },

    filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 100,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    filterChipActive: { backgroundColor: C.primary + '20', borderColor: C.primary + '60' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
    filterChipTextActive: { color: C.primary },

    list: { gap: 10 },
    programCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    programLogo: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.background, padding: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    programLogoImg: { width: '100%', height: '100%' },
    programLogoFallback: { width: 40, height: 40, borderRadius: 8, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    programLogoFallbackText: { fontSize: 13, fontWeight: '800', color: C.textMuted },
    programLeft: { flex: 1, gap: 6 },
    programInfo: { gap: 2 },
    programName: { fontSize: 15, fontWeight: '700', color: C.text },
    programDivision: { fontSize: 12, color: C.textMuted },
    programPosition: { fontSize: 11, color: C.textDim },
    matchTypeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    matchTypeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
    programRight: { alignItems: 'center', minWidth: 52 },
    matchScore: { fontSize: 22, fontWeight: '800' },
    matchScoreLabel: { fontSize: 10, color: C.textDim, fontWeight: '600', letterSpacing: 0.4 },

    emptyFilter: { padding: 24, alignItems: 'center' },
    emptyFilterText: { color: C.textMuted, fontSize: 14 },
  });
}
