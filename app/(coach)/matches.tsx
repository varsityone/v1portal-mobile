import LoadingScreen from '../../components/LoadingScreen';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { GRADIENT, ThemeColors, PINK_RED } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

interface MatchRow {
  id: string;
  matched_at: string;
  athlete_id: string;
  athlete: {
    full_name: string | null;
    position: string | null;
    graduation_year: number | null;
    v1_score: number | null;
    profile_photo_url: string | null;
    state: string | null;
    high_school: string | null;
  } | null;
  unread: number;
}

const POSITION_COLORS: Record<string, string> = {
  QB: '#f59e0b', RB: '#22c55e', WR: '#3b82f6', TE: '#8b5cf6',
  OL: '#ef4444', DL: '#ec4899', LB: '#f97316', CB: '#06b6d4',
  S: '#14b8a6', K: '#a855f7', P: '#a855f7', LS: '#6b7280',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CoachMatchesScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (coachLoading) return;
    if (!coach) { router.replace('/(coach)' as any); return; }
    if (!coach.position_coached || coach.min_score == null) { router.replace('/coach-setup' as any); return; }
    if (!coach.verified) { setLoading(false); return; }

    async function load() {
      const { data: matchData } = await supabase
        .from('mutual_matches')
        .select('id, matched_at, athlete_id')
        .eq('coach_id', coach!.id)
        .eq('status', 'active')
        .order('matched_at', { ascending: false });

      if (!matchData || matchData.length === 0) { setLoading(false); return; }

      const enriched: MatchRow[] = await Promise.all(matchData.map(async m => {
        const { data: athlete } = await supabase
          .from('athletes')
          .select('full_name, position, graduation_year, v1_score, profile_photo_url, state, high_school')
          .eq('id', m.athlete_id)
          .single();
        const { count } = await supabase
          .from('match_messages')
          .select('*', { count: 'exact', head: true })
          .eq('match_id', m.id)
          .eq('sender_type', 'athlete')
          .eq('status', 'sent')
          .eq('read', false);
        return { id: m.id, matched_at: m.matched_at, athlete_id: m.athlete_id, athlete: athlete ?? null, unread: count ?? 0 };
      }));
      setMatches(enriched);
      setLoading(false);
    }
    load();
  }, [coachLoading, coach?.id, coach?.verified]);

  if (coachLoading || loading) {
    return <LoadingScreen />;
  }
  if (!coach) return null;

  if (!coach.verified) {
    return (
      <View style={s.center}>
        <View style={s.pendingIconWrap}><Ionicons name="people-outline" size={24} color="#a78bfa" /></View>
        <Text style={s.pendingTitle}>Verification Pending</Text>
        <Text style={s.pendingBody}>
          {coach.email_verified
            ? "Your email is confirmed. We're doing a quick manual check on your program — you'll be live within one business day."
            : 'Check your inbox for a confirmation email and click the link to activate your program.'}
        </Text>
      </View>
    );
  }

  const positions = Array.from(new Set(matches.map(m => m.athlete?.position).filter(Boolean))) as string[];
  const filtered = filter === 'all' ? matches : matches.filter(m => m.athlete?.position === filter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>COACH DASHBOARD</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>My Roster</Text>
          <Text style={s.count}>{matches.length} {matches.length === 1 ? 'match' : 'matches'}</Text>
        </View>
        <Text style={s.sub}>Athletes who expressed mutual interest in your program.</Text>
      </View>

      {positions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          <Pressable style={[s.filterPill, filter === 'all' && s.filterPillActive]} onPress={() => setFilter('all')}>
            <Text style={[s.filterPillText, filter === 'all' && s.filterPillTextActive]}>All</Text>
          </Pressable>
          {positions.map(pos => {
            const color = POSITION_COLORS[pos] ?? PINK_RED;
            const active = filter === pos;
            return (
              <Pressable
                key={pos}
                style={[s.filterPill, active && { backgroundColor: `${color}18`, borderColor: color }]}
                onPress={() => setFilter(pos)}
              >
                <Text style={[s.filterPillText, active && { color }]}>{pos}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {filtered.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="people-outline" size={48} color={C.textDim} style={{ marginBottom: 16, opacity: 0.5 }} />
          <Text style={s.emptyTitle}>{filter === 'all' ? 'No matches yet' : `No ${filter} matches`}</Text>
          <Text style={s.emptyBody}>
            {filter === 'all' ? 'Start swiping on athletes to build your board.' : 'Try viewing all positions or keep swiping.'}
          </Text>
          <Pressable style={s.emptyBtnWrap} onPress={() => router.push('/(coach)/match' as any)}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={s.emptyBtnText}>Find Players</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filtered.map(match => {
            const posColor = POSITION_COLORS[match.athlete?.position ?? ''] ?? C.textDim;
            return (
              <Pressable
                key={match.id}
                style={[s.row, match.unread > 0 && { borderColor: 'rgba(234,12,95,0.3)' }]}
                onPress={() => router.push(`/(coach)/match/${match.id}` as any)}
              >
                {match.athlete?.profile_photo_url ? (
                  <Image source={{ uri: match.athlete.profile_photo_url }} style={s.avatar} />
                ) : (
                  <View style={[s.avatar, s.avatarFallback, { borderColor: `${posColor}40` }]}>
                    <Text style={[s.avatarFallbackText, { color: posColor }]}>{match.athlete?.position ?? '?'}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.name} numberOfLines={1}>{match.athlete?.full_name ?? 'Unknown Athlete'}</Text>
                    {match.unread > 0 && (
                      <View style={s.unreadBadge}><Text style={s.unreadBadgeText}>{match.unread}</Text></View>
                    )}
                  </View>
                  <Text style={s.meta} numberOfLines={1}>
                    {[
                      match.athlete?.position,
                      match.athlete?.graduation_year ? `Class of ${match.athlete.graduation_year}` : null,
                      match.athlete?.state,
                      match.athlete?.high_school,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {match.athlete?.v1_score != null && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.score}>{match.athlete.v1_score}</Text>
                    <Text style={s.scoreLabel}>V1</Text>
                  </View>
                )}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.date}>{formatDate(match.matched_at)}</Text>
                  <Ionicons name="chevron-forward" size={14} color={C.textDim} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {filtered.length > 0 && (
        <Pressable style={{ marginTop: 24, alignItems: 'center' }} onPress={() => router.push('/(coach)/match' as any)}>
          <Text style={s.findMore}>Find more players →</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 32 },

    pendingIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(234,12,95,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    pendingTitle: { fontFamily: FontFamily.headlineBold, fontSize: 19, color: C.text, marginBottom: 8, textAlign: 'center' },
    pendingBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 20, textAlign: 'center' },

    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: FontFamily.headline, fontSize: 26, color: C.text },
    count: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textDim },
    sub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginTop: 4 },

    filterRow: { gap: 8, paddingBottom: 20 },
    filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, borderWidth: 1.5, borderColor: C.border },
    filterPillActive: { backgroundColor: 'rgba(234,12,95,0.12)', borderColor: PINK_RED },
    filterPillText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim },
    filterPillTextActive: { color: PINK_RED },

    emptyState: { backgroundColor: C.surface, borderRadius: 16, paddingVertical: 60, paddingHorizontal: 24, alignItems: 'center' },
    emptyTitle: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, marginBottom: 24, textAlign: 'center' },
    emptyBtnWrap: { borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10, overflow: 'hidden' },
    emptyBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, backgroundColor: C.surfaceAlt },
    avatarFallbackText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13 },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    meta: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 3 },
    unreadBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: PINK_RED, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    unreadBadgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 10, color: '#fff' },
    score: { fontFamily: FontFamily.headline, fontSize: 17, color: PINK_RED },
    scoreLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim },
    date: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginBottom: 4 },

    findMore: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
  });
}
