import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAthleteData } from '../../hooks/useAthleteData';
import { useMatchCount } from '../../hooks/useMatchCount';
import { useGameplanPhases } from '../../hooks/useGameplanPhases';
import { getRecruitingLevelBand } from '../../lib/recruitingLevels';
import { getTierFromAthlete, getTierColor } from '../../lib/tierColors';
import { supabase } from '../../lib/supabase';
import { hasSeenTour, markTourSeen, consumeTourRequest } from '../../lib/onboardingTour';
import { getTopFitPrograms, TopFitProgram } from '../../lib/topFitPrograms';
import { getDashboardStats, DashboardStats } from '../../lib/dashboardStats';
import { Phase } from '../../constants/Phases';
import { TIER_GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { UpgradeSheet } from '../../components/UpgradeSheet';
import OnboardingTour, { TourMeasurement } from '../../components/OnboardingTour';
import ScoreAnimator from '../../components/ScoreAnimator';
import StatCard, { ACTIVITY_TIERS, MESSAGE_TIERS, activityTierIndex, unreadTierIndex } from '../../components/StatCard';
import Copyright from '../../components/Copyright';

const TOUR_STEPS = [
  {
    target: 'phase-status',
    title: 'Your Recruiting Status',
    description: 'Your tier and recruiting level at a glance, along with where you stand in the gameplan below.',
  },
  {
    target: 'gameplan',
    title: 'Your Gameplan',
    description: 'Three steps to get in front of coaches. Complete each phase in order to unlock your full profile and start matching.',
  },
  {
    target: 'v1-score',
    title: 'Your V1 Score',
    description: 'Your recruiting grade across athletics, academics, production, and intangibles — scored the way coaches actually evaluate you.',
  },
  {
    target: 'programs',
    title: 'Top Fit Programs',
    description: 'The programs that best match your level, ranked by fit. View all to swipe on more and start getting matched with coaches.',
  },
];

export default function DashboardScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { athlete, assessment, isPremium, loading } = useAthleteData();
  const matchCount = useMatchCount(athlete?.id);
  const gp = useGameplanPhases(athlete, assessment, matchCount);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [topFitPrograms, setTopFitPrograms] = useState<TopFitProgram[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ profileViews: 0, programsReviewed: 0, programsLiked: 0 });
  const [sheet, setSheet] = useState<{ visible: boolean; phase: Phase | null; requiredPhase: Phase | null }>({
    visible: false,
    phase: null,
    requiredPhase: null,
  });

  const phaseStatusRef = useRef<View>(null);
  const gameplanRef = useRef<View>(null);
  const scoreRef = useRef<View>(null);
  const programsRef = useRef<View>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourTargets, setTourTargets] = useState<Record<string, TourMeasurement | undefined>>({});

  const measureAndOpenTour = useCallback(() => {
    const refs: [string, React.RefObject<View | null>][] = [
      ['phase-status', phaseStatusRef],
      ['gameplan', gameplanRef],
      ['v1-score', scoreRef],
      ['programs', programsRef],
    ];
    let pending = refs.length;
    const next: Record<string, TourMeasurement | undefined> = {};
    refs.forEach(([key, ref]) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        next[key] = width > 0 ? { x, y, width, height } : undefined;
        pending -= 1;
        if (pending === 0) {
          setTourTargets(next);
          setTourOpen(true);
        }
      });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const forced = await consumeTourRequest();
        const seen = await hasSeenTour();
        if (cancelled || (!forced && seen)) return;
        setTimeout(() => { if (!cancelled) measureAndOpenTour(); }, 400);
      })();
      return () => { cancelled = true; };
    }, [measureAndOpenTour])
  );

  const closeTour = () => {
    setTourOpen(false);
    markTourSeen();
  };

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        if (!athlete?.id) return;
        setLoadingStats(true);
        try {
          const { count } = await supabase
            .from('coach_athlete_messages')
            .select('id', { count: 'exact' })
            .eq('athlete_id', athlete.id)
            .is('read_at', null);
          setUnreadMessages(count ?? 0);

          const fitScore = athlete.v1_score != null ? Number(athlete.v1_score) : null;
          const fitGpa = athlete.gpa != null ? parseFloat(String(athlete.gpa)) : null;
          const fitSat = athlete.sat_score != null ? Number(athlete.sat_score) : null;
          const fitAct = athlete.act_score != null ? Number(athlete.act_score) : null;
          const [programs, dashboardStats] = await Promise.all([
            getTopFitPrograms(supabase, fitScore, fitGpa, fitSat, fitAct, 10),
            getDashboardStats(supabase, athlete.id),
          ]);
          setTopFitPrograms(programs);
          setStats(dashboardStats);
        } catch (e) {
          console.error('Load stats error:', e);
        } finally {
          setLoadingStats(false);
        }
      };
      loadStats();
    }, [athlete?.id])
  );

  const handlePhasePress = (phase: Phase, i: number) => {
    if (gp.phaseLocked[i]) {
      setSheet({ visible: true, phase, requiredPhase: gp.phases[i - 1] ?? null });
    } else {
      router.push(`/(tabs)/gameplan/${phase.number}` as any);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!athlete) {
    return <View style={s.container}><EmptyState icon="person" title="Complete Setup" body="Finish your profile to get started." /></View>;
  }

  const currentScore = Math.round(athlete.v1_score ?? 0);
  const band = getRecruitingLevelBand(currentScore);
  const firstName = athlete.full_name?.split(' ')[0] || 'Athlete';
  const allPhasesDone = gp.completedCount >= gp.phases.length;
  const progressPct = (gp.completedCount / gp.phases.length) * 100;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const schoolClassification = (() => {
    const responses = assessment?.responses;
    return (responses?.school_classification as string | undefined) || null;
  })();

  const tierName = getTierFromAthlete(athlete);
  const tierBg = getTierColor(athlete);

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <View ref={phaseStatusRef} collapsable={false}>
          <View style={s.greetingCard}>
            <Text style={s.label}>ATHLETE PORTAL DASHBOARD</Text>
            <Text style={s.greeting}>{greeting}, {firstName}.</Text>
            <Text style={s.subtitle}>
              {gp.completedCount === 0
                ? "Let's get you recruited. Start with Phase 1 below."
                : allPhasesDone
                ? `You've completed all ${gp.phases.length} phases. Stay active and keep pushing.`
                : `You're on Phase ${gp.activePhaseIdx + 1} of ${gp.phases.length}. Keep the momentum going.`}
            </Text>

            <View style={s.tierRow}>
              <Text style={s.tierRowLabel}>Tier:</Text>
              <View style={[s.tierPill, { backgroundColor: tierBg }]}>
                <Text style={s.tierPillText}>{tierName}</Text>
              </View>
              {band?.level ? (
                <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tierPill}>
                  <Text style={s.tierPillText}>{band.level}</Text>
                </LinearGradient>
              ) : null}
              {schoolClassification ? (
                <Text style={s.tierRowHs}>HS: {schoolClassification}</Text>
              ) : null}
            </View>

            <Pressable style={s.viewProfileBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
              <Text style={s.viewProfileText}>View Profile</Text>
              <Ionicons name="arrow-forward" size={12} color={PROFILE_ARROW_COLOR} />
            </Pressable>
          </View>
        </View>

        <View ref={gameplanRef} collapsable={false}>
          <LinearGradient colors={['#ff0000', '#ffa700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroGameplan}>
            <Text style={s.heroTitle}>Your Gameplan</Text>
            <Text style={s.heroSubtitle}>Where new athletes start. Three steps to connect with coaches who match your level.</Text>

            <View style={s.heroProgressBar}>
              <View style={[s.heroProgressFill, { width: `${Math.max(progressPct, 6)}%` }]} />
            </View>
            <Text style={s.heroProgressText}>{Math.round(progressPct)}% Complete • Phase {gp.activePhaseIdx + 1} of {gp.phases.length}</Text>

            <View style={s.heroPhases}>
              {gp.phases.map((phase, i) => {
                const done = gp.phaseComplete[i];
                const locked = gp.phaseLocked[i];
                const current = !done && !locked && i === gp.activePhaseIdx;
                return (
                  <View key={phase.number} style={s.heroPhaseRow}>
                    <View style={[
                      s.heroPhaseNode,
                      done && s.heroPhaseNodeDone,
                      current && s.heroPhaseNodeCurrent,
                    ]}>
                      {done ? (
                        <Ionicons name="checkmark" size={16} color="#ff0000" />
                      ) : locked ? (
                        <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.85)" />
                      ) : (
                        <Text style={s.heroPhaseNumber}>{phase.number}</Text>
                      )}
                    </View>
                    <View style={s.heroPhaseContent}>
                      <Text style={s.heroPhaseTitle}>{phase.title}</Text>
                      <Text style={s.heroPhaseDesc}>{phase.description}</Text>
                      <Text style={s.heroPhaseStatus}>
                        {done ? 'Completed' : current ? 'In Progress' : locked ? `Complete Phase ${phase.number - 1} first` : 'Up Next'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {!allPhasesDone ? (
              <Pressable
                style={s.heroCta}
                onPress={() => handlePhasePress(gp.phases[gp.activePhaseIdx], gp.activePhaseIdx)}
              >
                <Text style={s.heroCtaText}>Continue: Next Step →</Text>
              </Pressable>
            ) : (
              <View style={s.heroComplete}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.heroCompleteText}>Gameplan Complete</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        <Text style={s.sectionLabel}>After you complete the Gameplan:</Text>
        <View style={s.statsGrid}>
          <View ref={scoreRef} collapsable={false}>
            <ScoreAnimator finalScore={currentScore} duration={2000} recruitingLevel={band?.level} />
          </View>
          <StatCard
            label="Mutual Matches"
            value={matchCount}
            sub="Coaches who matched back with you. Real interest, real opportunity."
            tiers={ACTIVITY_TIERS}
            activeIndex={activityTierIndex(matchCount, [1, 3, 6, 10])}
          />
          <Pressable onPress={() => router.push('/(tabs)/messages' as any)}>
            <StatCard
              label="Unread Messages"
              value={loadingStats ? 0 : unreadMessages}
              sub="From coaches & programs that matched with you"
              tiers={MESSAGE_TIERS}
              activeIndex={unreadTierIndex(loadingStats ? 0 : unreadMessages)}
            />
          </Pressable>
        </View>

        <View style={s.statsGrid}>
          <StatCard
            label="Profile Views"
            value={stats.profileViews}
            sub="Coaches and programs who've viewed your profile"
            tiers={ACTIVITY_TIERS}
            activeIndex={activityTierIndex(stats.profileViews, [10, 25, 50, 100])}
          />
          <StatCard
            label="Programs Reviewed"
            value={stats.programsReviewed}
            sub="Programs you've swiped through so far"
            tiers={ACTIVITY_TIERS}
            activeIndex={activityTierIndex(stats.programsReviewed, [5, 15, 30, 50])}
          />
          <StatCard
            label="Programs Liked"
            value={stats.programsLiked}
            sub="Programs you've shown interest in"
            tiers={ACTIVITY_TIERS}
            activeIndex={activityTierIndex(stats.programsLiked, [2, 5, 10, 20])}
          />
        </View>

        {!isPremium && (
          <LinearGradient colors={['#C13584', '#E1306C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.upgradeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={s.upgradeEyebrow}>Free Plan</Text>
              <Text style={s.upgradeTitle}>Unlock Match+</Text>
              <Text style={s.upgradeBody}>Get program matches, coach contacts & your complete gameplan.</Text>
            </View>
            <Pressable style={s.upgradeBtn} onPress={() => router.push('/(tabs)/upgrade' as any)}>
              <Text style={s.upgradeBtnText}>See Plans →</Text>
            </Pressable>
          </LinearGradient>
        )}

        <View ref={programsRef} collapsable={false} style={s.programsSection}>
          <View style={s.programsHeader}>
            <Text style={s.programsHeaderLabel}>Top Fit Programs</Text>
            {topFitPrograms.length > 0 && (
              <Pressable onPress={() => router.push('/(tabs)/match' as any)} style={s.programsViewAll}>
                <Text style={s.programsViewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={12} color="#fff" />
              </Pressable>
            )}
          </View>

          {topFitPrograms.length > 0 ? (
            <View style={s.spotHero}>
              <View style={s.spotCard}>
                <View style={s.spotLogoWrap}>
                  <Text style={s.spotLogoInitials}>
                    {topFitPrograms[0].name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.spotBestFitRow}>
                    <Ionicons name="star" size={11} color={C.success} />
                    <Text style={s.spotBestFitText}>BEST FIT</Text>
                  </View>
                  <Text style={s.spotName} numberOfLines={1}>{topFitPrograms[0].name}</Text>
                  <Text style={s.spotMeta} numberOfLines={1}>
                    {[topFitPrograms[0].division, [topFitPrograms[0].city, topFitPrograms[0].state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={s.spotFitBadge}>
                  <Text style={s.spotFitPct}>{topFitPrograms[0].fitPct}%</Text>
                  <Text style={s.spotFitLabel}>FIT</Text>
                </View>
              </View>

              <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.spotTier}>
                <View style={s.spotTierHead}>
                  <View style={s.spotTierIcon}>
                    <Ionicons name="trophy" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.spotTierTitle}>{tierName} Tier</Text>
                    <Text style={s.spotTierSub}>{athlete.subscription_status === 'active' ? 'Active subscription' : 'Limited access'}</Text>
                  </View>
                </View>
                <View style={s.spotTierFeatures}>
                  {[
                    { label: 'Full V1 Score Breakdown', active: true },
                    { label: 'Program Matches', active: isPremium },
                    { label: 'Coach Contacts', active: isPremium },
                    { label: 'Full Gameplan (All Phases)', active: isPremium },
                  ].map((item) => (
                    <View key={item.label} style={s.spotTierFeatureRow}>
                      <Ionicons
                        name={item.active ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={item.active ? '#fff' : 'rgba(255,255,255,0.35)'}
                      />
                      <Text style={[s.spotTierFeatureText, { opacity: item.active ? 1 : 0.4 }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {!isPremium && (
                  <Pressable style={s.spotTierBtn} onPress={() => router.push('/(tabs)/upgrade' as any)}>
                    <Text style={s.spotTierBtnText}>See Upgrade Options</Text>
                  </Pressable>
                )}
              </LinearGradient>
            </View>
          ) : (
            <Card>
              <Text style={s.statDesc}>Complete your assessment to see programs that fit your level.</Text>
            </Card>
          )}

          {topFitPrograms.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.spotRestScroll} contentContainerStyle={{ gap: 10, paddingRight: 20 }}>
              {topFitPrograms.slice(1).map(p => {
                const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <View key={p.id} style={s.spotRestItem}>
                    <View style={s.spotRestLogoWrap}>
                      <Text style={s.spotRestLogoInitials}>{initials}</Text>
                    </View>
                    <Text style={s.spotRestName} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.spotRestPct}>{p.fitPct}%</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {matchCount > 0 && (
            <Pressable style={s.timelineLink} onPress={() => router.push('/(tabs)/calendar' as any)}>
              <Text style={s.timelineLinkText}>View Recruiting Timeline</Text>
              <Ionicons name="arrow-forward" size={13} color={C.textDim} />
            </Pressable>
          )}
        </View>

        <Copyright />
      </ScrollView>

      <UpgradeSheet
        visible={sheet.visible}
        onClose={() => setSheet({ visible: false, phase: null, requiredPhase: null })}
        requiredPhaseNumber={sheet.requiredPhase?.number ?? 0}
        requiredPhaseName={sheet.requiredPhase?.title ?? ''}
        phaseNumber={sheet.phase?.number ?? 0}
        phaseName={sheet.phase?.title ?? ''}
      />

      <OnboardingTour isOpen={tourOpen} onClose={closeTour} steps={TOUR_STEPS} targets={tourTargets} />
    </>
  );
}

const PROFILE_ARROW_COLOR = '#ff3d1f';

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 12, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    greetingCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, marginBottom: 16 },
    label: { fontFamily: FontFamily.mono, fontSize: 10, color: 'rgba(0,0,0,0.45)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    greeting: { fontFamily: FontFamily.headline, fontSize: 24, fontWeight: '900', color: '#0a0a0a', marginBottom: 6 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(0,0,0,0.5)', lineHeight: 18 },
    tierRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    tierRowLabel: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: 'rgba(0,0,0,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
    tierPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
    tierPillText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    tierRowHs: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: 'rgba(0,0,0,0.5)' },
    viewProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, alignSelf: 'flex-start' },
    viewProfileText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: PROFILE_ARROW_COLOR },

    heroGameplan: { borderRadius: 28, padding: 24, marginBottom: 20 },
    heroTitle: { fontFamily: FontFamily.headline, fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.3, marginBottom: 6 },
    heroSubtitle: { fontFamily: FontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 19, marginBottom: 20 },
    heroProgressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginBottom: 8 },
    heroProgressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
    heroProgressText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3, marginBottom: 18 },
    heroPhases: { gap: 14, marginBottom: 18 },
    heroPhaseRow: { flexDirection: 'row', gap: 12 },
    heroPhaseNode: {
      width: 32, height: 32, borderRadius: 16, flexShrink: 0,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.18)',
    },
    heroPhaseNodeDone: { backgroundColor: '#fff' },
    heroPhaseNodeCurrent: { backgroundColor: 'rgba(255,255,255,0.35)' },
    heroPhaseNumber: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },
    heroPhaseContent: { flex: 1 },
    heroPhaseTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff', marginBottom: 2 },
    heroPhaseDesc: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 15, marginBottom: 3 },
    heroPhaseStatus: { fontFamily: FontFamily.mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },
    heroCta: { backgroundColor: '#000', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
    heroCtaText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
    heroComplete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000', borderRadius: 100, paddingVertical: 14, alignSelf: 'flex-start', paddingHorizontal: 22 },
    heroCompleteText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },

    sectionLabel: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textMuted, marginBottom: 14 },
    statsGrid: { gap: 16, marginBottom: 16 },
    statDesc: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 18 },

    upgradeBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 18, marginBottom: 20 },
    upgradeEyebrow: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    upgradeTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff', marginBottom: 2 },
    upgradeBody: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
    upgradeBtn: { backgroundColor: '#a3ff47', borderRadius: 100, paddingVertical: 10, paddingHorizontal: 16 },
    upgradeBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#000' },

    programsSection: { marginBottom: 8 },
    programsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    programsHeaderLabel: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: C.textMuted },
    programsViewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    programsViewAllText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },

    spotHero: { gap: 12, marginBottom: 12 },
    spotCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 20, padding: 20 },
    spotLogoWrap: { width: 64, height: 64, borderRadius: 14, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    spotLogoInitials: { fontFamily: FontFamily.bodyExtraBold, fontSize: 18, color: C.textMuted },
    spotBestFitRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
    spotBestFitText: { fontFamily: FontFamily.mono, fontSize: 9, color: C.success, letterSpacing: 0.8 },
    spotName: { fontFamily: FontFamily.headline, fontSize: 19, color: C.text, letterSpacing: -0.2 },
    spotMeta: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textMuted, marginTop: 4 },
    spotFitBadge: { alignItems: 'center', flexShrink: 0 },
    spotFitPct: { fontFamily: FontFamily.mono, fontSize: 26, color: C.text },
    spotFitLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5, marginTop: 2 },

    spotTier: { borderRadius: 20, padding: 20, gap: 16 },
    spotTierHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    spotTierIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
    spotTierTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 },
    spotTierSub: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    spotTierFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    spotTierFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: '45%' },
    spotTierFeatureText: { fontFamily: FontFamily.body, fontSize: 12, color: '#fff' },
    spotTierBtn: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    spotTierBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },

    spotRestScroll: { marginHorizontal: -20, paddingLeft: 20, marginTop: 12 },
    spotRestItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 100, paddingVertical: 8, paddingHorizontal: 12 },
    spotRestLogoWrap: { width: 22, height: 22, borderRadius: 6, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    spotRestLogoInitials: { fontFamily: FontFamily.bodyExtraBold, fontSize: 8, color: C.textMuted },
    spotRestName: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted, maxWidth: 120 },
    spotRestPct: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim },

    timelineLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
    timelineLinkText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textDim },
  });
}
