import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { useAuth } from '../../../hooks/useAuth';
import { GRADIENT, PINK_RED, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { DIVISION_MIN_SCORE_DEFAULT, Division } from '../../../constants/RecruitingLevels';

const API_BASE = 'https://v1portal.com';

// Local score->tier fallback for the rare row with no cached recruiting_level —
// mirrors the same bands used on the athlete's own profile screen.
function fallbackTier(score: number | null): string {
  if (!score) return '';
  if (score >= 80) return 'FBS Prospect';
  if (score >= 75) return 'FCS Prospect';
  if (score >= 70) return 'D2 Prospect';
  if (score >= 60) return 'D3/NAIA Prospect';
  if (score >= 50) return 'NAIA/JUCO Prospect';
  return 'JUCO/Prep School Prospect';
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
  const [deck, setDeck] = useState<AthleteCard[]>([]);
  const [existingMatches, setExistingMatches] = useState<Map<string, string>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [matchNotif, setMatchNotif] = useState<{ id: string; name: string } | null>(null);
  const [swipeErrorNotif, setSwipeErrorNotif] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

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
      const athletes = (data ?? []) as AthleteCard[];
      const floor = coach!.min_score ?? DIVISION_MIN_SCORE_DEFAULT[(coach!.division as Division) ?? 'NJCAA'] ?? 0;
      const inRange = athletes.filter(a => (a.v1_score ?? 0) >= floor);

      const needs = coach!.position_needs ?? [];
      const matched = needs.length ? inRange.filter(a => a.position && needs.includes(a.position)) : [];
      const rest = needs.length ? inRange.filter(a => !(a.position && needs.includes(a.position))) : inRange;
      setDeck([...matched, ...rest]);

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

  const current = deck[currentIndex];
  const totalCards = deck.length;
  const isAlreadyMatched = current ? existingMatches.has(current.id) : false;
  const existingMatchId = current ? existingMatches.get(current.id) : undefined;

  const isFullScreenDeck = !coachLoading && !loading && isSetupComplete && !!coach?.verified && !matchNotif;

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
    setSwiping(false);
    setCurrentIndex(i => i + 1);
  };

  const handleSwipe = (direction: 'like' | 'pass') => {
    if (!current || swiping) return;
    recordSwipe(direction, current.id);
  };

  if (coachLoading) {
    return (
      <View style={s.center}>
        <Ionicons name="heart" size={28} color={C.textDim} />
      </View>
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
      <View style={s.center}>
        <Ionicons name="heart" size={28} color={C.textDim} />
      </View>
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

  // ── Empty state ──
  if (currentIndex >= totalCards) {
    return (
      <SafeAreaView style={s.center}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="heart-outline" size={28} color={C.textMuted} />
        </View>
        <Text style={s.emptyTitle}>You're caught up</Text>
        <Text style={s.emptyBody}>You've seen every athlete matching your program right now. Check back soon.</Text>
      </SafeAreaView>
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
        {current?.profile_photo_url ? (
          <Image source={{ uri: current.profile_photo_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={['#1a1a2e', '#0a0a0c']} style={StyleSheet.absoluteFill} />
        )}
        <View style={s.cardScrim} />

        {swipeErrorNotif && (
          <View style={[s.errorToast, { top: insets.top + 12 }]}>
            <Text style={s.errorToastText}>{swipeErrorNotif}</Text>
          </View>
        )}

        <View style={[s.cardTop, { paddingTop: insets.top + 18 }]}>
          <View style={s.topRow}>
            <Text style={s.topTitle}>Players For You</Text>
            <View style={s.sliderBtn}>
              <Ionicons name="options-outline" size={18} color="#fff" />
            </View>
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

    emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontFamily: FontFamily.headline, fontSize: 22, color: C.text, textAlign: 'center', marginBottom: 4 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 300 },
    emptyBtnGradientWrap: { borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30, overflow: 'hidden' },
    emptyBtnGradientText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff' },

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
    cardScrim: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(10,10,12,0.4)',
    },
    cardTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 20, gap: 12 },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    topTitle: { fontFamily: FontFamily.headline, fontSize: 26, color: '#fff', letterSpacing: -0.3 },
    sliderBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
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
