import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { needsNcaaRegistration } from '../../../lib/profileCompleteness';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { useAuth } from '../../../hooks/useAuth';
import { GRADIENT, SIGNAL_GRADIENT, FLAME_GRADIENT, PINK_RED, BRAND_GREEN, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import {
  DIVISION_ORDER,
  DIVISION_LABELS,
  Division,
  getBandFloorForDivision,
  getPrimaryDivisionForScore,
} from '../../../constants/RecruitingLevels';

const API_BASE = 'https://v1portal.com';
const FREE_ATHLETE_CARD_LIMIT = 3;

interface CoachCard {
  id: string;
  full_name: string | null;
  school_name: string | null;
  division: string;
  position_coached: string | null;
  position_needs: string[] | null;
  bio: string | null;
  profile_photo_url: string | null;
  min_score: number | null;
  profile_slug: string | null;
  twitter: string | null;
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
  const navigation = useNavigation();
  const { athlete, loading: athleteLoading, refresh: refreshAthlete } = useAthleteData();
  const { session } = useAuth();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [coachCards, setCoachCards] = useState<CoachCard[]>([]);
  const [existingMatches, setExistingMatches] = useState<Map<string, string>>(new Map());
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [matchNotif, setMatchNotif] = useState<{ id: string; name: string } | null>(null);
  const [pendingReach, setPendingReach] = useState<{ division: Division; typicalScore: number } | null>(null);
  const [swipeErrorNotif, setSwipeErrorNotif] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [swipeHistory, setSwipeHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'like' | 'pass'>('all');

  useEffect(() => {
    if (!swipeErrorNotif) return;
    const t = setTimeout(() => setSwipeErrorNotif(null), 4000);
    return () => clearTimeout(t);
  }, [swipeErrorNotif]);

  // Load swipe history when the history drawer opens
  useEffect(() => {
    if (!historyOpen || !athlete?.id) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const { data } = await supabase
          .from('swipes')
          .select('id, direction, created_at, coach_id, coach_accounts(full_name, school_name, division, profile_photo_url)')
          .eq('athlete_id', athlete.id)
          .eq('swiped_by', 'athlete')
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
  }, [historyOpen, athlete?.id]);

  const filteredHistory = swipeHistory.filter(swipe => historyFilter === 'all' || swipe.direction === historyFilter);

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
        .select('id, full_name, school_name, division, position_coached, position_needs, bio, profile_photo_url, min_score, profile_slug, twitter')
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
  const athleteLevel = getPrimaryDivisionForScore(athleteScore);
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

  // The swipe deck (and its "you're caught up" empty state) fills the whole
  // screen, matching web — everything else (lock states, the level picker,
  // celebration/reality-check) keeps the normal drawer header.
  const showingPicker = isPremium && !selectedDivision;
  const isFullScreenDeck = !athleteLoading && !loading && !!athlete?.assessment_completed
    && isProfileComplete(athlete) && !matchNotif && !pendingReach && !showingPicker;

  useEffect(() => {
    navigation.getParent()?.setOptions({ headerShown: !isFullScreenDeck });
    return () => { navigation.getParent()?.setOptions({ headerShown: true }); };
  }, [isFullScreenDeck, navigation]);

  // Drawer screens stay mounted in the background, so returning to this tab
  // (e.g. right after buying Match+ on the upgrade screen) wouldn't otherwise
  // pick up a subscription change until the app was fully restarted.
  useFocusEffect(
    useCallback(() => {
      refreshAthlete();
    }, [refreshAthlete])
  );

  const recordSwipe = async (direction: 'like' | 'pass', coachId: string) => {
    setSwiping(true);
    try {
      const res = await fetch(`${API_BASE}/api/match/swipe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ athlete_id: athlete!.id, coach_id: coachId, swiped_by: 'athlete', direction }),
      });
      const data = await res.json();

      // A failed swipe (network error, 403 from a stale session, etc.) never
      // reached the swipes table — advancing the card anyway would silently
      // drop a like with no sign anything went wrong. Keep the card in place
      // and surface it instead.
      if (!res.ok || data.error) {
        setSwiping(false);
        setSwipeErrorNotif("That didn't save. Check your connection and try again.");
        return;
      }

      if (data.matched) {
        setMatchNotif({ id: data.match_id, name: current?.school_name ?? 'Program' });
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

    if (direction === 'like' && current.division) {
      const div = current.division as Division;
      const typicalScore = current.min_score ?? getBandFloorForDivision(div);
      if (typicalScore != null && athleteScore < typicalScore) {
        setPendingReach({ division: div, typicalScore });
        return;
      }
    }
    recordSwipe(direction, current.id);
  };

  // "Retry this level" — clears the athlete's own swipes for the active
  // division so the same set of programs reappears in the deck. Never
  // touches the coach's side of a swipe or an existing mutual_matches row,
  // so an already-matched program stays matched even if it comes back
  // through here.
  const handleRetryLevel = async () => {
    if (!athlete || !activeDivision || retrying) return;
    setRetrying(true);
    try {
      const { data: divisionCoaches } = await supabase
        .from('coach_accounts')
        .select('id, full_name, school_name, division, position_coached, position_needs, bio, profile_photo_url, min_score, profile_slug, twitter')
        .eq('verified', true)
        .eq('division', activeDivision);
      const divisionCards = divisionCoaches ?? [];
      if (divisionCards.length === 0) { setRetrying(false); return; }

      const { data: swipedRows } = await supabase
        .from('swipes')
        .select('coach_id')
        .eq('athlete_id', athlete.id)
        .eq('swiped_by', 'athlete')
        .in('coach_id', divisionCards.map(c => c.id));

      await Promise.all((swipedRows ?? []).map(({ coach_id }) =>
        fetch(`${API_BASE}/api/match/swipe`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ athlete_id: athlete.id, coach_id, swiped_by: 'athlete' }),
        })
      ));

      setCoachCards(prev => [...prev.filter(c => c.division !== activeDivision), ...divisionCards]);
      setCurrentIndex(0);
    } finally {
      setRetrying(false);
    }
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
        icon="clipboard"
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
        icon="person"
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
        {needsNcaaRegistration(athlete) && (
          <View style={s.ncaaChip}>
            <Ionicons name="warning" size={14} color="#fff" style={{ flexShrink: 0 }} />
            <Text style={s.ncaaChipText}>You haven't registered your NCAA Eligibility ID yet — coaches will ask.</Text>
          </View>
        )}
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
        <View style={s.scoreChip}>
          <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreChipBadge}>
            <Text style={s.scoreChipBadgeText}>{Math.round(athleteScore)}</Text>
          </LinearGradient>
          <Text style={s.scoreChipText}>
            Your V1 Score puts you at <Text style={s.scoreChipBold}>{DIVISION_LABELS[athleteLevel]}</Text> — pick a division below
          </Text>
        </View>

        <Text style={s.pickerTitle}>Choose Your Level</Text>
        <Text style={s.pickerSub}>
          Pick a division to start swiping. You can browse any level — programs above your range just come with a heads-up before you send interest.
        </Text>
        {DIVISION_ORDER.map(div => {
          const count = coachCards.filter(c => c.division === div).length;
          const isYourLevel = div === athleteLevel;
          const isReach = DIVISION_ORDER.indexOf(div) < DIVISION_ORDER.indexOf(athleteLevel);
          const floor = getBandFloorForDivision(div);
          const rangeText = !floor ? 'Open to any V1 Score' : `Programs typically recruit ${floor}+ V1 Score`;

          const rowContent = (
            <>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={s.pickerDivLabel}>{DIVISION_LABELS[div]}</Text>
                  {isYourLevel && (
                    <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerTagGrad}>
                      <Text style={s.pickerTagGradText}>YOUR LEVEL</Text>
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
                <Text style={s.pickerCount}>{count} program{count === 1 ? '' : 's'}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </View>
            </>
          );

          return (
            <Pressable key={div} onPress={() => { setSelectedDivision(div); setCurrentIndex(0); }}>
              {isYourLevel ? (
                // Gradient "border" via the padding-box trick: an outer
                // LinearGradient sized down to a thin ring, with an opaque
                // inner View inset by that same amount on top of it.
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

  // ── Empty state — fills the screen, same as the deck (header hidden) ──
  if (currentIndex >= totalCards) {
    return (
      <SafeAreaView style={s.deckRoot}>
        <View style={s.emptyWrap}>
          <View style={s.emptyCard}>
            <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Feather name="target" size={40} color="#fff" />
            {isPremium ? (
              <>
                <Text style={s.emptyCardTitle}>You're caught up</Text>
                <Text style={s.emptyCardBody}>
                  You've seen every {activeDivision ? DIVISION_LABELS[activeDivision] : ''} program available right now. New programs open up their board every week — check back soon.
                </Text>
                <View style={s.emptyCardBtnRow}>
                  <Pressable style={s.emptyCardBtnWhite} onPress={handleRetryLevel} disabled={retrying}>
                    <Text style={s.emptyCardBtnWhiteText}>{retrying ? 'Resetting…' : 'Retry this level'}</Text>
                  </Pressable>
                  <Pressable style={s.emptyCardBtnGhost} onPress={() => { setSelectedDivision(null); setCurrentIndex(0); }}>
                    <Text style={s.emptyCardBtnGhostText}>Try another level</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={s.emptyCardTitle}>You've seen your free picks</Text>
                <Text style={s.emptyCardBody}>
                  Match+ unlocks every {activeDivision ? DIVISION_LABELS[activeDivision] : ''} program plus every other division — no cap on swipes.
                </Text>
                <Pressable style={s.emptyCardBtnWhite} onPress={() => router.push('/(tabs)/upgrade' as any)}>
                  <Text style={s.emptyCardBtnWhiteText}>Upgrade to Match+</Text>
                </Pressable>
              </>
            )}
          </View>
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
      </SafeAreaView>
    );
  }

  // ── Card deck — fills the whole device screen edge-to-edge, including
  // behind the status bar and home indicator (header hidden above) ──
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
          {isPremium && (
            <Pressable
              style={s.backChevron}
              onPress={() => { setSelectedDivision(null); setCurrentIndex(0); }}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </Pressable>
          )}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }]} />
          </View>
          <Text style={s.cardCounter}>{Math.min(currentIndex + 1, totalCards)} / {totalCards}</Text>
        </View>

        {/* Every card an athlete sees is already verified (query-guaranteed) */}
        <View style={[s.verifiedBadge, { top: insets.top + 56 }]}>
          <Ionicons name="checkmark" size={13} color={C.success} />
          <Text style={s.verifiedBadgeText}>Verified</Text>
        </View>

        <View style={[s.cardBottom, { paddingBottom: insets.bottom + 22 }]}>
          <Text style={s.cardDivision}>{current?.division}</Text>
          <Text style={s.cardSchool}>{current?.school_name ?? 'Unknown Program'}</Text>
          <Text style={s.cardCoach}>
            {current?.position_coached}{current?.full_name ? ` · Coach ${current.full_name.split(' ').pop()}` : ''}
          </Text>
          {(() => {
            const displayMinScore = current?.min_score ?? (current?.division ? getBandFloorForDivision(current.division as Division) : null);
            const isTypical = current?.min_score == null;
            return ((current?.position_needs?.length ?? 0) > 0 || displayMinScore != null) && (
              <View style={s.tagRow}>
                {(current?.position_needs ?? []).slice(0, 3).map(pos => (
                  <View key={pos} style={s.posTag}>
                    <Text style={s.posTagText}>{pos}</Text>
                  </View>
                ))}
                {displayMinScore != null && (
                  <View style={s.minScoreTag}>
                    <Text style={s.minScoreTagText}>{isTypical ? `TYPICAL V1 ${displayMinScore}` : `MIN V1 ${displayMinScore}`}</Text>
                  </View>
                )}
              </View>
            );
          })()}
          {current?.bio ? <Text style={s.cardBio} numberOfLines={3}>{current.bio}</Text> : null}
          {current?.twitter && (
            <Pressable
              onPress={() => Linking.openURL(`https://x.com/${(current.twitter as string).replace(/^@/, '')}`)}
              style={s.twitterRow}
            >
              <Ionicons name="logo-twitter" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={s.twitterRowText}>@{(current.twitter as string).replace(/^@/, '')}</Text>
            </Pressable>
          )}
          {current?.profile_slug && (
            <Pressable
              onPress={() => Linking.openURL(`${API_BASE}/coach/${current.profile_slug}`)}
              style={s.viewProfileBtn}
            >
              <Text style={s.viewProfileBtnText}>View Full Profile</Text>
              <Ionicons name="open-outline" size={14} color="#fff" />
            </Pressable>
          )}

          <View style={s.actionRow}>
            <Pressable style={s.passBtn} onPress={() => handleSwipe('pass')} disabled={swiping}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            <Pressable style={s.likeBtnWrap} onPress={() => handleSwipe('like')} disabled={swiping}>
              <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="add" size={26} color="#fff" />
            </Pressable>
            <Pressable
              style={[s.messageBtnCircle, isAlreadyMatched && s.messageBtnCircleMatched]}
              onPress={() => {
                if (isAlreadyMatched) {
                  router.push(existingMatchId ? (`/(tabs)/match/${existingMatchId}` as any) : ('/(tabs)/match' as any));
                } else {
                  handleSwipe('like');
                }
              }}
              disabled={swiping}
            >
              <Ionicons name="chatbubble" size={18} color={isAlreadyMatched ? C.success : '#fff'} />
            </Pressable>
          </View>
        </View>
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

// ── Lock screen ──

function LockScreen({ icon, title, body, cta, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; body: string; cta: string; onPress: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <SafeAreaView style={s.center}>
      <Ionicons name={icon} size={56} color="#fff" style={{ marginBottom: 4 }} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      <Pressable style={s.emptyBtnGradientWrap} onPress={onPress}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={s.emptyBtnGradientText}>{cta}</Text>
      </Pressable>
    </SafeAreaView>
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

// Docked tab, right edge, midway down — opens Swipe History. Rendered
// alongside both the card deck and its "you're caught up" empty state.
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
              const coach = swipe.coach_accounts;
              const date = new Date(swipe.created_at);
              const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
              return (
                <View key={swipe.id} style={s.row}>
                  {coach?.profile_photo_url ? (
                    <Image source={{ uri: coach.profile_photo_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, { backgroundColor: C.surfaceAlt }]} />
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{coach?.school_name ?? 'Unknown'}</Text>
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

// ── Styles ──

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { padding: 20, paddingBottom: 40 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 32, gap: 6 },

    scoreChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
      backgroundColor: C.surface, borderRadius: 100, paddingVertical: 6, paddingHorizontal: 12, paddingLeft: 6,
      marginBottom: 18,
    },
    scoreChipBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    scoreChipBadgeText: { fontFamily: FontFamily.monoBold, fontSize: 11, color: '#fff' },
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
    pickerTagText: { fontFamily: FontFamily.mono, fontSize: 9, letterSpacing: 0.5 },

    emptyIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    emptyTitle: { fontFamily: FontFamily.headline, fontSize: 22, color: C.text, textAlign: 'center', marginBottom: 4 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 18, maxWidth: 300 },
    emptyBtn: { backgroundColor: C.surfaceAlt, borderRadius: 100, paddingVertical: 13, paddingHorizontal: 26 },
    emptyBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    emptyBtnGradientWrap: { borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30, overflow: 'hidden' },
    emptyBtnGradientText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff' },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyCard: { width: '100%', maxWidth: 400, borderRadius: 28, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16, overflow: 'hidden' },
    emptyCardTitle: { fontFamily: FontFamily.headline, fontWeight: '900', fontSize: 22, color: '#fff', textAlign: 'center' },
    emptyCardBody: { fontFamily: FontFamily.body, fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 260 },
    emptyCardBtnRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 6 },
    emptyCardBtnWhite: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, backgroundColor: '#fff' },
    emptyCardBtnWhiteText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#111' },
    emptyCardBtnGhost: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    emptyCardBtnGhostText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    matchCelebration: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
    matchCelebrationTitle: { fontFamily: FontFamily.headline, fontSize: 34, color: '#fff', marginTop: 10 },
    matchCelebrationBody: { fontFamily: FontFamily.body, fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 10 },
    ncaaChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 100, paddingVertical: 9, paddingHorizontal: 16, maxWidth: 320, marginBottom: 10 },
    ncaaChipText: { flex: 1, fontFamily: FontFamily.bodyExtraBold, fontSize: 12, color: '#fff', lineHeight: 16 },
    matchCelebrationBtn: { backgroundColor: '#fff', borderRadius: 100, paddingVertical: 15, paddingHorizontal: 30 },
    matchCelebrationBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#0a0a0a' },
    matchCelebrationDismiss: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.7)' },

    // No padding/rounding here — the deck fills the whole device screen
    // (the drawer header is hidden while it's showing) instead of floating
    // as an inset card the way it used to.
    deckRoot: { flex: 1, backgroundColor: C.background },
    errorToast: { position: 'absolute', left: 20, right: 20, zIndex: 20, backgroundColor: 'rgba(220,38,38,0.95)', borderRadius: 12, padding: 14 },
    errorToastText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: '#fff', textAlign: 'center' },
    backChevron: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
    card: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
    cardScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,8,10,0.15)' },
    cardTop: { position: 'absolute', top: 0, left: 0, right: 0, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
    progressTrack: { flex: 1, height: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 100 },
    cardCounter: { fontFamily: FontFamily.mono, fontSize: 12, color: '#fff' },
    verifiedBadge: { position: 'absolute', left: 18, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(10,10,12,0.55)', borderRadius: 100, paddingVertical: 6, paddingHorizontal: 11 },
    verifiedBadgeText: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.success },
    cardBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 22, gap: 4 },
    cardDivision: { fontFamily: FontFamily.mono, fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
    cardSchool: { fontFamily: FontFamily.headline, fontSize: 28, color: '#fff' },
    cardCoach: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    posTag: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 11 },
    posTagText: { fontFamily: FontFamily.mono, fontSize: 10, color: '#fff', letterSpacing: 0.4 },
    minScoreTag: { backgroundColor: 'rgba(113,255,126,0.16)', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 11 },
    minScoreTagText: { fontFamily: FontFamily.monoBold, fontSize: 10, color: C.success, letterSpacing: 0.4 },
    cardBio: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, marginBottom: 14 },
    twitterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, alignSelf: 'flex-start' },
    twitterRowText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    viewProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 100, paddingVertical: 10, marginBottom: 14 },
    viewProfileBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 6 },
    passBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    likeBtnWrap: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    messageBtnCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    messageBtnCircleMatched: { backgroundColor: 'rgba(113,255,126,0.16)' },
  });
}
