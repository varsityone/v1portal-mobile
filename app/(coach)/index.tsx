import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCoachData, Coach } from '../../hooks/useCoachData';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

const PERIOD_COLORS: Record<string, string> = {
  dead: '#ef4444', quiet: '#f59e0b', evaluation: '#3b82f6',
  contact: '#22c55e', signing: '#8b5cf6', open: '#22c55e', unknown: '#6b7280',
};
const PERIOD_LABELS: Record<string, string> = {
  dead: 'Dead Period', quiet: 'Quiet Period', evaluation: 'Evaluation Period',
  contact: 'Contact Period', signing: 'Signing Period', open: 'Open Recruiting', unknown: 'Unknown',
};

interface Compliance {
  period: string;
  period_description: string;
  communication_allowed: string[];
  queue_until: string | null;
}

interface RecentMatch {
  id: string;
  matched_at: string;
  athlete: {
    full_name: string | null;
    position: string | null;
    graduation_year: number | null;
    v1_score: number | null;
    profile_photo_url: string | null;
  } | null;
}

export default function CoachDashboard() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();

  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (coachLoading) return;
    if (!coach || !coach.position_coached) {
      router.replace('/coach-setup' as any);
      return;
    }
    if (!coach.verified) { setLoading(false); return; }

    async function loadVerified(c: Coach) {
      fetch('https://v1portal.com/api/compliance/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: c.id,
          athlete_id: '00000000-0000-0000-0000-000000000000',
          division: c.division,
          region: c.region ?? undefined,
          action: 'swipe',
        }),
      }).then(r => r.json()).then(setCompliance).catch(() => null);

      const { data: matchData } = await supabase
        .from('mutual_matches')
        .select('id, matched_at, athlete_id')
        .eq('coach_id', c.id)
        .eq('status', 'active')
        .order('matched_at', { ascending: false })
        .limit(5);

      if (matchData && matchData.length > 0) {
        const enriched = await Promise.all(matchData.map(async m => {
          const { data: athlete } = await supabase
            .from('athletes')
            .select('full_name, position, graduation_year, v1_score, profile_photo_url')
            .eq('id', m.athlete_id)
            .single();
          return { id: m.id, matched_at: m.matched_at, athlete: athlete ?? null };
        }));
        setMatches(enriched);
      }

      const { count: mCount } = await supabase
        .from('mutual_matches')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', c.id)
        .eq('status', 'active');
      setMatchCount(mCount ?? 0);

      const { count: sCount } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', c.id);
      setSwipeCount(sCount ?? 0);

      setLoading(false);
    }
    loadVerified(coach);
  }, [coachLoading, coach?.id, coach?.verified]);

  const handleResend = async () => {
    if (!coach || resending || resent) return;
    setResending(true);
    try {
      await fetch('https://v1portal.com/api/coach/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: coach.id, email: coach.school_email, fullName: coach.full_name }),
      });
      setResent(true);
    } finally {
      setResending(false);
    }
  };

  if (coachLoading || (loading && coach?.verified)) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  if (!coach) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = coach.full_name?.split(' ')[0] ?? 'Coach';

  // ── Unverified: real dashboard shell (drawer nav still works, this
  // isn't a full-screen lockout), but no stats/compliance/matches to show
  // yet — swiping and messaging stay hard-gated behind `verified` in
  // their own screens, since that's a real athlete-data boundary, not
  // just App Store optics. ──
  if (!coach.verified) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <View style={s.greetBlock}>
          <Text style={s.eyebrow}>DASHBOARD</Text>
          <Text style={s.greetTitle}>{greeting}, Coach {firstName}.</Text>
          <Text style={s.greetSub}>{coach.school_name} · {coach.division}</Text>
        </View>

        <View style={s.pendingCard}>
          <View style={s.pendingIconWrap}>
            <Ionicons name="time-outline" size={24} color="#a78bfa" />
          </View>
          <Text style={s.pendingTitle}>
            {coach.email_verified ? 'Pending Final Review' : 'Verify Your Email'}
          </Text>
          <Text style={s.pendingBody}>
            {coach.email_verified
              ? "Your email is confirmed. We're doing a quick manual check on your program — you'll be live within one business day."
              : `We sent a confirmation link to ${coach.school_email}. Click it to activate your program.`}
          </Text>
          {!coach.email_verified && (
            <Pressable style={s.resendBtnWrap} onPress={handleResend} disabled={resending || resent}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={s.resendBtnText}>
                {resent ? 'Email sent' : resending ? 'Sending…' : 'Resend Confirmation Email'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    );
  }

  const periodKey = compliance?.period ?? 'unknown';
  const periodColor = PERIOD_COLORS[periodKey] ?? PERIOD_COLORS.unknown;
  const periodLabel = PERIOD_LABELS[periodKey] ?? PERIOD_LABELS.unknown;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.greetBlock}>
        <Text style={s.eyebrow}>DASHBOARD</Text>
        <Text style={s.greetTitle}>{greeting}, Coach {firstName}.</Text>
        <Text style={s.greetSub}>{coach.school_name} · {coach.division}</Text>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{matchCount}</Text>
          <Text style={s.statLabel}>Matches</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{swipeCount}</Text>
          <Text style={s.statLabel}>Players Viewed</Text>
        </View>
      </View>

      {/* Compliance card */}
      <View style={[s.complianceCard, { borderColor: `${periodColor}40` }]}>
        <View style={s.complianceHeader}>
          <Text style={s.complianceLabel}>COMPLIANCE · {coach.division}</Text>
          <View style={s.periodBadge}>
            <View style={[s.periodDot, { backgroundColor: periodColor }]} />
            <Text style={[s.periodText, { color: periodColor }]}>{periodLabel}</Text>
          </View>
        </View>
        <Text style={s.complianceBody}>
          {compliance?.period_description ?? 'Loading compliance data…'}
        </Text>
        {compliance?.queue_until && (
          <Text style={s.queueText}>
            Next contact opens: <Text style={{ color: C.text, fontFamily: FontFamily.bodyBold }}>
              {new Date(compliance.queue_until + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </Text>
        )}
        {!!compliance?.communication_allowed?.length && (
          <View style={s.commChips}>
            {compliance.communication_allowed.map(c => (
              <View key={c} style={[s.commChip, { backgroundColor: `${periodColor}18` }]}>
                <Text style={[s.commChipText, { color: periodColor }]}>{c.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>
            ))}
          </View>
        )}
        <Pressable onPress={() => router.push('/(coach)/compliance' as any)}>
          <Text style={s.complianceLink}>Full calendar →</Text>
        </Pressable>
      </View>

      {/* CTA */}
      <Pressable style={s.ctaWrap} onPress={() => router.push('/(coach)/match' as any)}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View>
          <Text style={s.ctaTitle}>Find Players</Text>
          <Text style={s.ctaSub}>Swipe & match</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </Pressable>

      {/* Recent matches */}
      <View style={{ marginTop: 8 }}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Matches</Text>
          {matchCount > 0 && (
            <Pressable onPress={() => router.push('/(coach)/matches' as any)}>
              <Text style={s.seeAll}>See all</Text>
            </Pressable>
          )}
        </View>

        {matches.length === 0 ? (
          <View style={s.emptyMatches}>
            <Text style={s.emptyMatchesText}>No matches yet. Start swiping on players.</Text>
            <Pressable onPress={() => router.push('/(coach)/match' as any)}>
              <Text style={s.emptyMatchesLink}>Find Players →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {matches.map(match => (
              <Pressable key={match.id} style={s.matchRow} onPress={() => router.push(`/(coach)/match/${match.id}` as any)}>
                {match.athlete?.profile_photo_url ? (
                  <Image source={{ uri: match.athlete.profile_photo_url }} style={s.matchAvatar} />
                ) : (
                  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.matchAvatar} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.matchName} numberOfLines={1}>{match.athlete?.full_name ?? 'Unknown Athlete'}</Text>
                  <Text style={s.matchSub} numberOfLines={1}>
                    {match.athlete?.position ?? '—'} · Class of {match.athlete?.graduation_year ?? '—'}
                  </Text>
                </View>
                {match.athlete?.v1_score != null && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.matchScore}>{match.athlete.v1_score}</Text>
                    <Text style={s.matchScoreLabel}>V1</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    greetBlock: { marginBottom: 24 },
    greetTitle: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    greetSub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginTop: 2 },

    pendingCard: { backgroundColor: C.surface, borderRadius: 20, padding: 28, alignItems: 'center' },
    pendingIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(80,26,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    pendingTitle: { fontFamily: FontFamily.headlineBold, fontSize: 19, color: C.text, marginBottom: 8, textAlign: 'center' },
    pendingBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 20, textAlign: 'center', marginBottom: 20 },
    resendBtnWrap: { borderRadius: 100, paddingVertical: 13, paddingHorizontal: 24, overflow: 'hidden' },
    resendBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 16 },
    statValue: { fontFamily: FontFamily.headline, fontSize: 26, color: C.text },
    statLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },

    complianceCard: { backgroundColor: C.surface, borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 20 },
    complianceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    complianceLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, letterSpacing: 0.5 },
    periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    periodDot: { width: 8, height: 8, borderRadius: 4 },
    periodText: { fontFamily: FontFamily.bodyBold, fontSize: 12 },
    complianceBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19 },
    queueText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 8 },
    commChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    commChip: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
    commChipText: { fontFamily: FontFamily.mono, fontSize: 9, letterSpacing: 0.5 },
    complianceLink: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.primary, marginTop: 14 },

    ctaWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 20, marginBottom: 24, overflow: 'hidden' },
    ctaTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, color: '#fff', marginBottom: 2 },
    ctaSub: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.75)' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.text },
    seeAll: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.primary },

    emptyMatches: { backgroundColor: C.surface, borderRadius: 12, padding: 28, alignItems: 'center' },
    emptyMatchesText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, marginBottom: 10, textAlign: 'center' },
    emptyMatchesLink: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.primary },

    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 12, padding: 14 },
    matchAvatar: { width: 40, height: 40, borderRadius: 20 },
    matchName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 2 },
    matchSub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    matchScore: { fontFamily: FontFamily.headline, fontSize: 17, color: C.primary },
    matchScoreLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5 },
  });
}
