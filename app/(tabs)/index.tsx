import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../components/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAthleteData } from '../../hooks/useAthleteData';
import { supabase } from '../../lib/supabase';
import { Colors, GRADIENT, ThemeColors, TIER_COLORS, getTierFromAthlete } from '../../constants/Colors';
import { useColors, useTheme } from '../../context/ThemeContext';
import { PHASES } from '../../constants/Phases';

// ── Score helpers ─────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  const t = Math.min(score / 99.9, 1);
  if (t <= 0.5) {
    const p = t / 0.5;
    return `rgb(0,${Math.round(106 + 74 * p)},255)`;
  }
  const p = (t - 0.5) / 0.5;
  return `rgb(0,${Math.round(180 + 75 * p)},${Math.round(255 - 225 * p)})`;
}

function getRecruitingLevel(score: number): string {
  if (score >= 80) return 'FBS LEVEL';
  if (score >= 75) return 'FCS LEVEL';
  if (score >= 70) return 'FCS / D2 LEVEL';
  if (score >= 60) return 'D2 / D3 LEVEL';
  if (score >= 50) return 'NAIA / JUCO LEVEL';
  return 'JUCO / PREP LEVEL';
}

function getRecruitingLevelFromScore(score: number | null): string {
  if (!score) return '';
  if (score >= 80) return 'FBS Prospect';
  if (score >= 75) return 'FCS Prospect';
  if (score >= 70) return 'D2 Prospect';
  if (score >= 60) return 'D3/NAIA Prospect';
  if (score >= 50) return 'NAIA/JUCO Prospect';
  return 'JUCO/Prep School Prospect';
}

function getActiveTierIndex(score: number): number {
  if (score >= 80) return 4;
  if (score >= 75) return 3;
  if (score >= 60) return 2;
  if (score >= 50) return 1;
  return 0;
}

const TIERS = [
  { label: 'Dev',  color: '#006aff' },
  { label: 'Emrg', color: '#00b4ff' },
  { label: 'Comp', color: '#00ff1e' },
  { label: 'Cont', color: '#4040dd' },
  { label: 'Elite', color: '#6020ff' },
];

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { athlete, assessment, loading, refresh } = useAthleteData();
  const C = useColors();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = useMemo(() => createStyles(C), [C]);

  const [matchCount, setMatchCount] = useState(0);
  const [outreachCount, setOutreachCount] = useState(0);
  const [trackerCount, setTrackerCount] = useState(0);
  const [profileViews, setProfileViews] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [isScoreAnimating, setIsScoreAnimating] = useState(true);

  // Skip the very first focus (mount already fetches); re-fetch on subsequent focuses
  // so the score updates immediately when returning from the assessment WebView.
  const scrollRef = useRef<ScrollView>(null);
  const isMounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (!isMounted.current) { isMounted.current = true; return; }
      refresh();
    }, [refresh])
  );

  const fetchCounts = useCallback(async () => {
    if (!athlete?.id) return;
    const [
      { data: matchData, error: matchErr },
      { data: outData },
      { count: pv },
      { count: tCount },
    ] = await Promise.all([
      supabase.from('matches').select('id').eq('athlete_id', athlete.id).limit(20),
      supabase.from('coach_outreach').select('status').eq('athlete_id', athlete.id),
      supabase.from('profile_views').select('*', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
      supabase.from('coach_tracker').select('id', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
    ]);
    if (matchErr) console.error('[dashboard] matches error:', matchErr.message);
    setMatchCount(matchData?.length ?? 0);
    const sent = (outData ?? []).filter(o => ['sent', 'opened', 'bounced', 'replied'].includes(o.status ?? '')).length;
    setOutreachCount(sent > 0 ? sent : (outData?.length ?? 0));
    setProfileViews(pv ?? 0);
    setTrackerCount(tCount ?? 0);
  }, [athlete?.id]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const score = athlete?.v1_score != null
    ? Math.round(Number(athlete.v1_score))
    : assessment?.v1_score
    ? Math.round(assessment.v1_score)
    : null;

  useEffect(() => {
    if (!score) { setDisplayScore(0); return; }
    const duration = 1500;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayScore(Math.round(score * eased));
      if (progress >= 1) { clearInterval(timer); setIsScoreAnimating(false); }
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const fullName  = athlete?.full_name || '';
  const firstName = fullName ? fullName.split(' ')[0].trim() : 'Athlete';
  const initials  = fullName
    ? fullName.trim().split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
    : (session?.user?.email ?? '??').slice(0, 2).toUpperCase();
  const activeTierIdx = getActiveTierIndex(displayScore);
  const numColor = score ? (isScoreAnimating ? getScoreColor(displayScore) : C.text) : C.textDim;

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const schoolClassification = (() => {
    if (!assessment) return null;
    const r = assessment as any;
    const responses = typeof r.responses === 'string' ? JSON.parse(r.responses) : (r.responses || {});
    return responses.school_classification || null;
  })();

  const tierDisplay = getTierFromAthlete(athlete?.subscription_status, athlete?.subscription_tier, !!athlete);
  const tierColor = TIER_COLORS[tierDisplay];
  const tierTextColor = tierDisplay === 'Free' ? C.textMuted : '#fff';

  const phaseComplete = [
    !!assessment?.v1_score,
    !!(
      athlete?.full_name && athlete?.phone && athlete?.bio &&
      athlete?.position && athlete?.graduation_year && athlete?.height &&
      athlete?.weight && athlete?.high_school && athlete?.city &&
      athlete?.gpa && athlete?.ncaa_id &&
      (athlete?.sat_score || athlete?.act_score || athlete?.test_scores_not_taken) &&
      athlete?.hudl_link &&
      athlete?.guardian_name && athlete?.guardian_relationship &&
      athlete?.guardian_phone && athlete?.guardian_email
    ),
    !!athlete?.target_list_saved_at,
    outreachCount > 0,
    trackerCount >= 1,
    outreachCount >= 5,
  ];

  const phaseLocked = PHASES.map((_, i) => i > 0 && !phaseComplete[i - 1]);

  const phaseEffectiveDone = phaseComplete.map((c, i) => !phaseLocked[i] && c);
  const curPhaseIdx = phaseEffectiveDone.findIndex(c => !c);
  const activePhaseIdx = curPhaseIdx === -1 ? 5 : curPhaseIdx;
  const completedCount = phaseEffectiveDone.filter(Boolean).length;
  const progressPct = (completedCount / 6) * 100;

  const statusMsg = completedCount === 0
    ? "Let's get you recruited. Start with Phase 1 below."
    : completedCount === 6
    ? "You've completed all 6 phases. Stay active and keep pushing."
    : `You're on Phase ${activePhaseIdx + 1} of 6. Keep the momentum going.`;

  const handleRefresh = async () => {
    await Promise.all([refresh(), fetchCounts()]);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={C.primary} />
      }
    >
      {/* ── Greeting header ── */}
      <View style={styles.welcomeCard}>
        <Text style={styles.eyebrow}>THE GAMEPLAN</Text>
        <Text style={styles.welcomeTitle}>
          {timeGreeting}{firstName ? `, ${firstName}` : ''}.
        </Text>
        <Text style={styles.welcomeSub}>{statusMsg}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.tierLabel}>Tier:</Text>
          <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
            <Text style={[styles.tierBadgeText, { color: tierTextColor }]}>{tierDisplay}</Text>
          </View>
          {score !== null && (
            <LinearGradient colors={['#ff0000', '#aa00ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.recruitingLevelBadge}>
              <Text style={styles.recruitingLevelBadgeText}>{getRecruitingLevelFromScore(score)}</Text>
            </LinearGradient>
          )}
          {schoolClassification && (
            <View style={styles.classificationBadge}>
              <Text style={styles.classificationBadgeText}>HS: {schoolClassification}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── V1 Score card (gradient border) ── */}
      <LinearGradient
        colors={['#833AB4', '#E1306C', '#FCAF45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.scoreGradient}
      >
        <View style={styles.scoreInner}>
          <Text style={styles.scoreLabel}>V1 SCORE</Text>

          <Text style={[styles.scoreNumber, { color: numColor }]}>
            {score !== null ? displayScore : '––'}
          </Text>

          {score !== null ? (
            <Text style={styles.recruitingLevel}>{getRecruitingLevel(displayScore)}</Text>
          ) : (
            <Text style={styles.noScoreHint}>
              Complete your assessment to unlock your score
            </Text>
          )}

          <View style={styles.tierRow}>
            {TIERS.map((tier, i) => {
              const active = score !== null && i <= activeTierIdx;
              return (
                <View key={tier.label} style={styles.tierItem}>
                  <View style={[styles.tierBar, { backgroundColor: active ? C.text : C.surfaceAlt }]} />
                  <Text style={[
                    styles.tierBarLabel,
                    {
                      color: (active && i === activeTierIdx) ? C.text : C.textDim,
                      fontWeight: (active && i === activeTierIdx) ? '800' : '400',
                    },
                  ]}>
                    {tier.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {score === null && !loading && (
            <Pressable onPress={() => router.push('/(tabs)/gameplan' as any)}>
              <LinearGradient
                colors={['#ff0000', '#aa00ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.assessmentBtn}
              >
                <Text style={styles.assessmentBtnText}>Start Assessment</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── Overall Progress ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>Recruiting Journey</Text>
          </View>
        </View>

        <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>

        <View style={styles.progressBarWrap}>
          {/* Glow layer behind track */}
          {progressPct > 0 && (
            <View style={[styles.progressGlow, { width: `${Math.max(progressPct, 6)}%` as any }]} />
          )}
          {/* Track */}
          <View style={styles.progressBarTrack}>
            {progressPct > 0 && (
              <LinearGradient
                colors={GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${Math.max(progressPct, 6)}%` }]}
              />
            )}
          </View>
          {/* Floating pill label */}
          <View style={styles.progressBarPill}>
            <Text style={styles.progressBarPillText}>
              {completedCount === 6 ? 'Complete!' : `Phase ${activePhaseIdx + 1} of 6`}
            </Text>
          </View>
        </View>
      </View>


      {/* ── Phase list — gradient timeline ── */}

      {/* Vertical gradient timeline */}
      <View>
        {PHASES.map((phase, i) => {
          const locked = phaseLocked[i];
          const done = phaseEffectiveDone[i];
          const active = i === activePhaseIdx && !locked;
          const isLast = i === PHASES.length - 1;

          let sub = '';
          if (done) {
            if (i === 0) sub = 'Takes ~12 minutes';
            else if (i === 1) sub = 'Profile complete';
            else if (i === 2) sub = 'Target list locked in';
            else if (i === 3) sub = 'Outreach sent';
            else if (i === 4) sub = 'Coaches tracked';
            else sub = 'Phase complete';
          } else if (active) {
            if (i === 0) sub = 'Takes ~12 minutes';
            else if (i === 1) {
              const fields = [
                athlete?.full_name, athlete?.phone, athlete?.bio,
                athlete?.position, athlete?.graduation_year, athlete?.height,
                athlete?.weight, athlete?.high_school, athlete?.city,
                athlete?.gpa, athlete?.ncaa_id,
                (athlete?.sat_score || athlete?.act_score || athlete?.test_scores_not_taken),
                athlete?.hudl_link,
                athlete?.guardian_name, athlete?.guardian_relationship,
                athlete?.guardian_phone, athlete?.guardian_email,
              ];
              const left = fields.filter(f => !f).length;
              sub = left > 0 ? `${left} of 17 fields left` : 'Ready to complete';
            } else if (i === 2) sub = athlete?.target_list_saved_at ? 'Target list locked in' : 'Review your list';
            else if (i === 3) sub = 'Email templates ready';
            else if (i === 4) sub = trackerCount > 0 ? `${trackerCount} coach${trackerCount !== 1 ? 'es' : ''} tracked` : 'Track your first coach';
            else sub = 'Final phase';
          } else if (locked && i > 0) {
            sub = `Complete Phase ${i} first`;
          } else if (!locked && !done) {
            sub = `Complete Phase ${i} first`;
          }

          return (
            <View key={i} style={styles.phaseTimelineItem}>
              {/* Left: connector + node + connector */}
              <View style={styles.phaseTimelineLeft}>
                {i > 0 && (
                  <LinearGradient
                    colors={[
                      done ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                      done ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    ]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.phaseConnector}
                  />
                )}
                {done ? (
                  <View style={[styles.phaseNode, { backgroundColor: C.text }]}>
                    <Ionicons name="checkmark" size={16} color={C.background} />
                  </View>
                ) : active ? (
                  <View style={[styles.phaseNode, { backgroundColor: C.background, borderWidth: 3, borderColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)' }]} />
                ) : locked ? (
                  <View style={[styles.phaseNode, { backgroundColor: isDark ? '#1a1a1f' : '#d1d1d6' }]} />
                ) : (
                  <View style={[styles.phaseNode, { backgroundColor: isDark ? '#1a1a1f' : '#d1d1d6', opacity: 0.7 }]} />
                )}
                {!isLast && (
                  <LinearGradient
                    colors={[
                      done ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                      phaseEffectiveDone[i + 1] ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                    ]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.phaseConnector}
                  />
                )}
              </View>

              {/* Right: content */}
              <View style={[styles.phaseTimelineContent, locked && { opacity: 0.38 }]}>
                <View style={styles.phaseTimelineRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.phaseTimelineTitle, !done && !active && { color: C.textMuted }]}>
                      {phase.title}
                    </Text>
                    {sub ? <Text style={styles.phaseTimelineSub}>{sub}</Text> : null}
                  </View>
                  <View style={[
                    styles.phaseBadge,
                    done ? styles.phaseBadgeDone : active ? styles.phaseBadgeActive : locked ? styles.phaseBadgeLocked : styles.phaseBadgeUpcoming,
                  ]}>
                    <Text style={[
                      styles.phaseBadgeText,
                      locked && { color: C.warning },
                    ]}>
                      {done ? `Phase ${phase.number} Completed` : active ? 'In Progress' : 'Up Next'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.phaseDesc}>{phase.description}</Text>

                {!locked && (
                  <View style={styles.phaseBody}>
                    {phase.items.map((item, j) => {
                      const checked = done || (active && j === 0 && i === 0 && !!assessment);
                      return (
                        <Pressable
                          key={j}
                          style={({ pressed }) => [styles.checkItem, pressed && { backgroundColor: C.surfaceAlt }]}
                          onPress={() => router.push(`/(tabs)/gameplan/${phase.number}` as any)}
                        >
                          <View style={[styles.checkBox, checked && styles.checkBoxDone]}>
                            {checked && <Ionicons name="checkmark" size={10} color={C.background} />}
                          </View>
                          <Text style={[styles.checkLabel, checked && { opacity: 0.6 }]}>{item.label}</Text>
                          <Ionicons name="arrow-forward" size={12} color={C.icon} />
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* ── Stats row ── */}
      <View style={styles.statsRow}>
        {[
          { label: 'Profile Views', value: profileViews, icon: 'eye-outline' as const },
          { label: 'Emails Sent', value: outreachCount, icon: 'mail-outline' as const },
          { label: 'Programs', value: matchCount, icon: 'school-outline' as const },
        ].map((stat, i) => (
          <View key={i} style={styles.statCard}>
            <Ionicons name={stat.icon} size={16} color={C.icon} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Profile card ── */}
      <LinearGradient colors={['#ff0000', '#aa00ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
          <View style={styles.avatarInner}>
            {athlete?.profile_photo_url ? (
              <Image
                source={{ uri: athlete.profile_photo_url }}
                style={styles.avatarPhoto}
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>
        </LinearGradient>

        <Text style={styles.profileName}>{fullName || athlete?.email || 'Complete your profile'}</Text>
        <Text style={styles.profileLevel}>
          {score !== null ? getRecruitingLevelFromScore(score) : 'Complete assessment to see your tier'}
        </Text>

        {assessment?.score_breakdown && (
          <View style={styles.scoreBars}>
            {[
              { label: 'Athletic',    val: (assessment.score_breakdown.athletic    ?? assessment.score_breakdown.physical    ?? 0) as number },
              { label: 'Academic',    val: (assessment.score_breakdown.academic    ?? 0) as number },
              { label: 'Production',  val: (assessment.score_breakdown.production  ?? 0) as number },
              { label: 'Intangibles', val: (assessment.score_breakdown.intangibles ?? 0) as number },
            ].map(bar => (
              <View key={bar.label} style={styles.barRow}>
                <Text style={styles.barLabel}>{bar.label}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${bar.val}%` as any, backgroundColor: '#fff' }]} />
                </View>
                <Text style={styles.barValue}>{bar.val}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.profileActions}>
          <Pressable
            style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.75 }]}
            onPress={() => router.push('/(tabs)/profile' as any)}
          >
            <Text style={styles.profileBtnText}>Edit Profile</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.75 }]}
            onPress={() => router.push('/(tabs)/analytics' as any)}
          >
            <Text style={styles.profileBtnText}>View Analytics</Text>
          </Pressable>
        </View>
      </LinearGradient>


      {/* ── Program matches preview ── */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Program Matches</Text>
          {matchCount > 0 && (
            <Pressable onPress={() => router.push('/(tabs)/programs' as any)}>
              <Text style={styles.sectionLink}>See all →</Text>
            </Pressable>
          )}
        </View>
        {matchCount === 0 ? (
          <View style={styles.matchGate}>
            <Ionicons name="school-outline" size={22} color={C.icon} />
            <Text style={styles.matchGateText}>Complete your assessment to generate program matches</Text>
            <Pressable style={styles.matchGateBtn} onPress={() => router.push('/assessment' as any)}>
              <LinearGradient colors={['#ff0000', '#aa00ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={styles.matchGateBtnText}>Take Assessment →</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.matchViewAll}
            onPress={() => router.push('/(tabs)/programs' as any)}
          >
            <Ionicons name="school" size={18} color="#fff" />
            <Text style={styles.matchViewAllText}>View {matchCount} matched program{matchCount !== 1 ? 's' : ''}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.icon} />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 36, paddingHorizontal: 20, gap: 14 },

    // Greeting
    welcomeCard: { backgroundColor: C.surface, borderRadius: 18, padding: 22 },
    eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: C.text, marginBottom: 6 },
    welcomeTitle: { fontSize: 26, fontWeight: '700', color: C.text, letterSpacing: -0.5, marginBottom: 6, lineHeight: 30 },
    welcomeSub: { fontSize: 13, color: C.textMuted, lineHeight: 18, marginBottom: 14 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tierLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
    tierBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
    tierBadgeText: { fontSize: 12, fontWeight: '700' },
    recruitingLevelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
    recruitingLevelBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    classificationBadge: { paddingHorizontal: 2, paddingVertical: 3 },
    classificationBadgeText: { fontSize: 11, fontWeight: '600', color: C.textDim },

    // Score card
    scoreGradient: { borderRadius: 17, padding: 1.5 },
    scoreInner: { backgroundColor: C.scoreCard, borderRadius: 16, padding: 24, alignItems: 'center' },
    scoreLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.5, marginBottom: 12 },
    scoreNumber: { fontSize: 96, fontWeight: '900', letterSpacing: -6, lineHeight: 92, marginBottom: 12 },
    recruitingLevel: { fontSize: 13, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, marginBottom: 22 },
    noScoreHint: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginBottom: 22, lineHeight: 20 },
    tierRow: { flexDirection: 'row', gap: 6, width: '100%' },
    tierItem: { flex: 1, alignItems: 'center', gap: 5 },
    tierBar: { height: 3, width: '100%', borderRadius: 2 },
    tierBarLabel: { fontSize: 9, letterSpacing: 0.3 },
    assessmentBtn: { marginTop: 20, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13 },
    assessmentBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

    // Progress
    progressCard: { backgroundColor: C.surface, borderRadius: 20, padding: 22 },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    progressLabel: { fontSize: 15, fontWeight: '700', color: C.text },
    progressBadge: { paddingHorizontal: 12, paddingVertical: 5, backgroundColor: C.surfaceAlt, borderRadius: 100 },
    progressBadgeText: { fontSize: 11, fontWeight: '500', color: C.textMuted },
    progressPct: { fontSize: 52, fontWeight: '900', color: C.text, letterSpacing: -2, lineHeight: 60, marginBottom: 16 },
    progressBarWrap: { position: 'relative', height: 36 },
    progressBarTrack: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.surfaceAlt, borderRadius: 100, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 100 },
    progressGlow: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 100, backgroundColor: '#E1306C', shadowColor: '#E1306C', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 8 },
    progressBarPill: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: C.surfaceAlt, borderRadius: 100 },
    progressBarPillText: { fontSize: 12, fontWeight: '600', color: C.text },
    progressCount: { fontSize: 12, color: C.textMuted },

    // Phase list — gradient timeline (screenshot style)
    phaseChipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    phaseChipDone: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceAlt, borderWidth: 1.5, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
    phaseChipActive: { height: 42, paddingHorizontal: 20, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    phaseChipActiveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    phaseChip: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    phaseChipNum: { fontSize: 14, fontWeight: '600', color: C.textMuted },

    phaseTimelineItem: { flexDirection: 'row', alignItems: 'stretch' },
    phaseTimelineLeft: { width: 44, alignItems: 'center', flexShrink: 0 },
    phaseConnector: { width: 8, flex: 1, minHeight: 12 },
    phaseNode: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    phaseNodeSmall: { width: 14, height: 14, borderRadius: 7, flexShrink: 0 },
    phaseTimelineContent: { flex: 1, paddingLeft: 12, paddingVertical: 12 },
    phaseTimelineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    phaseTimelineTitle: { fontSize: 16, fontWeight: '700', color: C.text, lineHeight: 20 },
    phaseTimelineSub: { fontSize: 12, color: C.textMuted, lineHeight: 17, marginTop: 2 },

    phaseBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, flexShrink: 0 },
    phaseBadgeDone: { backgroundColor: C.border },
    phaseBadgeActive: { backgroundColor: C.border },
    phaseBadgeLocked: { backgroundColor: C.border },
    phaseBadgeUpcoming: { backgroundColor: C.border },
    phaseBadgeText: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
    phaseDesc: { fontSize: 12, color: C.textMuted, lineHeight: 18, marginTop: 6, marginBottom: 4 },

    // Expanded body
    phaseBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
    checkBox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: C.border2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    checkBoxDone: { backgroundColor: C.text, borderColor: C.text },
    checkLabel: { flex: 1, fontSize: 13, color: C.text, fontWeight: '500', lineHeight: 18 },
    upcomingMsg: { marginTop: 10, padding: 12, backgroundColor: C.surfaceAlt, borderRadius: 8, alignItems: 'center' },
    upcomingMsgText: { fontSize: 12, color: C.textDim, textAlign: 'center' },

    // Stats row
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -1, lineHeight: 28 },
    statLabel: { fontSize: 10, color: C.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 14 },

    // Profile card
    profileCard: { borderRadius: 20, padding: 22, alignItems: 'center', gap: 6, overflow: 'hidden' },
    avatarRing: { borderRadius: 44, padding: 2.5, marginBottom: 8 },
    avatarInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    avatarPhoto: { width: 72, height: 72, borderRadius: 36 },
    avatarInitials: { fontSize: 24, fontWeight: '800', color: C.text },
    profileName: { fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 4 },
    profileLevel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginBottom: 14, lineHeight: 16 },
    scoreBars: { width: '100%', gap: 7, marginBottom: 14, padding: 12, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 10 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.75)', width: 68 },
    barTrack: { flex: 1, height: 4, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    barValue: { fontSize: 10, fontWeight: '800', color: '#fff', width: 22, textAlign: 'right' },
    profileActions: { flexDirection: 'row', gap: 6, width: '100%' },
    profileBtn: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
    profileBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    // Tier features card
    tierFeaturesCard: { borderRadius: 20, padding: 22, gap: 16, overflow: 'hidden' },
    tierFeaturesHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tierIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.2)' },
    tierFeaturesTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, color: '#fff' },
    tierFeaturesSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
    tierDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    featureList: { gap: 11 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    featureLabel: { fontSize: 13, color: '#fff', fontWeight: '500' },
    seeUpgradeBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 2 },
    seeUpgradeBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },

    // Program matches preview
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
    sectionLink: { fontSize: 13, fontWeight: '600', color: C.primary },
    matchGate: { backgroundColor: C.surface, borderRadius: 14, padding: 22, alignItems: 'center', gap: 10 },
    matchGateText: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
    matchGateBtn: { borderRadius: 100, paddingHorizontal: 22, paddingVertical: 11, marginTop: 4, overflow: 'hidden' },
    matchGateBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
    matchViewAll: { backgroundColor: C.surface, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
    matchViewAllText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  });
}
