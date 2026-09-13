import { getTourScrollOffset } from '../../lib/tourPopover';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAthleteData } from '../../hooks/useAthleteData';
import { useMatchCount } from '../../hooks/useMatchCount';
import { useGameplanPhases } from '../../hooks/useGameplanPhases';
import { getRecruitingLevelBand } from '../../lib/recruitingLevels';
import { getTierFromAthlete, getTierColor } from '../../lib/tierColors';
import { supabase } from '../../lib/supabase';
import { hasSeenTour, markTourSeen, consumeTourRequest, subscribeTourRequest } from '../../lib/onboardingTour';
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
import LoadingScreen from '../../components/LoadingScreen';
import ScoreAnimator from '../../components/ScoreAnimator';
import StatCard, { ACTIVITY_TIERS, MESSAGE_TIERS, activityTierIndex, unreadTierIndex } from '../../components/StatCard';
import Copyright from '../../components/Copyright';

const TOUR_STEPS = [
  { target: 'phase-status', title: 'Your Recruiting Status', description: 'Your plan and recruiting level appear here, so you can quickly see where you stand.' },
  { target: 'profile', title: 'Your Athlete Profile', description: 'Open your profile to review what coaches see. Use Edit Profile to update your details and profile photo.' },
  { target: 'phase-1', title: 'Phase 1: Know Your Value', description: 'Start with your assessment and understand your results. Each phase shows whether it is completed, in progress, or locked.' },
  { target: 'phase-2', title: 'Phase 2: Build Your Profile', description: 'Add your football, academic, and contact details. You can upload an optional profile photo here too.' },
  { target: 'phase-3', title: 'Phase 3: Find Your Matches', description: 'Complete the earlier phases to move into matching and outreach. Your next available step or completed status appears below.' },
  { target: 'v1-score', title: 'Your V1 Score', description: 'Your assessment results determine your V1 Score and recruiting level. Open My V1 Score from the menu for the breakdown.' },
  { target: 'matches', title: 'Mutual Matches', description: 'This counts coaches who matched back with you. Open Program Matches in the menu to see those connections.' },
  { target: 'messages', title: 'Coach Messages', description: 'See how many unread messages you have. Tap this card to open your inbox.' },
  { target: 'views', title: 'Profile Views', description: 'Track interest in your profile here. The cards below also show how many programs you have reviewed and liked.' },
  { target: 'programs', title: 'Top Fit Programs', description: 'After your assessment, this section shows programs that fit your level. Use View All when available to explore more.' },
  { target: 'subscription', title: 'Your Subscription', description: 'See your current tier, subscription status, and included features here. If upgrade options are available, use the button on this card to compare plans.' },
  { target: 'college-scroll', title: 'More Colleges That Fit', description: 'This scrolling row previews more colleges that fit your level. Use View All above to explore the programs. Replay this tour anytime from the menu.' },
];

// Matches web's .gp-spot-rest-wrap/.gp-spot-rest-track: an infinite,
// linear-speed auto-scrolling marquee (not a manually-dragged ScrollView).
// The item list is rendered twice back-to-back and translated by exactly
// one copy's measured width, on a loop, for a seamless wrap — same trick
// as web's translateX(0) -> translateX(-50%) over a duplicated track.
const MARQUEE_SPEED = 18; // px/sec, matches web's ~32s loop for typical item widths

function SpotRestMarquee({ programs, C, s }: { programs: TopFitProgram[]; C: ThemeColors; s: ReturnType<typeof createStyles> }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [setWidth, setSetWidth] = useState(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    if (!setWidth) return;
    translateX.setValue(0);
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -setWidth,
        duration: (setWidth / MARQUEE_SPEED) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
    return () => animRef.current?.stop();
  }, [setWidth]);

  const renderItem = (p: TopFitProgram, key: string) => {
    const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return (
      <View key={key} style={s.spotRestItem}>
        {p.logoUrl ? (
          <Image source={{ uri: p.logoUrl }} style={s.spotRestLogoImg} resizeMode="contain" />
        ) : (
          <View style={s.spotRestLogoWrap}>
            <Text style={s.spotRestLogoInitials}>{initials}</Text>
          </View>
        )}
        <Text style={s.spotRestName} numberOfLines={1}>{p.name}</Text>
        <Text style={s.spotRestPct}>{p.fitPct}%</Text>
      </View>
    );
  };

  return (
    <View style={s.spotRestWrap}>
      <Animated.View style={[s.spotRestTrack, { transform: [{ translateX }] }]}>
        <View style={s.spotRestGroup} onLayout={e => setSetWidth(e.nativeEvent.layout.width)}>
          {programs.map(p => renderItem(p, `a-${p.id}`))}
        </View>
        <View style={s.spotRestGroup} aria-hidden>
          {programs.map(p => renderItem(p, `b-${p.id}`))}
        </View>
      </Animated.View>
      <LinearGradient
        colors={[C.surface, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.spotRestFade, { left: 0 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', C.surface]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[s.spotRestFade, { right: 0 }]}
        pointerEvents="none"
      />
    </View>
  );
}

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

  const scrollRef = useRef<ScrollView>(null);
  const viewportRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const phaseStatusRef = useRef<View>(null);
  const profileRef = useRef<View>(null);
  const phase1Ref = useRef<View>(null);
  const phase2Ref = useRef<View>(null);
  const phase3Ref = useRef<View>(null);
  const matchesRef = useRef<View>(null);
  const messagesRef = useRef<View>(null);
  const viewsRef = useRef<View>(null);
  const scoreRef = useRef<View>(null);
  const programsRef = useRef<View>(null);
  const subscriptionRef = useRef<View>(null);
  const collegeScrollRef = useRef<View>(null);
  const visibleTourSteps = useMemo(() => TOUR_STEPS.filter(step =>
    (step.target !== 'subscription' || topFitPrograms.length > 0) &&
    (step.target !== 'college-scroll' || topFitPrograms.length > 1)
  ), [topFitPrograms.length]);
  const tourRefs = useRef<Record<string, React.RefObject<View | null>>>({
    'phase-status': phaseStatusRef,
    'profile': profileRef,
    'phase-1': phase1Ref,
    'phase-2': phase2Ref,
    'phase-3': phase3Ref,
    'matches': matchesRef,
    'messages': messagesRef,
    'views': viewsRef,
    'v1-score': scoreRef,
    'programs': programsRef,
    'subscription': subscriptionRef,
    'college-scroll': collegeScrollRef,
  }).current;

  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0);
  const tourMeasureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tourMeasureVersion = useRef(0);
  const [tourTargets, setTourTargets] = useState<Record<string, TourMeasurement | null | undefined>>({});
  const [gameplanExpanded, setGameplanExpanded] = useState(true);

  // Align each target inside the actual visible dashboard, below its header.
  const handleTourStepChange = useCallback((target: string) => {
    const version = ++tourMeasureVersion.current;
    clearTimeout(tourMeasureTimer.current);
    setTourTargets(prev => ({ ...prev, [target]: undefined }));
    const ref = tourRefs[target]?.current;
    if (!ref) {
      setTourTargets(prev => ({ ...prev, [target]: null }));
      return;
    }
    viewportRef.current?.measureInWindow((_scrollX, scrollY) => {
      ref.measureInWindow((_x, y) => {
        if (version !== tourMeasureVersion.current) return;
        const nextOffset = getTourScrollOffset(target, scrollOffsetRef.current, y, scrollY);
        scrollRef.current?.scrollTo({ y: nextOffset, animated: target !== 'phase-status' });
        if (target === 'phase-status') scrollOffsetRef.current = 0;
        tourMeasureTimer.current = setTimeout(() => {
          ref.measureInWindow((x, y, width, height) => {
            if (version !== tourMeasureVersion.current) return;
            setTourTargets(prev => ({ ...prev, [target]: width > 0 && height > 0 ? { x, y, width, height } : null }));
          });
        }, 500);
      });
    });
  }, [tourRefs]);

  const [tourArmed, setTourArmed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const checkTour = async () => {
        try {
          const forced = await consumeTourRequest();
          const seen = await hasSeenTour();
          if (!cancelled && (forced || !seen)) setTourArmed(true);
        } catch (error) {
          console.warn('Unable to load tour preferences:', error);
        }
      };
      void checkTour();
      const unsubscribe = subscribeTourRequest(() => { void checkTour(); });
      return () => {
        cancelled = true;
        unsubscribe();
        tourMeasureVersion.current++;
        clearTimeout(tourMeasureTimer.current);
        setTourArmed(false);
        setTourOpen(false);
      };
    }, [])
  );

  // Don't open the tour until the async data that can change the page's
  // layout (unread count, top-fit programs, gameplan phases) has actually
  // settled — opening on a blind timeout races a slow first load.
  useEffect(() => {
    if (!tourArmed || loading || loadingStats) return;
    const t = setTimeout(() => {
      setTourTargets({});
      setTourRun(run => run + 1);
      setTourOpen(true);
      setTourArmed(false);
    }, 250);
    return () => clearTimeout(t);
  }, [tourArmed, loading, loadingStats]);

  const closeTour = useCallback(() => {
    tourMeasureVersion.current++;
    clearTimeout(tourMeasureTimer.current);
    setTourOpen(false);
    void markTourSeen().catch(error => console.warn('Unable to save tour preference:', error));
  }, []);

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

  if (loading) return <LoadingScreen />;

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
      <View ref={viewportRef} collapsable={false} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={[s.container, tourOpen && { paddingBottom: 340 }]}
        onScroll={e => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        <View>
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

            <View ref={phaseStatusRef} collapsable={false} style={s.tierRow}>
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

            <Pressable ref={profileRef} collapsable={false} style={s.viewProfileBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
              <Text style={s.viewProfileText}>View Profile</Text>
              <Ionicons name="arrow-forward" size={12} color={PROFILE_ARROW_COLOR} />
            </Pressable>
          </View>
        </View>

        <View>
          {allPhasesDone && !gameplanExpanded ? (
            <View style={s.heroGameplanBadge}>
              <View style={s.heroGameplanBadgeCheck}>
                <Ionicons name="checkmark" size={20} color="#000" />
              </View>
              <View style={s.heroGameplanBadgeText}>
                <Text style={s.heroGameplanBadgeTitle}>Gameplan Complete</Text>
                <Text style={s.heroGameplanBadgeSubtitle}>You've completed all phases</Text>
              </View>
              <Pressable
                style={s.heroGameplanBadgeBtn}
                onPress={() => setGameplanExpanded(true)}
              >
                <Text style={s.heroGameplanBadgeBtnText}>Open</Text>
              </Pressable>
            </View>
          ) : (
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
                    <View key={phase.number} ref={tourRefs[`phase-${phase.number}`]} collapsable={false} style={s.heroPhaseRow}>
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
                <View style={s.heroCompleteRow}>
                  <View style={s.heroComplete}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={s.heroCompleteText}>Gameplan Complete</Text>
                  </View>
                  <Pressable
                    style={s.heroCompleteCollapseBtn}
                    onPress={() => setGameplanExpanded(false)}
                  >
                    <Ionicons name="chevron-up" size={20} color="#666" />
                  </Pressable>
                </View>
              )}
            </LinearGradient>
          )}
        </View>

        <Text style={s.sectionLabel}>After you complete the Gameplan:</Text>
        <View style={s.statsGrid}>
          <View ref={scoreRef} collapsable={false}>
            <ScoreAnimator finalScore={currentScore} duration={2000} recruitingLevel={band?.level} />
          </View>
          <View ref={matchesRef} collapsable={false}>
          <StatCard
            label="Mutual Matches"
            value={matchCount}
            sub="Coaches who matched back with you. Real interest, real opportunity."
            tiers={ACTIVITY_TIERS}
            activeIndex={activityTierIndex(matchCount, [1, 3, 6, 10])}
          />
          </View>
          <Pressable ref={messagesRef} collapsable={false} onPress={() => router.push('/(tabs)/messages' as any)}>
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
          <View ref={viewsRef} collapsable={false}>
          <StatCard
            label="Profile Views"
            value={stats.profileViews}
            sub="Coaches and programs who've viewed your profile"
            tiers={ACTIVITY_TIERS}
            activeIndex={activityTierIndex(stats.profileViews, [10, 25, 50, 100])}
          />
          </View>
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

        <View style={s.programsSection}>
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
              <View ref={programsRef} collapsable={false} style={s.spotCard}>
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

              <View ref={subscriptionRef} collapsable={false}>
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
            </View>
          ) : (
            <View ref={programsRef} collapsable={false}>
              <Card>
                <Text style={s.statDesc}>Complete your assessment to see programs that fit your level.</Text>
              </Card>
            </View>
          )}

          {topFitPrograms.length > 1 && (
            <View ref={collegeScrollRef} collapsable={false}>
              <SpotRestMarquee programs={topFitPrograms.slice(1)} C={C} s={s} />
            </View>
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
      </View>

      <UpgradeSheet
        visible={sheet.visible}
        onClose={() => setSheet({ visible: false, phase: null, requiredPhase: null })}
        requiredPhaseNumber={sheet.requiredPhase?.number ?? 0}
        requiredPhaseName={sheet.requiredPhase?.title ?? ''}
        phaseNumber={sheet.phase?.number ?? 0}
        phaseName={sheet.phase?.title ?? ''}
      />

      <OnboardingTour key={tourRun} isOpen={tourOpen} onClose={closeTour} steps={visibleTourSteps} targets={tourTargets} onStepChange={handleTourStepChange} />
    </>
  );
}

const PROFILE_ARROW_COLOR = '#ff3d1f';

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 12, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    greetingCard: { backgroundColor: '#fff', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18, marginBottom: 16 },
    label: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', color: 'rgba(0,0,0,0.45)', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
    greeting: { fontFamily: FontFamily.headline, fontSize: 20, fontWeight: '700', color: '#0a0a0a', marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 16 },
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
    heroCompleteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
    heroCompleteCollapseBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
    heroGameplanBadge: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 16, marginBottom: 20 },
    heroGameplanBadgeCheck: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    heroGameplanBadgeText: { flex: 1 },
    heroGameplanBadgeTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, color: C.text, marginBottom: 2 },
    heroGameplanBadgeSubtitle: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
    heroGameplanBadgeBtn: { backgroundColor: 'rgba(80,26,255,0.08)', borderWidth: 1, borderColor: 'rgba(80,26,255,0.2)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, flexShrink: 0 },
    heroGameplanBadgeBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#501aff' },

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

    spotRestWrap: { position: 'relative', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, overflow: 'hidden', marginTop: 12 },
    spotRestTrack: { flexDirection: 'row', alignItems: 'center', gap: 22, paddingVertical: 16, paddingHorizontal: 20 },
    spotRestGroup: { flexDirection: 'row', alignItems: 'center', gap: 22 },
    spotRestFade: { position: 'absolute', top: 0, bottom: 0, width: 48 },
    spotRestItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    spotRestLogoWrap: { width: 26, height: 26, borderRadius: 6, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    spotRestLogoImg: { width: 26, height: 26 },
    spotRestLogoInitials: { fontFamily: FontFamily.bodyExtraBold, fontSize: 8, color: C.textMuted },
    spotRestName: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },
    spotRestPct: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim },

    timelineLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
    timelineLinkText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textDim },
  });
}
