import LoadingScreen from '../../components/LoadingScreen';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  useCoachInterested,
  levelForScore,
  abbreviatePosition,
  sortCandidates,
  recordInterestAction,
  logInterestCompliance,
  InterestedCandidate,
  InterestFilters,
  InterestSort,
  EMPTY_INTEREST_FILTERS,
} from '../../hooks/useCoachInterested';
import { GRADIENT, PINK_RED, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { starsForScore, POSITIONS, GRAD_YEARS, STATES } from '../../lib/recruitingLevels';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';

const SORTS: { key: InterestSort; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'v1', label: 'V1 Score' },
  { key: 'recent', label: 'Most Recent' },
];

interface ScoreBreakdown { physical: number; production: number; intangibles: number; academic: number; }
const BREAKDOWN_COLORS: Record<string, string> = { physical: '#ff6b35', production: '#f7931e', intangibles: '#a78bfa', academic: '#3b82f6' };

type FilterSheet = 'position' | 'class' | 'state' | null;

export default function CoachInterestedScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { session } = useAuth();
  const { coach, coachLoading, inRange, belowRange, loading, removeCandidate } = useCoachInterested();

  const [filters, setFilters] = useState<InterestFilters>(EMPTY_INTEREST_FILTERS);
  const [sortBy, setSortBy] = useState<InterestSort>('recommended');
  const [openSheet, setOpenSheet] = useState<FilterSheet>(null);
  const [showAllLevels, setShowAllLevels] = useState(false);
  const [view, setView] = useState<'list' | 'grid'>('list');

  const [actingId, setActingId] = useState<string | null>(null);
  const [matchNotif, setMatchNotif] = useState<{ name: string } | null>(null);
  const [errorNotif, setErrorNotif] = useState<string | null>(null);

  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const [modalLevel, setModalLevel] = useState<'quick' | 'full'>('quick');
  const [modalBreakdown, setModalBreakdown] = useState<ScoreBreakdown | null>(null);
  const [modalBreakdownLoading, setModalBreakdownLoading] = useState(false);

  useEffect(() => {
    if (!matchNotif) return;
    const t = setTimeout(() => setMatchNotif(null), 4000);
    return () => clearTimeout(t);
  }, [matchNotif]);
  useEffect(() => {
    if (!errorNotif) return;
    const t = setTimeout(() => setErrorNotif(null), 4000);
    return () => clearTimeout(t);
  }, [errorNotif]);

  const applyFilters = (list: InterestedCandidate[]) => list.filter(a =>
    (filters.positions.length === 0 || (a.position && filters.positions.includes(a.position))) &&
    (filters.gradYears.length === 0 || (a.graduation_year && filters.gradYears.includes(a.graduation_year))) &&
    (filters.states.length === 0 || (a.state && filters.states.includes(a.state)))
  );

  const visibleInRange = useMemo(() => sortCandidates(applyFilters(inRange), sortBy), [inRange, filters, sortBy]);
  const visibleBelowRange = useMemo(() => sortCandidates(applyFilters(belowRange), sortBy), [belowRange, filters, sortBy]);
  const displayed = showAllLevels ? visibleBelowRange : visibleInRange;
  const allCandidates = [...inRange, ...belowRange];
  const findCandidate = (id: string) => allCandidates.find(a => a.id === id);

  const toggleArrayFilter = (key: 'positions' | 'states', value: string) => {
    setFilters(prev => {
      const list = prev[key];
      const next = list.includes(value) ? list.filter(v => v !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  };
  const toggleGradYear = (year: number) => {
    setFilters(prev => {
      const next = prev.gradYears.includes(year) ? prev.gradYears.filter(y => y !== year) : [...prev.gradYears, year];
      return { ...prev, gradYears: next };
    });
  };
  const activeFilterChips = [
    ...filters.positions.map(p => ({ key: `pos-${p}`, label: p, clear: () => toggleArrayFilter('positions', p) })),
    ...filters.gradYears.map(y => ({ key: `yr-${y}`, label: `Class of ${y}`, clear: () => toggleGradYear(y) })),
    ...filters.states.map(st => ({ key: `st-${st}`, label: st, clear: () => toggleArrayFilter('states', st) })),
  ];

  const handleAction = async (athleteId: string, direction: 'like' | 'pass') => {
    if (actingId || !coach) return;
    setActingId(athleteId);
    const target = findCandidate(athleteId);
    await logInterestCompliance(coach.id, coach.division, coach.region, athleteId);
    const result = await recordInterestAction({
      athleteId, coachId: coach.id, direction, accessToken: session?.access_token,
    });
    if (!result.ok) {
      setErrorNotif("That didn't save. Check your connection and try again.");
      setActingId(null);
      return;
    }
    if (result.matched) setMatchNotif({ name: target?.full_name ?? 'Athlete' });
    removeCandidate(athleteId);
    if (quickViewId === athleteId) closeModal();
    setActingId(null);
  };

  const openQuickView = (id: string) => {
    setQuickViewId(id);
    setModalLevel('quick');
    setModalBreakdown(null);
  };
  const closeModal = () => {
    setQuickViewId(null);
    setModalLevel('quick');
    setModalBreakdown(null);
  };
  const viewFullProfile = async () => {
    if (!quickViewId) return;
    setModalLevel('full');
    if (modalBreakdown) return;
    setModalBreakdownLoading(true);
    const { data } = await supabase.from('assessments').select('score_breakdown').eq('athlete_id', quickViewId).single();
    if (data?.score_breakdown) {
      setModalBreakdown(data.score_breakdown as ScoreBreakdown);
    } else {
      const athlete = findCandidate(quickViewId);
      const score = athlete?.v1_score ?? 0;
      setModalBreakdown({
        physical: Math.round(score * 0.25),
        production: Math.round(score * 0.45),
        intangibles: Math.round(score * 0.15),
        academic: Math.round(score * 0.15),
      });
    }
    setModalBreakdownLoading(false);
  };

  if (coachLoading || (loading && coach)) return <LoadingScreen />;
  if (!coach) return null;

  if (!coach.verified) {
    return (
      <View style={s.container}>
        <EmptyState icon="shield" title="Verification Pending" body="Your coach account is being reviewed. You'll have full access once verified." />
      </View>
    );
  }

  const quickViewAthlete = quickViewId ? findCandidate(quickViewId) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.container}>
        {/* Header — title/subtitle left, live count right, matching web's header row */}
        <View style={s.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.eyebrow}>COACH PORTAL &middot; FIND TALENT</Text>
            <Text style={s.title}>Interested In You</Text>
            <Text style={s.subtitle}>Athletes who&rsquo;ve already liked your program, ranked by fit and how actively they&rsquo;re recruiting.</Text>
          </View>
          <Text style={s.countLabel}><Text style={{ color: C.text, fontFamily: FontFamily.bodyBold }}>{visibleInRange.length}</Text> interested</Text>
        </View>

        {/* Filters (left) + view toggle & sort (right) — one row, matching web's layout */}
        <View style={s.controlsRow}>
          <View style={s.filterRow}>
            <Pressable style={[s.filterPill, filters.positions.length > 0 && s.filterPillActive]} onPress={() => setOpenSheet('position')}>
              <Text style={[s.filterPillText, filters.positions.length > 0 && s.filterPillTextActive]}>
                Position {filters.positions.length > 0 ? `(${filters.positions.length})` : ''}
              </Text>
              <Ionicons name="chevron-down" size={12} color={filters.positions.length > 0 ? C.text : C.textDim} />
            </Pressable>
            <Pressable style={[s.filterPill, filters.gradYears.length > 0 && s.filterPillActive]} onPress={() => setOpenSheet('class')}>
              <Text style={[s.filterPillText, filters.gradYears.length > 0 && s.filterPillTextActive]}>
                Class {filters.gradYears.length > 0 ? `(${filters.gradYears.length})` : ''}
              </Text>
              <Ionicons name="chevron-down" size={12} color={filters.gradYears.length > 0 ? C.text : C.textDim} />
            </Pressable>
            <Pressable style={[s.filterPill, filters.states.length > 0 && s.filterPillActive]} onPress={() => setOpenSheet('state')}>
              <Text style={[s.filterPillText, filters.states.length > 0 && s.filterPillTextActive]}>
                State {filters.states.length > 0 ? `(${filters.states.length})` : ''}
              </Text>
              <Ionicons name="chevron-down" size={12} color={filters.states.length > 0 ? C.text : C.textDim} />
            </Pressable>
          </View>

          <View style={s.rightControls}>
            <View style={s.viewToggle}>
              <Pressable style={[s.viewBtn, view === 'list' && s.viewBtnActive]} onPress={() => setView('list')}>
                <Ionicons name="list" size={15} color={view === 'list' ? C.text : C.textDim} />
              </Pressable>
              <Pressable style={[s.viewBtn, view === 'grid' && s.viewBtnActive]} onPress={() => setView('grid')}>
                <Ionicons name="grid" size={14} color={view === 'grid' ? C.text : C.textDim} />
              </Pressable>
            </View>
            <Pressable
              style={s.sortBtn}
              onPress={() => setSortBy(prev => SORTS[(SORTS.findIndex(x => x.key === prev) + 1) % SORTS.length].key)}
            >
              <Ionicons name="swap-vertical" size={16} color={C.text} />
              <Text style={s.sortBtnText}>{SORTS.find(x => x.key === sortBy)?.label}</Text>
            </Pressable>
          </View>
        </View>

        {activeFilterChips.length > 0 && (
          <View style={s.chipRow}>
            {activeFilterChips.map(chip => (
              <View key={chip.key} style={s.chip}>
                <Text style={s.chipText}>{chip.label}</Text>
                <Pressable onPress={chip.clear} hitSlop={6}><Ionicons name="close" size={14} color={C.textDim} /></Pressable>
              </View>
            ))}
            <Pressable onPress={() => setFilters(EMPTY_INTEREST_FILTERS)}>
              <Text style={s.clearAll}>Clear all</Text>
            </Pressable>
          </View>
        )}

        {/* Results */}
        {allCandidates.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="No one has liked your program yet"
            body="Once athletes discover you, they'll show up here — ranked by fit and how actively they're recruiting."
            actionLabel="Search for prospects instead"
            onAction={() => router.push('/(coach)/search' as any)}
          />
        ) : displayed.length === 0 ? (
          <EmptyState icon="funnel-outline" title="No recruits match these filters" body="Try widening your search." />
        ) : view === 'list' ? (
          <View style={{ gap: 10 }}>
            {displayed.map((a, i) => {
              const level = levelForScore(a.v1_score);
              return (
                <Pressable key={a.id} onPress={() => openQuickView(a.id)}>
                  <Card style={s.row}>
                    <View style={s.rowTop}>
                      <Text style={s.rank}>{i + 1}</Text>
                      <Avatar uri={a.profile_photo_url} name={a.full_name} size={44} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={s.nameLine}>
                          <Text style={s.name} numberOfLines={1}>{a.full_name ?? 'Unknown'}</Text>
                          {abbreviatePosition(a.position) ? <View style={s.miniBadge}><Text style={s.miniBadgeText}>{abbreviatePosition(a.position)}</Text></View> : null}
                          <View style={[s.miniBadge, { backgroundColor: `${level.color ?? PINK_RED}22` }]}>
                            <Text style={[s.miniBadgeText, { color: level.color ?? PINK_RED }]}>{level.label}</Text>
                          </View>
                        </View>
                        <Text style={s.meta}>{a.graduation_year ? `Class of ${a.graduation_year}` : ''}{a.graduation_year && a.state ? ' · ' : ''}{a.state ?? ''}</Text>
                        <View style={s.starRow}>
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Ionicons key={si} name={si < starsForScore(a.v1_score) ? 'star' : 'star-outline'} size={11} color="#f6ba00" />
                          ))}
                          {a.v1_score != null && <Text style={s.starScoreText}>{a.v1_score} V1</Text>}
                        </View>
                      </View>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={s.scoreNum}>{a.v1_score ?? '—'}</Text>
                        <Text style={s.scoreLabel}>V1</Text>
                      </View>
                    </View>

                    <View style={s.rowBottom}>
                      {a.likesLast14d > 0 ? (
                        <View style={s.intentChip}>
                          <Ionicons name="flash" size={12} color="#edff00" />
                          <Text style={s.intentText}>{a.likesLast14d} like{a.likesLast14d === 1 ? '' : 's'} / 14d</Text>
                        </View>
                      ) : (
                        <Text style={s.intentCold}>Only liked you</Text>
                      )}
                      <View style={{ flex: 1 }} />
                      <Pressable
                        disabled={actingId === a.id}
                        onPress={() => handleAction(a.id, 'pass')}
                        style={[s.actBtn, { backgroundColor: '#fff' }]}
                      >
                        <Ionicons name="close" size={16} color="#000" />
                      </Pressable>
                      <Pressable disabled={actingId === a.id} onPress={() => handleAction(a.id, 'like')} style={s.actBtnMatch}>
                        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </Pressable>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={s.gridWrap}>
            {displayed.map((a, i) => {
              const level = levelForScore(a.v1_score);
              return (
                <Pressable key={a.id} onPress={() => openQuickView(a.id)} style={s.gridCardWrap}>
                  <Card style={s.gridCard}>
                    <View style={s.gridTop}>
                      <Avatar uri={a.profile_photo_url} name={a.full_name} size={44} />
                      <Text style={s.rank}>{i + 1}</Text>
                    </View>
                    <Text style={s.name} numberOfLines={1}>{a.full_name ?? 'Unknown'}</Text>
                    <View style={[s.nameLine, { marginTop: 3 }]}>
                      {abbreviatePosition(a.position) ? <View style={s.miniBadge}><Text style={s.miniBadgeText}>{abbreviatePosition(a.position)}</Text></View> : null}
                      <View style={[s.miniBadge, { backgroundColor: `${level.color ?? PINK_RED}22` }]}>
                        <Text style={[s.miniBadgeText, { color: level.color ?? PINK_RED }]}>{level.label}</Text>
                      </View>
                    </View>
                    <Text style={s.meta}>{a.graduation_year ? `Class of ${a.graduation_year}` : ''}{a.graduation_year && a.state ? ' · ' : ''}{a.state ?? ''}</Text>
                    <View style={s.starRow}>
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Ionicons key={si} name={si < starsForScore(a.v1_score) ? 'star' : 'star-outline'} size={11} color="#f6ba00" />
                      ))}
                      {a.v1_score != null && <Text style={s.starScoreText}>{a.v1_score} V1</Text>}
                    </View>
                    {a.likesLast14d > 0 ? (
                      <View style={[s.intentChip, { marginTop: 8 }]}>
                        <Ionicons name="flash" size={12} color="#edff00" />
                        <Text style={s.intentText}>{a.likesLast14d} / 14d</Text>
                      </View>
                    ) : (
                      <Text style={[s.intentCold, { marginTop: 8 }]}>Only liked you</Text>
                    )}
                    <View style={s.gridBottom}>
                      <View>
                        <Text style={s.scoreNum}>{a.v1_score ?? '—'}</Text>
                        <Text style={s.scoreLabel}>V1</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Pressable disabled={actingId === a.id} onPress={() => handleAction(a.id, 'pass')} style={[s.actBtn, { backgroundColor: '#fff' }]}>
                          <Ionicons name="close" size={15} color="#000" />
                        </Pressable>
                        <Pressable disabled={actingId === a.id} onPress={() => handleAction(a.id, 'like')} style={s.actBtnMatch}>
                          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                          <Ionicons name="checkmark" size={15} color="#fff" />
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}

        {!showAllLevels && visibleBelowRange.length > 0 && (
          <Pressable style={s.belowToggle} onPress={() => setShowAllLevels(true)}>
            <Text style={s.belowToggleText}>Show {visibleBelowRange.length} more outside your target range</Text>
          </Pressable>
        )}
        {showAllLevels && (
          <Pressable style={{ alignSelf: 'center', marginTop: 14 }} onPress={() => setShowAllLevels(false)}>
            <Text style={s.backToRange}>Back to your target range</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Toasts */}
      {matchNotif && (
        <View style={s.toastWrap} pointerEvents="none">
          <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.toast}>
            <Text style={s.toastText}>Matched with {matchNotif.name}.</Text>
          </LinearGradient>
        </View>
      )}
      {errorNotif && (
        <View style={s.toastWrap} pointerEvents="none">
          <View style={[s.toast, { backgroundColor: C.surfaceAlt }]}>
            <Text style={[s.toastText, { color: C.text }]}>{errorNotif}</Text>
          </View>
        </View>
      )}

      {/* Filter sheets */}
      <BottomSheetModal visible={openSheet === 'position'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>Position</Text>
        <View style={s.sheetChipWrap}>
          {POSITIONS.map(pos => (
            <Pressable key={pos} style={[s.sheetChip, filters.positions.includes(pos) && s.sheetChipActive]} onPress={() => toggleArrayFilter('positions', pos)}>
              <Text style={[s.sheetChipText, filters.positions.includes(pos) && s.sheetChipTextActive]}>{pos}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}><Text style={s.sheetDoneBtnText}>Done</Text></Pressable>
      </BottomSheetModal>

      <BottomSheetModal visible={openSheet === 'class'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>Class Year</Text>
        <View style={s.sheetChipWrap}>
          {GRAD_YEARS.map(year => (
            <Pressable key={year} style={[s.sheetChip, filters.gradYears.includes(year) && s.sheetChipActive]} onPress={() => toggleGradYear(year)}>
              <Text style={[s.sheetChipText, filters.gradYears.includes(year) && s.sheetChipTextActive]}>{year}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}><Text style={s.sheetDoneBtnText}>Done</Text></Pressable>
      </BottomSheetModal>

      <BottomSheetModal visible={openSheet === 'state'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>State</Text>
        <ScrollView style={{ maxHeight: 360, alignSelf: 'stretch' }}>
          <View style={s.sheetChipWrap}>
            {STATES.map(({ code, name }) => (
              <Pressable key={code} style={[s.sheetChip, filters.states.includes(code) && s.sheetChipActive]} onPress={() => toggleArrayFilter('states', code)}>
                <Text style={[s.sheetChipText, filters.states.includes(code) && s.sheetChipTextActive]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}><Text style={s.sheetDoneBtnText}>Done</Text></Pressable>
      </BottomSheetModal>

      {/* Quick View / Full View */}
      <BottomSheetModal visible={!!quickViewAthlete} onClose={closeModal}>
        {quickViewAthlete && (() => {
          const level = levelForScore(quickViewAthlete.v1_score);
          return (
            <ScrollView style={{ alignSelf: 'stretch' }} contentContainerStyle={{ paddingBottom: 8 }}>
              <View style={s.modalHead}>
                <Avatar uri={quickViewAthlete.profile_photo_url} name={quickViewAthlete.full_name} size={56} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={s.nameLine}>
                    <Text style={s.modalName} numberOfLines={1}>{quickViewAthlete.full_name ?? 'Unknown'}</Text>
                    <View style={[s.miniBadge, { backgroundColor: `${level.color ?? PINK_RED}22` }]}>
                      <Text style={[s.miniBadgeText, { color: level.color ?? PINK_RED }]}>{level.label}</Text>
                    </View>
                  </View>
                  <Text style={s.meta}>
                    {[abbreviatePosition(quickViewAthlete.position), quickViewAthlete.graduation_year ? `Class of ${quickViewAthlete.graduation_year}` : null, [quickViewAthlete.high_school, quickViewAthlete.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>

              <View style={s.modalScoreRow}>
                <View>
                  <Text style={s.modalScoreNum}>{quickViewAthlete.v1_score ?? '—'}</Text>
                  <Text style={s.modalScoreLabel}>V1 SCORE</Text>
                </View>
                {modalLevel === 'quick' ? (
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={s.starRow}>
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Ionicons key={si} name={si < starsForScore(quickViewAthlete.v1_score) ? 'star' : 'star-outline'} size={13} color="#f6ba00" />
                      ))}
                      {quickViewAthlete.v1_score != null && <Text style={s.starScoreText}>{quickViewAthlete.v1_score} V1</Text>}
                    </View>
                    {quickViewAthlete.likesLast14d > 0 ? (
                      <View style={s.intentChip}>
                        <Ionicons name="flash" size={12} color="#edff00" />
                        <Text style={s.intentText}>{quickViewAthlete.likesLast14d} like{quickViewAthlete.likesLast14d === 1 ? '' : 's'} / 14d</Text>
                      </View>
                    ) : (
                      <Text style={s.intentCold}>Only liked you</Text>
                    )}
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    {modalBreakdownLoading ? (
                      <Text style={{ fontFamily: FontFamily.body, fontSize: 12, color: C.textDim }}>Loading breakdown…</Text>
                    ) : modalBreakdown && (['physical', 'production', 'intangibles', 'academic'] as const).map(key => {
                      const val = modalBreakdown[key];
                      const pct = quickViewAthlete.v1_score ? Math.min(100, Math.round((val / quickViewAthlete.v1_score) * 100)) : 0;
                      return (
                        <View key={key} style={s.breakdownRow}>
                          <Text style={s.breakdownName}>{key}</Text>
                          <View style={s.breakdownTrack}><View style={[s.breakdownFill, { width: `${pct}%`, backgroundColor: BREAKDOWN_COLORS[key] }]} /></View>
                          <Text style={s.breakdownVal}>{val}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {modalLevel === 'quick' ? (
                <>
                  <View style={s.statGrid}>
                    <View style={s.statBox}><Text style={s.statLabel}>Height</Text><Text style={s.statValue}>{quickViewAthlete.height ?? '—'}</Text></View>
                    <View style={s.statBox}><Text style={s.statLabel}>Weight</Text><Text style={s.statValue}>{quickViewAthlete.weight ? `${quickViewAthlete.weight} lbs` : '—'}</Text></View>
                    <View style={s.statBox}><Text style={s.statLabel}>State</Text><Text style={s.statValue}>{quickViewAthlete.state ?? '—'}</Text></View>
                  </View>
                  {quickViewAthlete.bio ? <Text style={s.bio}>{quickViewAthlete.bio}</Text> : null}
                </>
              ) : (
                <>
                  {quickViewAthlete.bio ? <Text style={s.bio}>{quickViewAthlete.bio}</Text> : null}
                  <View style={s.statGrid2}>
                    <View style={s.statBox}><Text style={s.statLabel}>Height / Weight</Text><Text style={s.statValue}>{quickViewAthlete.height ?? '—'} · {quickViewAthlete.weight ? `${quickViewAthlete.weight} lbs` : '—'}</Text></View>
                    <View style={s.statBox}><Text style={s.statLabel}>GPA</Text><Text style={s.statValue}>{quickViewAthlete.gpa ?? '—'}</Text></View>
                    <View style={s.statBox}><Text style={s.statLabel}>High School</Text><Text style={s.statValue}>{quickViewAthlete.high_school ?? '—'}</Text></View>
                    <View style={s.statBox}><Text style={s.statLabel}>Location</Text><Text style={s.statValue}>{[quickViewAthlete.city, quickViewAthlete.state].filter(Boolean).join(', ') || '—'}</Text></View>
                  </View>
                  {quickViewAthlete.hudl_link ? (
                    <Pressable style={s.filmBtn} onPress={() => { /* open link */ }}>
                      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                      <Text style={s.filmBtnText}>Film (Hudl) · Watch game film →</Text>
                    </Pressable>
                  ) : null}
                </>
              )}

              <View style={s.modalFoot}>
                <Pressable style={s.fullToggleBtn} onPress={() => modalLevel === 'quick' ? viewFullProfile() : setModalLevel('quick')}>
                  <Text style={s.fullToggleText}>{modalLevel === 'quick' ? 'View Full Profile' : 'Back to Quick View'}</Text>
                </Pressable>
                <Pressable disabled={actingId === quickViewAthlete.id} style={s.modalPassBtn} onPress={() => handleAction(quickViewAthlete.id, 'pass')}>
                  <Text style={s.modalPassText}>Pass</Text>
                </Pressable>
                <Pressable disabled={actingId === quickViewAthlete.id} style={s.modalMatchBtn} onPress={() => handleAction(quickViewAthlete.id, 'like')}>
                  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <Text style={s.modalMatchText}>Match</Text>
                </Pressable>
              </View>
            </ScrollView>
          );
        })()}
      </BottomSheetModal>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: C.textDim, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 26, fontWeight: '900', color: C.text },
    subtitle: { fontFamily: FontFamily.body, fontSize: 12.5, color: C.textMuted, marginTop: 6, lineHeight: 18 },
    countLabel: { fontFamily: FontFamily.body, fontSize: 12.5, color: C.textMuted, flexShrink: 0 },

    controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8, marginBottom: 12 },
    rightControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
    sortBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    viewToggle: { flexDirection: 'row', gap: 2, padding: 3, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    viewBtn: { width: 30, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    viewBtnActive: { backgroundColor: C.surfaceAlt },

    filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
    filterPillActive: { backgroundColor: PINK_RED + '20', borderColor: PINK_RED },
    filterPillText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
    filterPillTextActive: { color: C.text, fontWeight: '600' },

    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
    chipText: { fontFamily: FontFamily.body, fontSize: 12, color: C.text },
    clearAll: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, textDecorationLine: 'underline' },

    row: { gap: 12 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rank: { width: 16, fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, textAlign: 'center' },
    nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14.5, color: C.text, flexShrink: 1 },
    starScoreText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.textMuted, marginLeft: 4 },

    gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridCardWrap: { width: '48%' },
    gridCard: { gap: 4 },
    gridTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    gridBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    miniBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, backgroundColor: C.surfaceAlt },
    miniBadgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 10, color: C.textMuted },
    meta: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    starRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
    scoreNum: { fontFamily: FontFamily.headline, fontSize: 18, fontWeight: '900', color: '#fff' },
    scoreLabel: { fontFamily: FontFamily.mono, fontSize: 8, color: C.textDim, letterSpacing: 0.5 },

    rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
    intentChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    intentText: { fontFamily: FontFamily.bodyBold, fontSize: 11.5, color: '#edff00' },
    intentCold: { fontFamily: FontFamily.bodyBold, fontSize: 11.5, color: C.textDim },
    actBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border2 },
    actBtnMatch: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

    belowToggle: { marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: C.border2, alignItems: 'center' },
    belowToggleText: { fontFamily: FontFamily.bodyBold, fontSize: 12.5, color: C.textMuted },
    backToRange: { fontFamily: FontFamily.body, fontSize: 12.5, color: C.textDim, textDecorationLine: 'underline' },

    toastWrap: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
    toast: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 100 },
    toastText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },

    sheetTitle: { fontFamily: FontFamily.headlineBold, fontSize: 18, color: C.text, marginBottom: 4 },
    sheetChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
    sheetChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
    sheetChipActive: { backgroundColor: PINK_RED, borderColor: PINK_RED },
    sheetChipText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textMuted },
    sheetChipTextActive: { color: '#fff' },
    sheetDoneBtn: { backgroundColor: PINK_RED, borderRadius: 100, paddingVertical: 12, paddingHorizontal: 40, marginTop: 20, alignSelf: 'stretch', alignItems: 'center' },
    sheetDoneBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },

    modalHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18, alignSelf: 'stretch' },
    modalName: { fontFamily: FontFamily.headlineBold, fontSize: 17, color: C.text },
    modalScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 16, marginBottom: 16, alignSelf: 'stretch' },
    modalScoreNum: { fontFamily: FontFamily.mono, fontSize: 30, fontWeight: '700', color: '#fff' },
    modalScoreLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: C.textDim, marginTop: 2, letterSpacing: 0.5 },

    breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
    breakdownName: { width: 72, fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, textTransform: 'capitalize' },
    breakdownTrack: { flex: 1, height: 6, borderRadius: 4, backgroundColor: C.surface, overflow: 'hidden' },
    breakdownFill: { height: '100%', borderRadius: 4 },
    breakdownVal: { width: 20, textAlign: 'right', fontFamily: FontFamily.mono, fontSize: 10.5, color: C.textMuted },

    statGrid: { flexDirection: 'row', gap: 8, marginBottom: 14, alignSelf: 'stretch' },
    statGrid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignSelf: 'stretch' },
    statBox: { flex: 1, minWidth: '45%', backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 10 },
    statLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    statValue: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    bio: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 14, alignSelf: 'stretch' },

    filmBtn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, marginBottom: 6, alignSelf: 'stretch', overflow: 'hidden' },
    filmBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12.5, color: '#fff' },

    modalFoot: { flexDirection: 'row', gap: 10, marginTop: 10, alignSelf: 'stretch' },
    fullToggleBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border2 },
    fullToggleText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textMuted },
    modalPassBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: C.border2 },
    modalPassText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 12, color: '#000' },
    modalMatchBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', overflow: 'hidden' },
    modalMatchText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 12, color: '#fff' },
  });
}
