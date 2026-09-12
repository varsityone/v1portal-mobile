import SwipeCardBackground from '../../../components/SwipeCardBackground';
import { DEFAULT_PROFILE_IMAGE } from '../../../constants/ProfileImage';
import LoadingScreen from '../../../components/LoadingScreen';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { useAuth } from '../../../hooks/useAuth';
import { GRADIENT, SIGNAL_GRADIENT, FLAME_GRADIENT, PINK_RED, BRAND_GREEN, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { RECRUITING_LEVEL_BANDS, getRecruitingLevelBand } from '../../../lib/recruitingLevels';

const API_BASE = 'https://v1portal.com';

// Fallback for the rare row with no cached recruiting_level — uses the same
// canonical bands (lib/recruitingLevels.ts) the level picker filters by, so
// a card's badge always agrees with which picker bucket it falls into.
function fallbackTier(score: number | null): string {
  if (!score) return '';
  return getRecruitingLevelBand(score).level;
}

interface AthleteCard {
  id: string;
  full_name: string | null;
  position: string | null;
  graduation_year: number | null;
  city: string | null;
  state: string | null;
  high_school: string | null;
  v1_score: number | null;
  bio: string | null;
  profile_photo_url: string | null;
  height: string | null;
  weight: string | number | null;
  gpa: string | number | null;
  forty_yard: string | number | null;
  hudl_link: string | null;
  recruiting_level: string | null;
}

export default function CoachMatchScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { coach, loading: coachLoading } = useCoachData();
  const { session } = useAuth();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [allAthletes, setAllAthletes] = useState<AthleteCard[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [expandedToAll, setExpandedToAll] = useState(false);
  const [sessionSwipedIds, setSessionSwipedIds] = useState<Set<string>>(new Set());
  const [existingMatches, setExistingMatches] = useState<Map<string, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [matchNotif, setMatchNotif] = useState<{ id: string; name: string } | null>(null);
  const [swipeErrorNotif, setSwipeErrorNotif] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'like' | 'pass'>('all');

  // Load swipe history when the history drawer opens
  useEffect(() => {
    if (!historyOpen || !coach?.id) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const { data } = await supabase
          .from('swipes')
          .select('id, direction, created_at, athlete_id, athletes(full_name, position, profile_photo_url)')
          .eq('coach_id', coach.id)
          .eq('swiped_by', 'coach')
          .order('created_at', { ascending: false })
          .limit(500);
        if (!cancelled) setSwipeHistory(data ?? []);
      } catch (err) {
        console.error('Failed to load swipe history:', err);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [historyOpen, coach?.id]);

  const filteredHistory = swipeHistory.filter(swipe => historyFilter === 'all' || swipe.direction === historyFilter);

  const toggleDrawer = (open: boolean) => {
    setDrawerOpen(open);
    Animated.timing(drawerAnim, { toValue: open ? 1 : 0, duration: 320, useNativeDriver: true }).start();
  };

  useEffect(() => {
    drawerAnim.setValue(0);
    setDrawerOpen(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!swipeErrorNotif) return;
    const t = setTimeout(() => setSwipeErrorNotif(null), 4000);
    return () => clearTimeout(t);
  }, [swipeErrorNotif]);

  const isSetupComplete = !!coach?.position_coached && coach?.min_score != null;

  useEffect(() => {
    if (coachLoading || !coach?.id || !isSetupComplete || !coach.verified) return;

    async function load() {
      const { data: swiped } = await supabase
        .from('swipes')
        .select('athlete_id')
        .eq('coach_id', coach!.id)
        .eq('swiped_by', 'coach');
      const swipedIds = (swiped ?? []).map(sw => sw.athlete_id);

      // Typed as `any` here: reassigning this query builder with the full
      // `athletes` column set triggers a "type instantiation excessively
      // deep" TS error (the generated athletes row type is large).
      let q: any = supabase
        .from('athletes')
        .select('id, full_name, position, graduation_year, city, state, high_school, v1_score, bio, profile_photo_url, height, weight, gpa, forty_yard, hudl_link, recruiting_level')
        .eq('is_profile_public', true)
        .not('v1_score', 'is', null)
        .order('v1_score', { ascending: false })
        .limit(300);
      if (swipedIds.length > 0) q = q.not('id', 'in', `(${swipedIds.join(',')})`);

      const { data } = await q;
      setAllAthletes((data ?? []) as AthleteCard[]);

      const { data: matches } = await supabase
        .from('mutual_matches')
        .select('id, athlete_id')
        .eq('coach_id', coach!.id)
        .eq('status', 'active');
      setExistingMatches(new Map((matches ?? []).map(m => [m.athlete_id, m.id])));

      setLoading(false);
    }
    load();
  }, [coachLoading, coach?.id, isSetupComplete, coach?.verified]);

  // Every athlete's level bucket, precomputed once so the picker's per-band
  // counts and the deck filter always agree on the same classification.
  const levelOf = (a: AthleteCard) => a.recruiting_level || fallbackTier(a.v1_score);

  const coachDefaultLevel = coach?.min_score != null ? getRecruitingLevelBand(coach.min_score).level : null;

  const showingPicker = isSetupComplete && !!coach?.verified && !loading && !selectedLevel && !matchNotif;

  const deck = useMemo(() => {
    if (!selectedLevel) return [];
    // Non-expanded mode advances purely via currentIndex, same as before --
    // no sessionSwipedIds filtering here, since filtering would shrink the
    // array out from under the index on every swipe. Expanded mode builds
    // a fresh merged deck instead, so it needs sessionSwipedIds to avoid
    // re-showing anything already swiped earlier this session.
    const inScope = expandedToAll
      ? allAthletes.filter(a => !sessionSwipedIds.has(a.id))
      : allAthletes.filter(a => levelOf(a) === selectedLevel);
    const needs = coach?.position_needs ?? [];
    const matched = needs.length ? inScope.filter(a => a.position && needs.includes(a.position)) : [];
    const rest = needs.length ? inScope.filter(a => !(a.position && needs.includes(a.position))) : inScope;
    return [...matched, ...rest];
  }, [allAthletes, selectedLevel, expandedToAll, sessionSwipedIds, coach?.position_needs]);

  // How many unseen athletes exist outside the currently selected level --
  // powers the "See outside my range" button's count on the caught-up card.
  const outsideRangeCount = useMemo(() => {
    if (!selectedLevel) return 0;
    return allAthletes.filter(a => !sessionSwipedIds.has(a.id) && levelOf(a) !== selectedLevel).length;
  }, [allAthletes, selectedLevel, sessionSwipedIds]);

  const current = deck[currentIndex];
  const totalCards = deck.length;
  const isAlreadyMatched = current ? existingMatches.has(current.id) : false;
  const existingMatchId = current ? existingMatches.get(current.id) : undefined;

  const isFullScreenDeck = !coachLoading && !loading && isSetupComplete && !!coach?.verified && !matchNotif && !showingPicker;

  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: !isFullScreenDeck });
    return () => { navigation.getParent()?.setOptions({ headerShown: true }); };
  }, [isFullScreenDeck, navigation]);

  // Swipe is always `allowed: true` at the API level (recruiting-calendar
  // rules only ever restrict message/visit/evaluation) — this call exists
  // so the swipe still lands in compliance_logs for the audit trail, same
  // as web's dashboard/match/page.tsx. Network failure fails open, same
  // resilience posture as the message-compliance check in [matchId].tsx.
  const logSwipeCompliance = async (athleteId: string) => {
    if (!coach) return;
    try {
      await fetch(`${API_BASE}/api/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: coach.id,
          division: coach.division,
          region: coach.region ?? undefined,
          action: 'swipe',
          athlete_id: athleteId,
        }),
      });
    } catch {
      // Logging-only call — never blocks the swipe.
    }
  };

  const recordSwipe = async (direction: 'like' | 'pass', athleteId: string) => {
    setSwiping(true);
    await logSwipeCompliance(athleteId);
    try {
      const res = await fetch(`${API_BASE}/api/match/swipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ athlete_id: athleteId, coach_id: coach!.id, swiped_by: 'coach', direction }),
      });
      const data = await res.json();

      // A failed swipe (network error, 403 from a stale session, etc.) never
      // reached the swipes table — advancing the card anyway would silently
      // drop the swipe with no sign anything went wrong.
      if (!res.ok || data.error) {
        setSwiping(false);
        setSwipeErrorNotif("That didn't save. Check your connection and try again.");
        return;
      }

      if (data.matched) {
        setMatchNotif({ id: data.match_id, name: current?.full_name ?? 'Athlete' });
      }
    } catch {
      setSwiping(false);
      setSwipeErrorNotif("That didn't save. Check your connection and try again.");
      return;
    }
    setSessionSwipedIds(prev => new Set(prev).add(athleteId));
    setSwiping(false);
    setCurrentIndex(i => i + 1);
  };

  const handleSwipe = (direction: 'like' | 'pass') => {
    if (!current || swiping) return;
    recordSwipe(direction, current.id);
  };

  if (coachLoading) {
    return (
      <LoadingScreen />
    );
  }

  // ── Lock states ──
  if (!isSetupComplete) {
    return (
      <LockScreen
        icon="clipboard-outline"
        title="Finish Program Setup"
        body="Complete your program setup — including the levels you recruit at — to start finding athletes."
        cta="Finish Setup"
        onPress={() => router.push('/coach-setup' as any)}
        C={C} s={s}
      />
    );
  }
  if (!coach?.verified) {
    return (
      <LockScreen
        icon="time-outline"
        title="Verification Pending"
        body="Your program is being reviewed. You'll be able to find and swipe on athletes once you're verified."
        C={C} s={s}
      />
    );
  }

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  // ── Level picker — mirrors the athlete side's "Choose Your Level" screen
  // exactly (app/(tabs)/match/index.tsx), shown fresh every time the coach
  // opens Discover so they can pick which caliber of athlete to browse. ──
  if (showingPicker) {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.pickerContainer} showsVerticalScrollIndicator={false}>
        {coachDefaultLevel && (
          <View style={s.scoreChip}>
            <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreChipBadge}>
              <Ionicons name="school" size={13} color="#fff" />
            </LinearGradient>
            <Text style={s.scoreChipText}>
              Your program typically recruits <Text style={s.scoreChipBold}>{coachDefaultLevel}</Text> — pick a level below
            </Text>
          </View>
        )}

        <Text style={s.pickerTitle}>Choose Your Level</Text>
        <Text style={s.pickerSub}>
          Pick a level to start swiping. You can browse any level — athletes above your usual range just come with a heads-up before you reach out.
        </Text>

        {RECRUITING_LEVEL_BANDS.map(band => {
          const count = allAthletes.filter(a => levelOf(a) === band.level).length;
          const isYourLevel = band.level === coachDefaultLevel;
          const defaultIdx = RECRUITING_LEVEL_BANDS.findIndex(b => b.level === coachDefaultLevel);
          const bandIdx = RECRUITING_LEVEL_BANDS.findIndex(b => b.level === band.level);
          const isReach = defaultIdx >= 0 && bandIdx < defaultIdx;
          const rangeText = band.minScore > 0 ? `Typically ${band.minScore}+ V1 Score` : 'Open to any V1 Score';

          const rowContent = (
            <>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.pickerDivLabel}>{band.level}</Text>
                  {isYourLevel && (
                    <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerTagGrad}>
                      <Text style={s.pickerTagGradText}>YOUR RANGE</Text>
                    </LinearGradient>
                  )}
                  {isReach && (
                    <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerTagGrad}>
                      <Text style={s.pickerTagGradText}>REACH</Text>
                    </LinearGradient>
                  )}
                </View>
                <Text style={s.pickerRange}>{rangeText}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={s.pickerCount}>{count} athlete{count === 1 ? '' : 's'}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </View>
            </>
          );

          return (
            <Pressable key={band.key} onPress={() => { setSelectedLevel(band.level); setExpandedToAll(false); setCurrentIndex(0); }}>
              {isYourLevel ? (
                <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerRowGradientBorder}>
                  <View style={[s.pickerRow, s.pickerRowActiveInner]}>{rowContent}</View>
                </LinearGradient>
              ) : (
                <View style={s.pickerRow}>{rowContent}</View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // ── Match celebration ──
  if (matchNotif) {
    return (
      <View style={s.matchCelebration}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Ionicons name="heart" size={64} color="#fff" />
        <Text style={s.matchCelebrationTitle}>It's a Match!</Text>
        <Text style={s.matchCelebrationBody}>{matchNotif.name} is interested too. Start the conversation.</Text>
        <Pressable
          style={s.matchCelebrationBtn}
          onPress={() => { router.push(`/(coach)/match/${matchNotif.id}` as any); setMatchNotif(null); }}
        >
          <Text style={s.matchCelebrationBtnText}>Send a Message</Text>
        </Pressable>
        <Pressable style={{ marginTop: 14 }} onPress={() => setMatchNotif(null)}>
          <Text style={s.matchCelebrationDismiss}>Keep Swiping</Text>
        </Pressable>
      </View>
    );
  }

  // ── Empty state — matches web's "seen everyone" card exactly: full-bleed
  // brand-gradient card, target icon, and (when more athletes exist outside
  // the current level) a single button to expand the search. ──
  if (currentIndex >= totalCards) {
    return (
      <>
        <SafeAreaView style={s.center}>
          <View style={s.emptyCard}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={s.emptyIconWrapGrad}>
              <Feather name="target" size={26} color="#fff" />
            </View>
            <Text style={s.emptyTitleGrad}>You've seen every player</Text>
            <Text style={s.emptyBodyGrad}>
              {expandedToAll
                ? "You've seen everyone in your program's range and beyond. Check back soon."
                : "You've seen everyone currently in your program's range."}
            </Text>
            {!expandedToAll && outsideRangeCount > 0 && (
              <Pressable style={s.emptyBtnWhite} onPress={() => { setExpandedToAll(true); setCurrentIndex(0); }}>
                <Text style={s.emptyBtnWhiteText}>See outside my range ({outsideRangeCount})</Text>
              </Pressable>
            )}
            <Pressable style={{ marginTop: 14 }} onPress={() => { setSelectedLevel(null); setExpandedToAll(false); setCurrentIndex(0); }}>
              <Text style={s.emptyLinkGrad}>Try another level</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        <SwipeHistoryTab onPress={() => { setHistoryFilter('all'); setHistoryOpen(true); }} />
        <SwipeHistoryDrawer
          visible={historyOpen}
          onClose={() => setHistoryOpen(false)}
          loading={historyLoading}
          filter={historyFilter}
          onFilterChange={setHistoryFilter}
          history={filteredHistory}
          C={C}
        />
      </>
    );
  }

  const tierLabel = current?.recruiting_level || fallbackTier(current?.v1_score ?? null);
  const quickStats = [
    current?.height,
    current?.weight ? `${current.weight} lbs` : null,
    current?.forty_yard ? `${current.forty_yard}s 40` : null,
    current?.gpa ? `${current.gpa} GPA` : null,
    current?.high_school,
  ].filter(Boolean).join('   ·   ');

  const drawerTranslateY = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [560, 0] });

  // ── Card deck — fills the whole device screen edge-to-edge, including
  // behind the status bar and home indicator ──
  return (
    <View style={s.deckRoot}>
      <View style={s.card}>
        <SwipeCardBackground uri={current?.profile_photo_url} />

        {swipeErrorNotif && (
          <View style={[s.errorToast, { top: insets.top + 12 }]}>
            <Text style={s.errorToastText}>{swipeErrorNotif}</Text>
          </View>
        )}

        <View style={[s.cardTop, { paddingTop: insets.top + 18 }]}>
          <View style={s.topRow}>
            <Pressable style={s.menuBtn} onPress={() => (navigation as any).openDrawer?.()} hitSlop={8}>
              <Ionicons name="menu" size={22} color="#fff" />
            </Pressable>
            <Text style={[s.topTitle, { flex: 1 }]} numberOfLines={1}>Players For You</Text>
            <Pressable style={s.sliderBtn} onPress={() => { setSelectedLevel(null); setCurrentIndex(0); }}>
              <Ionicons name="options-outline" size={18} color="#fff" />
            </Pressable>
          </View>
          <View style={s.progressRow}>
            <View style={s.progressTrack}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.progressFill, { width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }]} />
            </View>
            <Text style={s.cardCounter}>{Math.min(currentIndex + 1, totalCards)} / {totalCards}</Text>
          </View>
        </View>

        {!!tierLabel && (
          <View style={[s.tierBadge, { top: insets.top + 90 }]}>
            <Text style={s.tierBadgeText}>{tierLabel}</Text>
          </View>
        )}
        {current?.v1_score != null && (
          <View style={[s.scoreBadge, { top: insets.top + 90 }]}>
            <Text style={s.scoreBadgeNum}>{current.v1_score}</Text>
            <Text style={s.scoreBadgeLabel}>V1 Score</Text>
          </View>
        )}

        <View style={[s.cardBottom, { paddingBottom: insets.bottom + 22 }]}>
          <Pressable style={s.infoBlock} onPress={() => toggleDrawer(true)}>
            <View>
              <Text style={s.cardName}>{current?.full_name ?? 'Unknown Athlete'}</Text>
              <Text style={s.cardMeta}>
                {[current?.position, current?.graduation_year ? `Class of ${current.graduation_year}` : null, [current?.city, current?.state].filter(Boolean).join(', ') || null].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {!!quickStats && <Text style={s.quickStats} numberOfLines={1}>{quickStats}</Text>}
          </Pressable>

          <Pressable style={s.viewProfileBtn} onPress={() => toggleDrawer(true)}>
            <Text style={s.viewProfileBtnText}>View Profile</Text>
            <Ionicons name="chevron-up" size={14} color="#fff" />
          </Pressable>

          <View style={s.actionRow}>
            <Pressable style={s.actBtn} onPress={() => handleSwipe('pass')} disabled={swiping}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
            <Pressable style={s.likeBtnWrap} onPress={() => handleSwipe('like')} disabled={swiping}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="add" size={26} color="#fff" />
            </Pressable>
            <Pressable
              style={[s.actBtn, isAlreadyMatched && s.actBtnMatched]}
              disabled={!isAlreadyMatched}
              onPress={() => router.push(existingMatchId ? (`/(coach)/match/${existingMatchId}` as any) : ('/(coach)/matches' as any))}
            >
              <Ionicons name="chatbubble" size={18} color={isAlreadyMatched ? C.success : 'rgba(255,255,255,0.5)'} />
            </Pressable>
          </View>
        </View>

        {/* Full-profile drawer — mirrors the athlete-side program details
            drawer's bottom-sheet pattern, tapping the name/stats opens it. */}
        <Animated.View style={[s.drawer, { transform: [{ translateY: drawerTranslateY }] }]} pointerEvents={drawerOpen ? 'auto' : 'none'}>
          <View style={s.dragRow}>
            <View style={s.dragHandle} />
            <Pressable style={s.drawerCloseBtn} onPress={() => toggleDrawer(false)} hitSlop={8}>
              <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.drawerName}>{current?.full_name ?? 'Unknown Athlete'}</Text>
            <Text style={s.drawerSub}>
              {[current?.position, current?.graduation_year ? `Class of ${current.graduation_year}` : null].filter(Boolean).join(' · ')}
            </Text>

            <View style={s.statGrid}>
              {current?.height && <StatTile label="Height" value={current.height} s={s} />}
              {current?.weight != null && <StatTile label="Weight" value={`${current.weight} lbs`} s={s} />}
              {current?.forty_yard != null && <StatTile label="40-Yard" value={`${current.forty_yard}s`} s={s} />}
              {current?.gpa != null && <StatTile label="GPA" value={String(current.gpa)} s={s} />}
              {current?.high_school && <StatTile label="High School" value={current.high_school} s={s} />}
              {(current?.city || current?.state) && <StatTile label="Location" value={[current?.city, current?.state].filter(Boolean).join(', ')} s={s} />}
              {current?.v1_score != null && <StatTile label="V1 Score" value={String(current.v1_score)} s={s} />}
            </View>

            {current?.bio && (
              <>
                <Text style={s.bioLabel}>Bio</Text>
                <Text style={s.bioText}>{current.bio}</Text>
              </>
            )}

            {current?.hudl_link && (
              <Pressable style={s.hudlLink} onPress={() => Linking.openURL(current.hudl_link as string)}>
                <Ionicons name="open-outline" size={14} color={C.success} />
                <Text style={s.hudlLinkText}>View Film on Hudl</Text>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </View>
      <SwipeHistoryTab onPress={() => { setHistoryFilter('all'); setHistoryOpen(true); }} />
      <SwipeHistoryDrawer
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        loading={historyLoading}
        filter={historyFilter}
        onFilterChange={setHistoryFilter}
        history={filteredHistory}
        C={C}
      />
    </View>
  );
}

function StatTile({ label, value, s }: { label: string; value: string; s: ReturnType<typeof createStyles> }) {
  return (
    <View style={s.statTile}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

// Docked tab, right edge, midway down — opens Swipe History. Mirrors the
// athlete side's app/(tabs)/match/index.tsx SwipeHistoryTab exactly.
function SwipeHistoryTab({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={historyTabStyles.tab} onPress={onPress} hitSlop={8}>
      <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Ionicons name="chevron-back" size={16} color="#fff" />
    </Pressable>
  );
}

const historyTabStyles = StyleSheet.create({
  tab: {
    position: 'absolute', right: 0, top: '50%', marginTop: -60.5,
    width: 22, height: 121,
    borderTopLeftRadius: 24, borderBottomLeftRadius: 24,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16,
    elevation: 12,
  },
});

function SwipeHistoryDrawer({
  visible, onClose, loading, filter, onFilterChange, history, C,
}: {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  filter: 'all' | 'like' | 'pass';
  onFilterChange: (f: 'all' | 'like' | 'pass') => void;
  history: any[];
  C: ThemeColors;
}) {
  const s = useMemo(() => historyStyles(C), [C]);
  const FILTERS: { key: 'all' | 'like' | 'pass'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'like', label: 'Liked' },
    { key: 'pass', label: 'Passed' },
  ];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <SafeAreaView style={s.drawer}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Swipe History</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={C.textMuted} />
          </Pressable>
        </View>
        <View style={s.filters}>
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            const activeBg = key === 'like' ? 'rgba(113,255,126,0.2)' : key === 'pass' ? 'rgba(234,12,95,0.2)' : C.text;
            const activeColor = key === 'like' ? BRAND_GREEN : key === 'pass' ? PINK_RED : C.background;
            return (
              <Pressable
                key={key}
                onPress={() => onFilterChange(key)}
                style={[s.filterBtn, { backgroundColor: active ? activeBg : 'rgba(255,255,255,0.05)' }]}
              >
                <Text style={[s.filterText, { color: active ? activeColor : C.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <ScrollView style={{ flex: 1 }}>
          {loading ? (
            <View style={s.centerMsg}><Text style={s.centerMsgText}>Loading history...</Text></View>
          ) : history.length === 0 ? (
            <View style={s.centerMsg}><Text style={s.centerMsgText}>No swipes yet</Text></View>
          ) : (
            history.map(swipe => {
              const athlete = swipe.athletes;
              const date = new Date(swipe.created_at);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
              return (
                <View key={swipe.id} style={s.row}>
                  <Image source={athlete?.profile_photo_url ? { uri: athlete?.profile_photo_url } : DEFAULT_PROFILE_IMAGE} style={s.avatar} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{athlete?.full_name ?? 'Unknown'}{athlete?.position ? ` · ${athlete.position}` : ''}</Text>
                    <Text style={s.meta}>{swipe.direction === 'like' ? '❤️ Liked' : '✕ Passed'} · {dateStr}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function historyStyles(C: ThemeColors) {
  return StyleSheet.create({
    backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '72%', backgroundColor: C.background, borderLeftWidth: 1, borderLeftColor: C.border },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text },
    filters: { flexDirection: 'row', gap: 8, padding: 16, borderBottomWidth: 1, borderBottomColor: C.border, flexWrap: 'wrap' },
    filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    filterText: { fontFamily: FontFamily.bodySemi, fontSize: 12 },
    centerMsg: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    centerMsgText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    avatar: { width: 44, height: 44, borderRadius: 8 },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    meta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
  });
}

// ── Lock screen ──

function LockScreen({ icon, title, body, cta, onPress, C, s }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; body: string; cta?: string; onPress?: () => void;
  C: ThemeColors; s: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={s.center}>
      <View style={s.emptyIconWrap}><Ionicons name={icon} size={28} color={C.textMuted} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {cta && onPress && (
        <Pressable style={s.emptyBtnGradientWrap} onPress={onPress}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={s.emptyBtnGradientText}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Styles ──

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 32, gap: 6 },
    scroll: { flex: 1, backgroundColor: C.background },
    pickerContainer: { padding: 20, paddingBottom: 40 },

    scoreChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
      backgroundColor: C.surface, borderRadius: 100, paddingVertical: 6, paddingHorizontal: 12, paddingLeft: 6,
      marginBottom: 18,
    },
    scoreChipBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    scoreChipText: { fontFamily: FontFamily.body, fontSize: 11.5, color: C.textMuted, flexShrink: 1 },
    scoreChipBold: { fontFamily: FontFamily.bodyBold, color: C.text },

    pickerTitle: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text, marginBottom: 8 },
    pickerSub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 20 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 10 },
    pickerRowGradientBorder: { borderRadius: 17, padding: 1.5, marginBottom: 10 },
    pickerRowActiveInner: { marginBottom: 0, borderRadius: 15.5 },
    pickerDivLabel: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text },
    pickerRange: { fontFamily: FontFamily.body, fontSize: 11.5, color: C.textDim, marginTop: 5 },
    pickerCount: { fontFamily: FontFamily.mono, fontSize: 11.5, color: C.textDim },
    pickerTagGrad: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
    pickerTagGradText: { fontFamily: FontFamily.mono, fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },

    emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontFamily: FontFamily.headline, fontSize: 22, color: C.text, textAlign: 'center', marginBottom: 4 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 300 },
    emptyBtnGradientWrap: { borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30, overflow: 'hidden' },
    emptyBtnGradientText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff' },
    emptyBtnGhost: { borderRadius: 100, paddingVertical: 13, paddingHorizontal: 26, borderWidth: 1, borderColor: C.border },
    emptyBtnGhostText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    emptyCard: {
      width: '100%', maxWidth: 400, borderRadius: 28, padding: 36,
      alignItems: 'center', overflow: 'hidden',
    },
    emptyIconWrapGrad: {
      width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center', justifyContent: 'center', marginBottom: 18,
    },
    emptyTitleGrad: { fontFamily: FontFamily.headline, fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 8 },
    emptyBodyGrad: { fontFamily: FontFamily.body, fontSize: 13.5, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
    emptyBtnWhite: { alignSelf: 'stretch', backgroundColor: '#fff', borderRadius: 100, paddingVertical: 15, alignItems: 'center' },
    emptyBtnWhiteText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#0a0a0a' },
    emptyLinkGrad: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.85)', textDecorationLine: 'underline' },

    matchCelebration: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    matchCelebrationTitle: { fontFamily: FontFamily.headline, fontSize: 34, color: '#fff', marginTop: 10 },
    matchCelebrationBody: { fontFamily: FontFamily.body, fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 10 },
    matchCelebrationBtn: { backgroundColor: '#fff', borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30 },
    matchCelebrationBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#0a0a0a' },
    matchCelebrationDismiss: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

    deckRoot: { flex: 1, backgroundColor: C.background },
    errorToast: { position: 'absolute', left: 20, right: 20, zIndex: 20, backgroundColor: 'rgba(220,38,38,0.95)', borderRadius: 12, padding: 14 },
    errorToastText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: '#fff', textAlign: 'center' },
    card: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
    cardTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 20, gap: 12 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    topTitle: { fontFamily: FontFamily.headline, fontSize: 26, color: '#fff', letterSpacing: -0.3 },
    sliderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    menuBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressTrack: { flex: 1, height: 5, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 100 },
    cardCounter: { fontFamily: FontFamily.mono, fontSize: 12, fontWeight: '700', color: '#fff' },

    tierBadge: { position: 'absolute', top: 92, left: 20, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${PINK_RED}26` },
    tierBadgeText: { fontFamily: FontFamily.mono, fontSize: 11, fontWeight: '700', color: PINK_RED, textTransform: 'uppercase', letterSpacing: 0.5 },
    scoreBadge: { position: 'absolute', top: 92, right: 20, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(10,10,12,0.55)', alignItems: 'center' },
    scoreBadgeNum: { fontFamily: FontFamily.mono, fontSize: 20, fontWeight: '700', color: '#fff' },
    scoreBadgeLabel: { fontFamily: FontFamily.body, fontSize: 9, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },

    cardBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, gap: 14 },
    infoBlock: { gap: 10 },
    cardName: { fontFamily: FontFamily.headline, fontSize: 26, color: '#fff', letterSpacing: -0.3 },
    cardMeta: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
    quickStats: { fontFamily: FontFamily.mono, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

    viewProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 100, paddingVertical: 10 },
    viewProfileBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
    actBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    actBtnMatched: { backgroundColor: 'rgba(113,255,126,0.16)' },
    likeBtnWrap: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

    drawer: {
      position: 'absolute', bottom: 0, left: 0, right: 0, height: '66%',
      backgroundColor: 'rgba(10,10,16,0.97)', borderRadius: 20,
      paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
    },
    dragRow: { position: 'relative', marginBottom: 16, alignItems: 'center' },
    dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
    drawerCloseBtn: { position: 'absolute', top: -6, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    drawerName: { fontFamily: FontFamily.headline, fontSize: 19, color: '#fff', marginBottom: 4 },
    drawerSub: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 18 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    statTile: { width: '47%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    statValue: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
    bioLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    bioText: { fontFamily: FontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 16 },
    hudlLink: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(113,255,126,0.14)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
    hudlLinkText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.success },
  });
}
