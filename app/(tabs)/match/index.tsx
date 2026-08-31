import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { GRADIENT, SCORE_GRADIENT, PINK_RED, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import {
  DIVISION_ORDER,
  DIVISION_LABELS,
  DIVISION_MIN_SCORE_DEFAULT,
  Division,
  getAthleteLevel,
} from '../../../constants/RecruitingLevels';

const API_BASE = 'https://v1portal.com';
const FREE_ATHLETE_CARD_LIMIT = 3;

interface CoachCard {
  id: string;
  full_name: string | null;
  school_name: string | null;
  division: string;
  position_coached: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  min_score: number | null;
}

function isProfileComplete(athlete: any): boolean {
  return !!(
    athlete?.full_name && athlete?.phone && athlete?.bio &&
    athlete?.position && athlete?.graduation_year && athlete?.height &&
    athlete?.weight && athlete?.high_school && athlete?.city &&
    athlete?.gpa && athlete?.ncaa_id &&
    (athlete?.sat_score || athlete?.act_score || athlete?.test_scores_not_taken) &&
    athlete?.hudl_link &&
    athlete?.guardian_name && athlete?.guardian_relationship &&
    athlete?.guardian_phone && athlete?.guardian_email
  );
}

export default function MatchScreen() {
  const router = useRouter();
  const { athlete, loading: athleteLoading } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [loading, setLoading] = useState(true);
  const [coachCards, setCoachCards] = useState<CoachCard[]>([]);
  const [existingMatches, setExistingMatches] = useState<Map<string, string>>(new Map());
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [matchNotif, setMatchNotif] = useState<{ id: string; name: string } | null>(null);
  const [pendingReach, setPendingReach] = useState<{ division: Division; typicalScore: number } | null>(null);

  useEffect(() => {
    if (athleteLoading || !athlete?.id) return;

    async function load() {
      const { data: swiped } = await supabase
        .from('swipes')
        .select('coach_id')
        .eq('athlete_id', athlete!.id)
        .eq('swiped_by', 'athlete');
      const swipedIds = (swiped ?? []).map(s => s.coach_id);

      let q = supabase
        .from('coach_accounts')
        .select('id, full_name, school_name, division, position_coached, bio, profile_photo_url, min_score')
        .eq('verified', true)
        .limit(200);
      if (swipedIds.length > 0) q = q.not('id', 'in', `(${swipedIds.join(',')})`);

      const { data: coaches } = await q;
      setCoachCards(coaches ?? []);

      const { data: matches } = await supabase
        .from('mutual_matches')
        .select('id, coach_id')
        .eq('athlete_id', athlete!.id)
        .eq('status', 'active');
      setExistingMatches(new Map((matches ?? []).map(m => [m.coach_id, m.id])));

      setLoading(false);
    }
    load();
  }, [athleteLoading, athlete?.id]);

  const athleteScore = athlete?.v1_score ?? 0;
  const athleteLevel = getAthleteLevel(athleteScore);
  const isPremium = !!athlete && (
    (athlete.subscription_status === 'active' && athlete.subscription_tier === 'pro')
    || !!athlete.is_admin || !!athlete.manual_access
  );

  const activeDivision: Division | null = selectedDivision ?? (!isPremium ? athleteLevel : null);
  const rawDeck = activeDivision ? coachCards.filter(c => c.division === activeDivision) : [];
  const deck = (!isPremium) ? rawDeck.slice(0, FREE_ATHLETE_CARD_LIMIT) : rawDeck;

  const current = deck[currentIndex];
  const totalCards = deck.length;
  const isAlreadyMatched = current ? existingMatches.has(current.id) : false;
  const existingMatchId = current ? existingMatches.get(current.id) : undefined;

  const recordSwipe = async (direction: 'like' | 'pass', coachId: string) => {
    setSwiping(true);
    try {
      const res = await fetch(`${API_BASE}/api/match/swipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athlete!.id, coach_id: coachId, swiped_by: 'athlete', direction }),
      });
      const data = await res.json();
      if (data.matched) {
        setMatchNotif({ id: data.match_id, name: current?.school_name ?? 'Program' });
      }
    } catch {
      // Silently fall through — the swipe just won't record; user can try again.
    }
    setSwiping(false);
    setCurrentIndex(i => i + 1);
  };

  const handleSwipe = (direction: 'like' | 'pass') => {
    if (!current || swiping) return;

    if (direction === 'like' && current.division) {
      const div = current.division as Division;
      const typicalScore = DIVISION_MIN_SCORE_DEFAULT[div];
      if (typicalScore != null && athleteScore < typicalScore) {
        setPendingReach({ division: div, typicalScore });
        return;
      }
    }
    recordSwipe(direction, current.id);
  };

  if (athleteLoading || loading) {
    return (
      <View style={s.center}>
        <Ionicons name="heart" size={28} color={C.textDim} />
      </View>
    );
  }

  // ── Lock states ──
  if (!athlete?.assessment_completed) {
    return (
      <LockScreen
        icon="clipboard-outline"
        title="Take Your Assessment"
        body="Your V1 Score isn't ready yet. Complete your assessment to unlock program matching."
        cta="Take Your Assessment"
        onPress={() => router.push('/(tabs)/gameplan/1' as any)}
      />
    );
  }
  if (!isProfileComplete(athlete)) {
    return (
      <LockScreen
        icon="person-outline"
        title="Finish Your Profile"
        body="Your profile is missing required fields so coaches can find you."
        cta="Complete Your Profile"
        onPress={() => router.push('/(tabs)/gameplan/2' as any)}
      />
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
          onPress={() => { router.push(`/(tabs)/match/${matchNotif.id}` as any); setMatchNotif(null); }}
        >
          <Text style={s.matchCelebrationBtnText}>Send a Message</Text>
        </Pressable>
        <Pressable style={{ marginTop: 14 }} onPress={() => setMatchNotif(null)}>
          <Text style={s.matchCelebrationDismiss}>Keep Swiping</Text>
        </Pressable>
      </View>
    );
  }

  // ── Reality-check alert ──
  if (pendingReach && current) {
    return (
      <RealityCheck
        programName={current.school_name ?? 'This program'}
        divisionLabel={DIVISION_LABELS[pendingReach.division]}
        athleteScore={athleteScore}
        typicalScore={pendingReach.typicalScore}
        sending={swiping}
        onSendAnyway={() => { const c = current; setPendingReach(null); recordSwipe('like', c.id); }}
        onViewGameplan={() => { setPendingReach(null); router.push('/(tabs)/gameplan' as any); }}
        onCancel={() => setPendingReach(null)}
      />
    );
  }

  // ── Level picker (Match+ only) ──
  if (isPremium && !selectedDivision) {
    return (
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <Text style={s.pickerTitle}>Choose Your Level</Text>
        <Text style={s.pickerSub}>
          Pick a division to start swiping. You can browse any level — programs above your range just come with a heads-up before you send interest.
        </Text>
        {DIVISION_ORDER.map(div => {
          const count = coachCards.filter(c => c.division === div).length;
          const isYourLevel = div === athleteLevel;
          const isReach = DIVISION_ORDER.indexOf(div) < DIVISION_ORDER.indexOf(athleteLevel);
          return (
            <Pressable
              key={div}
              style={[s.pickerRow, isYourLevel && s.pickerRowActive]}
              onPress={() => { setSelectedDivision(div); setCurrentIndex(0); }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.pickerDivLabel}>{DIVISION_LABELS[div]}</Text>
                  {isYourLevel && <View style={s.pickerTag}><Text style={s.pickerTagText}>YOUR LEVEL</Text></View>}
                  {isReach && <View style={[s.pickerTag, s.pickerTagReach]}><Text style={[s.pickerTagText, { color: PINK_RED }]}>REACH</Text></View>}
                </View>
                <Text style={s.pickerCount}>{count} program{count === 1 ? '' : 's'} available</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textDim} />
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  // ── Empty state ──
  if (currentIndex >= totalCards) {
    return (
      <View style={s.center}>
        <View style={s.emptyIconWrap}>
          <Ionicons name="heart-outline" size={28} color={C.textMuted} />
        </View>
        {isPremium ? (
          <>
            <Text style={s.emptyTitle}>You're caught up</Text>
            <Text style={s.emptyBody}>
              You've seen every {activeDivision ? DIVISION_LABELS[activeDivision] : ''} program available right now. Check back soon.
            </Text>
            <Pressable style={s.emptyBtn} onPress={() => { setSelectedDivision(null); setCurrentIndex(0); }}>
              <Text style={s.emptyBtnText}>Try Another Level</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={s.emptyTitle}>You've seen your free picks</Text>
            <Text style={s.emptyBody}>
              Match+ unlocks every {activeDivision ? DIVISION_LABELS[activeDivision] : ''} program plus every other division — no cap on swipes.
            </Text>
            <Pressable style={s.emptyBtnGradientWrap} onPress={() => router.push('/(tabs)/upgrade' as any)}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={s.emptyBtnGradientText}>Upgrade to Match+</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  // ── Card deck ──
  return (
    <View style={s.deckRoot}>
      {isPremium && (
        <Pressable style={s.backRow} onPress={() => { setSelectedDivision(null); setCurrentIndex(0); }}>
          <Ionicons name="chevron-back" size={16} color={C.textMuted} />
          <Text style={s.backText}>{activeDivision ? DIVISION_LABELS[activeDivision] : ''}</Text>
        </Pressable>
      )}

      <View style={s.card}>
        {current?.profile_photo_url ? (
          <Image source={{ uri: current.profile_photo_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <LinearGradient colors={['#1a1a2e', '#0a0a0c']} style={StyleSheet.absoluteFill} />
        )}
        <View style={s.cardScrim} />

        <View style={s.cardTop}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }]} />
          </View>
          <Text style={s.cardCounter}>{Math.min(currentIndex + 1, totalCards)} / {totalCards}</Text>
        </View>

        <View style={s.cardBottom}>
          <Text style={s.cardDivision}>{current?.division}</Text>
          <Text style={s.cardSchool}>{current?.school_name ?? 'Unknown Program'}</Text>
          <Text style={s.cardCoach}>
            {current?.position_coached}{current?.full_name ? ` · Coach ${current.full_name.split(' ').pop()}` : ''}
          </Text>
          {current?.bio ? <Text style={s.cardBio} numberOfLines={3}>{current.bio}</Text> : null}

          {isAlreadyMatched ? (
            <Pressable
              style={s.messageBtn}
              onPress={() => router.push(existingMatchId ? (`/(tabs)/match/${existingMatchId}` as any) : ('/(tabs)/match' as any))}
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

function LockScreen({ icon, title, body, cta, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; body: string; cta: string; onPress: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.center}>
      <View style={s.emptyIconWrap}><Ionicons name={icon} size={28} color={C.textMuted} /></View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      <Pressable style={s.emptyBtnGradientWrap} onPress={onPress}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={s.emptyBtnGradientText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

// ── Reality check ──

function RealityCheck({
  programName, divisionLabel, athleteScore, typicalScore, sending, onSendAnyway, onViewGameplan, onCancel,
}: {
  programName: string; divisionLabel: string; athleteScore: number; typicalScore: number;
  sending: boolean; onSendAnyway: () => void; onViewGameplan: () => void; onCancel: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.center}>
      <View style={[s.emptyIconWrap, { backgroundColor: 'rgba(113,255,126,0.14)' }]}>
        <Ionicons name="trending-up" size={26} color={C.success} />
      </View>
      <Text style={[s.pickerTagText, { color: C.success, marginBottom: 6 }]}>THIS ONE'S A REACH</Text>
      <Text style={s.emptyTitle}>
        {programName} typically looks for {divisionLabel} prospects around a {typicalScore} V1 Score
      </Text>
      <Text style={s.emptyBody}>
        You're currently at {athleteScore}. Coaches at this level don't always respond outside their range — but you're welcome to send it anyway.
      </Text>
      <Pressable style={s.emptyBtnGradientWrap} onPress={onViewGameplan}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={s.emptyBtnGradientText}>View My Gameplan</Text>
      </Pressable>
      <Pressable style={[s.emptyBtn, { marginTop: 10 }]} onPress={onSendAnyway} disabled={sending}>
        <Text style={s.emptyBtnText}>{sending ? 'Sending…' : 'Send Anyway'}</Text>
      </Pressable>
      <Pressable style={{ marginTop: 10 }} onPress={onCancel}>
        <Text style={s.matchCelebrationDismiss}>Cancel</Text>
      </Pressable>
    </View>
  );
}

// ── Styles ──

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 32, gap: 6 },

    pickerTitle: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text, marginBottom: 8 },
    pickerSub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 20 },
    pickerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 10 },
    pickerRowActive: { backgroundColor: 'rgba(113,255,126,0.10)' },
    pickerDivLabel: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text },
    pickerCount: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 4 },
    pickerTag: { backgroundColor: 'rgba(113,255,126,0.16)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
    pickerTagReach: { backgroundColor: 'rgba(234,12,95,0.14)' },
    pickerTagText: { fontFamily: FontFamily.mono, fontSize: 9, color: C.success, letterSpacing: 0.5 },

    emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontFamily: FontFamily.headline, fontSize: 22, color: C.text, textAlign: 'center', marginBottom: 4 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 300 },
    emptyBtn: { backgroundColor: C.surfaceAlt, borderRadius: 100, paddingVertical: 13, paddingHorizontal: 26 },
    emptyBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    emptyBtnGradientWrap: { borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30, overflow: 'hidden' },
    emptyBtnGradientText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff' },

    matchCelebration: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    matchCelebrationTitle: { fontFamily: FontFamily.headline, fontSize: 34, color: '#fff', marginTop: 10 },
    matchCelebrationBody: { fontFamily: FontFamily.body, fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 10 },
    matchCelebrationBtn: { backgroundColor: '#fff', borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30 },
    matchCelebrationBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#0a0a0a' },
    matchCelebrationDismiss: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

    deckRoot: { flex: 1, backgroundColor: C.background, padding: 16 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
    backText: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textMuted, letterSpacing: 0.5 },
    card: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: '#111' },
    cardScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,10,0.15)' },
    cardTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressTrack: { flex: 1, height: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 100 },
    cardCounter: { fontFamily: FontFamily.mono, fontSize: 12, color: '#fff' },
    cardBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22, gap: 4 },
    cardDivision: { fontFamily: FontFamily.mono, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
    cardSchool: { fontFamily: FontFamily.headline, fontSize: 28, color: '#fff' },
    cardCoach: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
    cardBio: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: 14 },
    actionRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
    passBtn: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
    likeBtnWrap: { flex: 1, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.success, borderRadius: 100, paddingVertical: 15, marginTop: 6 },
    messageBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff' },
  });
}
