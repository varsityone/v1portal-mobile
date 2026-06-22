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
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

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
      if (progress >= 1) clearInterval(timer);
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
  const numColor = score ? getScoreColor(displayScore) : C.textDim;

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
            { backgroundColor: tierColor + '28', borderColor: tierColor + '55' },
          ]}>
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierDisplay}</Text>
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
                  <View style={[styles.tierBar, { backgroundColor: active ? tier.color : C.surfaceAlt }]} />
                  <Text style={[
                    styles.tierBarLabel,
                    {
                      color: (active && i === activeTierIdx) ? tier.color : C.textDim,
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
            <Pressable
              style={styles.assessmentBtn}
              onPress={() => router.push('/(tabs)/gameplan' as any)}
            >
              <Text style={styles.assessmentBtnText}>Start Your Assessment →</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── Overall Progress ── */}
      <View style={styles.progressCard}>
        <View style={styles.progressTop}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressCount}>{completedCount}/6 phases complete</Text>
        </View>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressPct}%` }]}
          />
        </View>
        <View style={styles.phaseDots}>
          {PHASES.map((p, i) => {
            const isDone = phaseEffectiveDone[i];
            const isActive = i === activePhaseIdx && !isDone;
            return (
              <View
                key={i}
                style={[
                  styles.phaseDot,
                  isDone && styles.phaseDotDone,
                  isActive && styles.phaseDotActive,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={10} color={C.background} />
                ) : (
                  <Text style={[styles.phaseDotNum, isActive && styles.phaseDotNumActive]}>
                    {p.number}
                  </Text>
                )}
              </View>
            );
          })}
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

      {/* ── Phase cards ── */}
      <View style={styles.phaseList}>
        {PHASES.map((phase, i) => {
          const locked = phaseLocked[i];
          const done = phaseEffectiveDone[i];
          const active = i === activePhaseIdx && !locked;
          const isExpanded = expandedPhase === i;
          const canExpand = !locked;

          const badgeLabel = done ? 'Completed' : active ? 'In Progress' : locked ? (i <= 3 ? 'Pro' : 'Elite') : 'Up Next';
          const badgeBg = done ? C.surfaceAlt : active ? 'rgba(131,58,180,0.12)' : locked ? 'rgba(245,158,11,0.10)' : C.surfaceAlt;
          const badgeColor = done ? C.textMuted : active ? C.primary : locked ? '#F59E0B' : C.textDim;

          let hint = '';
          if (done) {
            hint = 'Complete';
          } else if (active) {
            if (i === 0) hint = 'Takes ~12 minutes';
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
              hint = left > 0 ? `${left} of 17 fields left` : 'Ready to complete';
            } else if (i === 2) hint = athlete?.target_list_saved_at ? 'Target list locked in' : 'Review and lock in your list';
            else if (i === 3) hint = 'Email templates ready';
            else if (i === 4) hint = trackerCount > 0 ? `${trackerCount} coach${trackerCount !== 1 ? 'es' : ''} tracked` : 'Track your first coach';
            else hint = 'Final phase';
          } else if (locked && i > 1) {
            hint = i <= 3 ? 'Pro required' : 'Elite required';
          } else if (!locked && !done) {
            hint = `Complete Phase ${i} first`;
          }

          return (
            <View
              key={i}
              style={[
                styles.phaseCard,
                done && styles.phaseCardDone,
                active && styles.phaseCardActive,
                locked && styles.phaseCardLocked,
                locked && { filter: [{ blur: 1.5 }, { grayscale: 0.85 }] } as any,
              ]}
            >
              <Pressable
                style={styles.phaseInner}
                onPress={() => canExpand && setExpandedPhase(isExpanded ? null : i)}
                disabled={!canExpand}
              >
                {/* Icon */}
                <View style={[
                  styles.phaseIcon,
                  done ? styles.phaseIconDone : active ? styles.phaseIconActive : styles.phaseIconMuted,
                ]}>
                  {done ? (
                    <Ionicons name="checkmark" size={16} color={C.background} />
                  ) : locked ? (
                    <Ionicons name="lock-closed" size={14} color={C.textDim} />
                  ) : (
                    <Text style={[styles.phaseIconNum, active && { color: C.primary }]}>
                      {phase.number}
                    </Text>
                  )}
                </View>

                {/* Content */}
                <View style={styles.phaseContent}>
                  <Text style={[
                    styles.phaseEyebrow,
                    done && { color: C.textMuted },
                    (locked || (!active && !done)) && { color: C.textDim },
                  ]}>
                    Phase {phase.number}
                  </Text>
                  <Text style={[
                    styles.phaseTitle,
                    locked && { color: C.textMuted },
                  ]}>
                    {phase.title}
                  </Text>
                  <Text style={[styles.phaseDesc, locked && { color: C.textDim }]}>
                    {phase.description}
                  </Text>
                  {hint ? (
                    <View style={[
                      styles.hintChip,
                      active && { backgroundColor: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.82)', borderWidth: 0 },
                    ]}>
                      <Text style={[styles.hintChipText, active && { color: 'rgb(134, 134, 134)' }]}>{hint}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Right: badge + chevron */}
                <View style={styles.phaseRight}>
                  <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.statusBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                  </View>
                  {canExpand && (
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={14}
                      color={active ? C.primary : C.textDim}
                    />
                  )}
                </View>
              </Pressable>

              {/* Expanded checklist */}
              {isExpanded && canExpand && (
                <View style={styles.phaseBody}>
                  {(active || done) ? (
                    <>
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
                            <Ionicons name="arrow-forward" size={12} color={C.textDim} />
                          </Pressable>
                        );
                      })}
                    </>
                  ) : (
                    <View style={styles.upcomingMsg}>
                      <Text style={styles.upcomingMsgText}>
                        Complete Phase {phase.number - 1} to unlock this phase
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Locked footer */}
              {locked && (
                <View style={styles.lockedRow}>
                  <Text style={styles.lockedText}>
                    {i > 1
                      ? `Upgrade to ${i <= 3 ? 'Pro' : 'Elite'} to access Phase ${phase.number}`
                      : `Complete Phase ${phase.number - 1} to unlock`}
                  </Text>
                  {i > 1 && !isElite && (
                    <Pressable onPress={() => router.push('/upgrade' as any)}>
                      <Text style={styles.lockedUpgradeLink}>Upgrade →</Text>
                    </Pressable>
                  )}
                </View>
              )}
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
            <Ionicons name={stat.icon} size={16} color={C.textMuted} />
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
            <Ionicons name="lock-closed" size={20} color={C.textDim} />
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
            <Ionicons name="school-outline" size={22} color={C.textDim} />
            <Text style={styles.matchGateText}>Complete your assessment to generate program matches</Text>
            <Pressable
              style={styles.matchGateBtn}
              onPress={() => router.push('/assessment' as any)}
            >
              <Text style={styles.matchGateBtnText}>Take Assessment →</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.matchViewAll}
            onPress={() => router.push('/(tabs)/programs' as any)}
          >
            <Ionicons name="school-outline" size={18} color={C.primary} />
            <Text style={styles.matchViewAllText}>View {matchCount} matched program{matchCount !== 1 ? 's' : ''}</Text>
            <Ionicons name="chevron-forward" size={14} color={C.textDim} />
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
    eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: C.primary, marginBottom: 6 },
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
    assessmentBtn: { marginTop: 20, backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 13 },
    assessmentBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

    // Progress
    progressCard: { backgroundColor: C.surface, borderRadius: 14, padding: 18 },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    progressLabel: { fontSize: 13, fontWeight: '700', color: C.text },
    progressCount: { fontSize: 12, color: C.textMuted },
    progressTrack: { height: 15, backgroundColor: C.surfaceAlt, borderRadius: 15, overflow: 'hidden', marginBottom: 14 },
    progressFill: { height: '100%', borderRadius: 3 },
    phaseDots: { flexDirection: 'row', gap: 8 },
    phaseDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    phaseDotDone: { backgroundColor: C.text, borderColor: C.border },
    phaseDotActive: { backgroundColor: C.primary, borderColor: C.primary },
    phaseDotNum: { fontSize: 11, fontWeight: '700', color: C.textDim },
    phaseDotNumActive: { color: C.white },

    // Upgrade banner
    upgradeBanner: { borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
    upgradeEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
    upgradeTitle: { fontSize: 15, fontWeight: '800', color: C.white, marginBottom: 3 },
    upgradeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 17 },
    upgradeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, backgroundColor: '#a3ff47', flexShrink: 0 },
    upgradeBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },

    // Phase list
    phaseList: { gap: 8 },
    phaseCard: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderLeftWidth: 3, borderColor: C.border, borderLeftColor: 'transparent', overflow: 'hidden' },
    phaseCardActive: { borderLeftColor: 'rgb(255, 183, 0)' },
    phaseCardDone: { opacity: 0.72, borderLeftColor: 'rgba(5,166,19,0.4)' },
    phaseCardLocked: { opacity: 0.28 },
    phaseInner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
    phaseIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    phaseIconActive: { backgroundColor: 'rgba(131,58,180,0.14)', borderWidth: 1, borderColor: 'rgba(131,58,180,0.25)' },
    phaseIconDone: { backgroundColor: C.text },
    phaseIconMuted: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
    phaseIconNum: { fontSize: 15, fontWeight: '800', color: C.textMuted },
    phaseContent: { flex: 1, gap: 3 },
    phaseEyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.primary },
    phaseTitle: { fontSize: 14, fontWeight: '800', color: C.text, lineHeight: 18 },
    phaseDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
    hintChip: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
    hintChipText: { fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.3 },
    phaseRight: { alignItems: 'flex-end', gap: 8, paddingTop: 2, flexShrink: 0 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    statusBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },

    // Expanded body
    phaseBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2, borderTopWidth: 1, borderTopColor: C.border },
    checkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
    checkBox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: C.border2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    checkBoxDone: { backgroundColor: C.success, borderColor: C.success },
    checkLabel: { flex: 1, fontSize: 13, color: C.text, fontWeight: '500', lineHeight: 18 },
    upcomingMsg: { marginTop: 10, padding: 12, backgroundColor: C.surfaceAlt, borderRadius: 8, alignItems: 'center' },
    upcomingMsgText: { fontSize: 12, color: C.textDim, textAlign: 'center' },

    // Locked footer
    lockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surfaceAlt, borderTopWidth: 1, borderTopColor: C.border },
    lockedText: { flex: 1, fontSize: 12, color: C.textDim },
    lockedUpgradeLink: { fontSize: 12, fontWeight: '700', color: C.primary },

    // Stats row
    statsRow: { flexDirection: 'row', gap: 10 },
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
