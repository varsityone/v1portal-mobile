import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
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
import { GRADIENT, SCORE_GRADIENT, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { DIVISION_MIN_SCORE_DEFAULT, Division } from '../../../constants/RecruitingLevels';

const API_BASE = 'https://v1portal.com';

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
        .select('id, full_name, position, graduation_year, city, state, high_school, v1_score, bio, profile_photo_url')
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
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }]} />
          </View>
          <Text style={s.cardCounter}>{Math.min(currentIndex + 1, totalCards)} / {totalCards}</Text>
        </View>

        <View style={[s.cardBottom, { paddingBottom: insets.bottom + 22 }]}>
          {current?.v1_score != null && (
            <View style={s.scoreChip}>
              <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={s.scoreChipText}>{current.v1_score} V1</Text>
            </View>
          )}
          <Text style={s.cardName}>{current?.full_name ?? 'Unknown Athlete'}</Text>
          <Text style={s.cardMeta}>
            {current?.position}{current?.graduation_year ? ` · Class of ${current.graduation_year}` : ''}
          </Text>
          <Text style={s.cardSchool}>
            {[current?.high_school, current?.city, current?.state].filter(Boolean).join(', ')}
          </Text>
          {current?.bio ? <Text style={s.cardBio} numberOfLines={3}>{current.bio}</Text> : null}

          {isAlreadyMatched ? (
            <Pressable
              style={s.messageBtn}
              onPress={() => router.push(existingMatchId ? (`/(coach)/match/${existingMatchId}` as any) : ('/(coach)/matches' as any))}
            >
              <Ionicons name="chatbubble" size={16} color="#fff" />
              <Text style={s.messageBtnText}>Message</Text>
            </Pressable>
          ) : (
            <View style={s.actionRow}>
              <Pressable style={s.passBtn} onPress={() => handleSwipe('pass')} disabled={swiping}>
                <Ionicons name="close" size={26} color="#fff" />
              </Pressable>
              <Pressable style={s.likeBtnWrap} onPress={() => handleSwipe('like')} disabled={swiping}>
                <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Ionicons name="heart" size={24} color="#fff" />
              </Pressable>
            </View>
          )}
        </View>
      </View>
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
    cardScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,10,0.15)' },
    cardTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressTrack: { flex: 1, height: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 100 },
    cardCounter: { fontFamily: FontFamily.mono, fontSize: 12, color: '#fff' },
    cardBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22, gap: 4 },
    scoreChip: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', marginBottom: 8 },
    scoreChipText: { fontFamily: FontFamily.monoBold, fontSize: 11, color: '#fff', letterSpacing: 0.5 },
    cardName: { fontFamily: FontFamily.headline, fontSize: 28, color: '#fff' },
    cardMeta: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
    cardSchool: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
    cardBio: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: 14 },
    actionRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
    passBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    likeBtnWrap: { flex: 1, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.success, borderRadius: 100, paddingVertical: 15, marginTop: 6 },
    messageBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff' },
  });
}
