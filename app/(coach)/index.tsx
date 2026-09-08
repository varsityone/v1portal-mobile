import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ActivityIndicator, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCoachData, Coach } from '../../hooks/useCoachData';
import { GRADIENT, TIER_GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import StatCard, { ACTIVITY_TIERS, MESSAGE_TIERS, activityTierIndex, unreadTierIndex } from '../../components/StatCard';

// Matches web's components/CoachDashboard.tsx PERIOD_BG / PERIOD_ACCENT exactly —
// a bold solid (or gradient, for the all-clear states) status banner, not a
// neutral card with a colored border tint.
const PERIOD_BG: Record<string, [string, string] | string> = {
  dead: '#7f1d1d', quiet: '#78350f', evaluation: '#1e3a5f',
  contact: ['#177100', '#00ff49'], signing: '#4c1d95',
  open: ['#177100', '#00ff49'], unknown: '#303238',
};
const PERIOD_ACCENT: Record<string, string> = {
  dead: '#7f1d1d', quiet: '#78350f', evaluation: '#1e3a5f',
  contact: '#177100', signing: '#4c1d95', open: '#177100', unknown: '#000',
};
const PERIOD_LABELS: Record<string, string> = {
  dead: 'Dead Period', quiet: 'Quiet Period', evaluation: 'Evaluation Period',
  contact: 'Contact Period', signing: 'Signing Period', open: 'Open Recruiting', unknown: 'Unknown',
};
const RESTRICTIVE_PERIODS = new Set(['dead', 'quiet']);

function daysBetween(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

interface Compliance {
  period: string;
  period_description: string;
  communication_allowed: string[];
  queue_until: string | null;
  period_end_date?: string | null;
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

  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [matches, setMatches] = useState<RecentMatch[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
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

      // Only count swipes the coach themselves made — the same coach_id
      // shows up on rows where an athlete swiped on this program too.
      const { count: sCount } = await supabase
        .from('swipes')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', c.id)
        .eq('swiped_by', 'coach');
      setSwipeCount(sCount ?? 0);

      const { count: savedC } = await supabase
        .from('coach_saved_prospects')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', c.id);
      setSavedCount(savedC ?? 0);

      if (matchData && matchData.length > 0) {
        const matchIds = matchData.map(m => m.id);
        const { count: unread } = await supabase
          .from('match_messages')
          .select('*', { count: 'exact', head: true })
          .in('match_id', matchIds)
          .eq('sender_type', 'athlete')
          .eq('status', 'sent');
        setUnreadCount(unread ?? 0);
      }

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
  const periodLabel = PERIOD_LABELS[periodKey] ?? PERIOD_LABELS.unknown;
  const periodBg = PERIOD_BG[periodKey] ?? PERIOD_BG.unknown;
  const periodAccent = PERIOD_ACCENT[periodKey] ?? PERIOD_ACCENT.unknown;
  const isRestrictive = RESTRICTIVE_PERIODS.has(periodKey);
  const daysLeftInPeriod = compliance?.period_end_date
    ? daysBetween(new Date().toISOString().split('T')[0], compliance.period_end_date)
    : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      {/* Greeting — white welcome card, same treatment as the athlete
          dashboard's greeting card: eyebrow + title + status line + tier
          pills + a pinned "View Profile" button. */}
      <View style={s.greetCard}>
        {coach.profile_photo_url ? (
          <Image source={{ uri: coach.profile_photo_url }} style={s.greetBgAvatar} />
        ) : null}
        <View style={s.greetContent}>
          <Text style={s.greetEyebrow}>Coach Portal Dashboard</Text>
          <Text style={s.greetCardTitle}>{greeting}, Coach {firstName}.</Text>
          <Text style={s.greetCardSub}>
            {matchCount === 0
              ? 'Start swiping to find your next signee.'
              : `You have ${matchCount} active match${matchCount === 1 ? '' : 'es'}${unreadCount > 0 ? ` and ${unreadCount} unread message${unreadCount === 1 ? '' : 's'}` : ''}.`}
          </Text>
          <View style={s.tierRow}>
            <Text style={s.tierRowLabel}>Status:</Text>
            <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tierPill}>
              <Text style={s.tierPillText}>Verified Coach</Text>
            </LinearGradient>
            {coach.division ? (
              <View style={[s.tierPill, { backgroundColor: '#f0eeea' }]}>
                <Text style={[s.tierPillText, { color: '#555' }]}>{coach.division}</Text>
              </View>
            ) : null}
            {coach.school_name ? <Text style={s.tierRowSchool}>{coach.school_name}</Text> : null}
          </View>
        </View>
        {coach.profile_slug ? (
          <Pressable style={s.viewProfileBtn} onPress={() => router.push(`/(coach)/profile` as any)}>
            <Text style={s.viewProfileBtnText}>View Profile</Text>
            <Ionicons name="arrow-forward" size={12} color="#C13584" />
          </Pressable>
        ) : null}
      </View>

      {/* Primary CTA + secondary action cards */}
      <Pressable style={s.ctaWrap} onPress={() => router.push('/(coach)/match' as any)}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View>
          <Text style={s.ctaTitle}>Find Players</Text>
          <Text style={s.ctaSub}>Swipe & match with athletes who fit your program</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </Pressable>

      <View style={s.secondaryRow}>
        {[
          { href: '/(coach)/recruiting', label: 'Recruiting Map', sub: 'Target states', icon: 'map-outline' as const },
          { href: '/(coach)/messages', label: 'Messages', sub: 'Reach out', icon: 'chatbubbles-outline' as const },
          { href: '/(coach)/saved', label: 'Saved Prospects', sub: 'Your shortlist', icon: 'bookmark-outline' as const },
        ].map(cta => (
          <Pressable key={cta.href} style={s.secondaryCard} onPress={() => router.push(cta.href as any)}>
            <Ionicons name={cta.icon} size={22} color="#fff" />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.secondaryCardTitle}>{cta.label}</Text>
              <Text style={s.secondaryCardSub}>{cta.sub}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Recruiting Activity — StatCard/TierBar pattern, matching web exactly */}
      <View style={s.sectionHeader}>
        <Text style={s.recruitingActivityLabel}>Recruiting Activity</Text>
        <Pressable onPress={() => router.push('/(coach)/analytics' as any)}>
          <Text style={s.seeAll}>Full Analytics →</Text>
        </Pressable>
      </View>
      <View style={s.statGrid}>
        <StatCard label="Matches" value={matchCount} sub="Athletes who matched back with you" tiers={ACTIVITY_TIERS} activeIndex={activityTierIndex(matchCount, [1, 3, 6, 10])} />
        <StatCard label="Players Viewed" value={swipeCount} sub="Prospects you've swiped through so far" tiers={ACTIVITY_TIERS} activeIndex={activityTierIndex(swipeCount, [10, 25, 50, 100])} />
        <StatCard label="Saved Prospects" value={savedCount} sub="Athletes on your shortlist" tiers={ACTIVITY_TIERS} activeIndex={activityTierIndex(savedCount, [2, 5, 10, 20])} />
        <StatCard label="Unread Messages" value={unreadCount} sub="From matched athletes" tiers={MESSAGE_TIERS} activeIndex={unreadTierIndex(unreadCount)} />
      </View>

      {/* Compliance — a legal-status card, not just another info tile: a bold
          solid/gradient banner (deep period-status color) with white
          foreground, matching web's "Find Players" hero treatment rather
          than a neutral card with a colored border tint. */}
      {Array.isArray(periodBg) ? (
        <LinearGradient colors={periodBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.complianceCard}>
          <ComplianceCardBody
            coach={coach} periodLabel={periodLabel} isRestrictive={isRestrictive}
            daysLeftInPeriod={daysLeftInPeriod} compliance={compliance} periodAccent={periodAccent}
            pulseAnim={pulseAnim} s={s} router={router}
          />
        </LinearGradient>
      ) : (
        <View style={[s.complianceCard, { backgroundColor: periodBg }]}>
          <ComplianceCardBody
            coach={coach} periodLabel={periodLabel} isRestrictive={isRestrictive}
            daysLeftInPeriod={daysLeftInPeriod} compliance={compliance} periodAccent={periodAccent}
            pulseAnim={pulseAnim} s={s} router={router}
          />
        </View>
      )}

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

function ComplianceCardBody({ coach, periodLabel, isRestrictive, daysLeftInPeriod, compliance, periodAccent, pulseAnim, s, router }: {
  coach: Coach;
  periodLabel: string;
  isRestrictive: boolean;
  daysLeftInPeriod: number | null;
  compliance: Compliance | null;
  periodAccent: string;
  pulseAnim: Animated.Value;
  s: ReturnType<typeof createStyles>;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
      <View style={s.complianceHeader}>
        <View style={s.complianceHeaderLeft}>
          <Ionicons name={isRestrictive ? 'shield' : 'shield-checkmark'} size={36} color="#fff" />
          <View>
            <View style={s.complianceStatusRow}>
              <View style={s.pulseWrap}>
                <Animated.View style={[s.pulseGlow, { opacity: pulseAnim }]} />
                <View style={s.pulseDot} />
              </View>
              <Text style={s.complianceLabel}>COMPLIANCE STATUS · {coach.division}</Text>
            </View>
            <Text style={s.periodTitle}>{periodLabel}</Text>
          </View>
        </View>
        {daysLeftInPeriod != null && (
          <View style={{ alignItems: 'center' }}>
            <Text style={s.daysLeftValue}>{daysLeftInPeriod}</Text>
            <Text style={s.daysLeftLabel}>day{daysLeftInPeriod === 1 ? '' : 's'} left</Text>
          </View>
        )}
      </View>

      <Text style={s.complianceBody}>
        {compliance?.period_description ?? 'Loading compliance data…'}
      </Text>
      {compliance?.queue_until && (
        <Text style={s.queueText}>
          Next contact opens: <Text style={{ color: '#fff', fontFamily: FontFamily.bodyBold }}>
            {new Date(compliance.queue_until + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </Text>
      )}
      {!!compliance?.communication_allowed?.length && (
        <View style={s.commChips}>
          {compliance.communication_allowed.map(c => (
            <View key={c} style={s.commChip}>
              <Text style={s.commChipText}>{c.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          ))}
        </View>
      )}
      <Pressable style={s.complianceLinkBtn} onPress={() => router.push('/(coach)/compliance' as any)}>
        <Text style={[s.complianceLinkText, { color: periodAccent }]}>View Full Calendar</Text>
        <Ionicons name="arrow-forward" size={13} color={periodAccent} />
      </Pressable>
    </>
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

    greetCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, marginBottom: 20, overflow: 'hidden' },
    greetBgAvatar: { position: 'absolute', top: 0, right: -60, width: 200, height: 200, borderRadius: 100, opacity: 0.12 },
    greetContent: { position: 'relative' },
    greetEyebrow: { fontFamily: FontFamily.mono, fontSize: 10, color: 'rgba(0,0,0,0.45)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    greetCardTitle: { fontFamily: FontFamily.headline, fontSize: 24, fontWeight: '900', color: '#0a0a0a', marginBottom: 6 },
    greetCardSub: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 18 },
    tierRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    tierRowLabel: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
    tierPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
    tierPillText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    tierRowSchool: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: 'rgba(0,0,0,0.5)' },
    viewProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, alignSelf: 'flex-start' },
    viewProfileBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#C13584' },

    secondaryRow: { gap: 10, marginBottom: 24 },
    secondaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#000', borderRadius: 14, padding: 16, minHeight: 72 },
    secondaryCardTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    secondaryCardSub: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

    recruitingActivityLabel: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: C.textMuted },
    statGrid: { gap: 16, marginBottom: 8 },

    complianceCard: { borderRadius: 20, padding: 22, marginBottom: 20 },
    complianceHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 },
    complianceHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
    complianceStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    pulseWrap: { width: 7, height: 7, alignItems: 'center', justifyContent: 'center' },
    pulseGlow: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#facc15' },
    pulseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#facc15' },
    complianceLabel: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
    periodTitle: { fontFamily: FontFamily.headline, fontSize: 22, color: '#fff', marginTop: 4 },
    daysLeftValue: { fontFamily: FontFamily.mono, fontSize: 32, color: '#fff' },
    daysLeftLabel: { fontFamily: FontFamily.body, fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    complianceBody: { fontFamily: FontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },
    queueText: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
    commChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
    commChip: { borderRadius: 100, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.16)' },
    commChipText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
    complianceLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 100, paddingHorizontal: 18, paddingVertical: 10, marginTop: 20 },
    complianceLinkText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 12 },

    ctaWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, padding: 20, marginBottom: 24, overflow: 'hidden' },
    ctaTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, color: '#fff', marginBottom: 2 },
    ctaSub: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.75)' },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.text },
    seeAll: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: '#fff' },

    emptyMatches: { backgroundColor: C.surface, borderRadius: 12, padding: 28, alignItems: 'center' },
    emptyMatchesText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, marginBottom: 10, textAlign: 'center' },
    emptyMatchesLink: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 12, padding: 14 },
    matchAvatar: { width: 40, height: 40, borderRadius: 20 },
    matchName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 2 },
    matchSub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    matchScore: { fontFamily: FontFamily.headline, fontSize: 17, color: C.primary },
    matchScoreLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5 },
  });
}
