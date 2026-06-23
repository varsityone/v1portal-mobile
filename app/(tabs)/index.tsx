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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAthleteData } from '../../hooks/useAthleteData';
import { supabase } from '../../lib/supabase';
import { Colors, GRADIENT, ThemeColors } from '../../constants/Colors';
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
  const { athlete, assessment, isPremium, loading, refresh } = useAthleteData();
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
      { data: matchData },
      { data: outData },
      { count: pv },
      { count: tCount },
    ] = await Promise.all([
      supabase.from('matches').select('id').eq('athlete_id', athlete.id).limit(5),
      supabase.from('coach_outreach').select('status').eq('athlete_id', athlete.id),
      supabase.from('profile_views').select('*', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
      supabase.from('coach_tracker').select('id', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
    ]);
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
  const isElite = athlete?.subscription_status === 'active' && athlete?.subscription_tier === 'elite';
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

  const tierDisplay = (() => {
    if (athlete?.subscription_status === 'active') return athlete?.subscription_tier === 'elite' ? 'Elite' : 'Pro';
    if (athlete?.subscription_status === 'trial') return 'Pro Trial';
    return 'Free';
  })();
  const tierColor = (() => {
    if (athlete?.subscription_status === 'active') return athlete?.subscription_tier === 'elite' ? '#10b981' : C.primary;
    if (athlete?.subscription_status === 'trial') return '#F59E0B';
    return C.textMuted;
  })();

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

  const phaseLocked: boolean[] = [];
  for (let i = 0; i < PHASES.length; i++) {
    let locked = false;
    if (i === 0) locked = false;
    else if (i >= 1 && i <= 3) locked = !isPremium;
    else locked = !isElite;
    if (!locked && i > 0) {
      const prevEffectiveDone = !phaseLocked[i - 1] && phaseComplete[i - 1];
      if (!prevEffectiveDone) locked = true;
    }
    phaseLocked.push(locked);
  }

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
          <View style={[
            styles.tierBadge,
            isElite
              ? { backgroundColor: 'rgb(199, 0, 156)', borderWidth: 0 }
              : { backgroundColor: tierColor + '28', borderColor: tierColor + '55' },
          ]}>
            <Text style={[styles.tierBadgeText, { color: isElite ? '#ffffff' : tierColor }]}>{tierDisplay}</Text>
          </View>
          {score !== null && (
            <View style={styles.recruitingLevelBadge}>
              <Text style={styles.recruitingLevelBadgeText}>{getRecruitingLevelFromScore(score)}</Text>
            </View>
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

      {/* ── Upgrade banner (free/trial users) ── */}
      {!isPremium && (
        <LinearGradient
          colors={['#833AB4', '#C13584', '#E1306C']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.upgradeBanner}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeEyebrow}>LIMITED ACCESS</Text>
            <Text style={styles.upgradeTitle}>Unlock Pro or Elite</Text>
            <Text style={styles.upgradeDesc}>
              Get program matches, coach contacts, outreach tools & more gameplan phases.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/upgrade' as any)}
          >
            <Text style={styles.upgradeBtnText}>Upgrade →</Text>
          </Pressable>
        </LinearGradient>
      )}

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
          } else if (locked && i > 1) {
            sub = i <= 3 ? 'Pro required' : 'Elite required';
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
                      phaseEffectiveDone[i - 1] ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
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
                  <View style={[styles.phaseNode, { backgroundColor: isDark ? '#1a1a1f' : '#d1d1d6' }]}>
                    <Ionicons name="lock-closed" size={14} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)'} />
                  </View>
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
                  {!locked && <Ionicons name="chevron-forward" size={15} color={C.icon} />}
                </View>

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
      <View style={styles.profileCard}>
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
                  <LinearGradient
                    colors={['#833AB4', '#C13584', '#E1306C', '#FCAF45']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${bar.val}%` }]}
                  />
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
      </View>

      {/* ── Tier / features card ── */}
      <LinearGradient
        colors={['#833AB4', '#C13584', '#E1306C', '#F56040', '#FCAF45']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tierFeaturesCard}
      >
        {/* Header */}
        <View style={styles.tierFeaturesHeader}>
          <View style={styles.tierIconCircle}>
            <Ionicons name="trophy" size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tierFeaturesTitle}>
              {tierDisplay} Tier
            </Text>
            <Text style={styles.tierFeaturesSub}>
              {athlete?.subscription_status === 'active'
                ? (athlete?.subscription_tier === 'elite' ? 'One-time access' : 'Monthly plan')
                : 'Limited access'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.tierDivider} />

        {/* Feature list */}
        <View style={styles.featureList}>
          {[
            { label: 'Full V1 Score Breakdown', unlocked: !!assessment },
            { label: 'Program Matches',          unlocked: isPremium },
            { label: 'Coach Contacts',           unlocked: isPremium },
            { label: 'Gameplan Phases 1–4',      unlocked: isPremium },
            { label: 'Phase 5 (Timeline)',        unlocked: isElite  },
            { label: 'Outreach Templates',        unlocked: isElite  },
          ].map((feat, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons
                name={feat.unlocked ? 'checkmark-circle' : 'ellipse-outline'}
                size={15}
                color={feat.unlocked ? '#fff' : 'rgba(255,255,255,0.3)'}
              />
              <Text style={[styles.featureLabel, !feat.unlocked && { opacity: 0.35 }]}>
                {feat.label}
              </Text>
            </View>
          ))}
        </View>

        {!isPremium && (
          <Pressable
            style={({ pressed }) => [styles.seeUpgradeBtn, pressed && { opacity: 0.85 }]}
            onPress={() => router.push('/upgrade' as any)}
          >
            <Text style={styles.seeUpgradeBtnText}>See Upgrade Options</Text>
          </Pressable>
        )}
      </LinearGradient>

      {/* ── Program matches preview ── */}
      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Program Matches</Text>
          {matchCount > 0 && isPremium && (
            <Pressable onPress={() => router.push('/(tabs)/programs' as any)}>
              <Text style={styles.sectionLink}>See all →</Text>
            </Pressable>
          )}
        </View>
        {!isPremium ? (
          <View style={styles.matchGate}>
            <Ionicons name="lock-closed" size={20} color={C.icon} />
            <Text style={styles.matchGateText}>Upgrade to Pro to see your matched programs</Text>
            <Pressable
              style={styles.matchGateBtn}
              onPress={() => router.push('/upgrade' as any)}
            >
              <Text style={styles.matchGateBtnText}>Unlock Programs →</Text>
            </Pressable>
          </View>
        ) : matchCount === 0 ? (
          <View style={styles.matchGate}>
            <Ionicons name="school-outline" size={22} color={C.icon} />
            <Text style={styles.matchGateText}>Complete your assessment to generate program matches</Text>
            <Pressable onPress={() => router.push('/assessment' as any)}>
              <LinearGradient
                colors={['#ff0000', '#aa00ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.matchGateBtn}
              >
                <Text style={styles.matchGateBtnText}>Take Assessment →</Text>
              </LinearGradient>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.matchViewAll}
            onPress={() => router.push('/(tabs)/programs' as any)}
          >
            <Ionicons name="school-outline" size={18} color={C.primary} />
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
    tierBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    tierBadgeText: { fontSize: 12, fontWeight: '700' },
    recruitingLevelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, backgroundColor: C.primary + '1A', borderWidth: 1, borderColor: C.primary + '33' },
    recruitingLevelBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
    classificationBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
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
    progressBarPill: { position: 'absolute', right: 8, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: C.surfaceAlt, borderRadius: 100 },
    progressBarPillText: { fontSize: 12, fontWeight: '600', color: C.text },
    progressCount: { fontSize: 12, color: C.textMuted },

    // Upgrade banner
    upgradeBanner: { borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
    upgradeEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
    upgradeTitle: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 3 },
    upgradeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 17 },
    upgradeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: '#a3ff47', flexShrink: 0 },
    upgradeBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },

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

    // Expanded body
    phaseBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
    checkBox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: C.border2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    checkBoxDone: { backgroundColor: C.text, borderColor: C.text },
    checkLabel: { flex: 1, fontSize: 13, color: C.text, fontWeight: '500', lineHeight: 18 },
    upcomingMsg: { marginTop: 10, padding: 12, backgroundColor: C.surfaceAlt, borderRadius: 8, alignItems: 'center' },
    upcomingMsgText: { fontSize: 12, color: C.textDim, textAlign: 'center' },
    lockedUpgradeLink: { fontSize: 12, fontWeight: '700', color: C.primary, textAlign: 'center', paddingVertical: 4 },

    // Stats row
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -1, lineHeight: 28 },
    statLabel: { fontSize: 10, color: C.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 14 },

    // Profile card
    profileCard: { backgroundColor: C.surface, borderRadius: 18, padding: 22, alignItems: 'center', gap: 6 },
    avatarRing: { borderRadius: 44, padding: 2.5, marginBottom: 8 },
    avatarInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
    avatarPhoto: { width: 72, height: 72, borderRadius: 36 },
    avatarInitials: { fontSize: 24, fontWeight: '800', color: C.text },
    profileName: { fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 4 },
    profileLevel: { fontSize: 11, color: C.textDim, textAlign: 'center', marginBottom: 14, lineHeight: 16 },
    scoreBars: { width: '100%', gap: 7, marginBottom: 14, padding: 12, backgroundColor: C.surfaceAlt, borderRadius: 10 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    barLabel: { fontSize: 10, fontWeight: '500', color: C.textDim, width: 68 },
    barTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 2 },
    barValue: { fontSize: 10, fontWeight: '800', color: C.textMuted, width: 22, textAlign: 'right' },
    profileActions: { flexDirection: 'row', gap: 6, width: '100%' },
    profileBtn: { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    profileBtnText: { fontSize: 11, fontWeight: '700', color: C.textMuted },

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
    matchGateBtn: { backgroundColor: C.primary, borderRadius: 100, paddingHorizontal: 22, paddingVertical: 11, marginTop: 4 },
    matchGateBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
    matchViewAll: { backgroundColor: C.surface, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
    matchViewAllText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  });
}
