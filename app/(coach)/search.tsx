import LoadingScreen from '../../components/LoadingScreen';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { GRADIENT, FLAME_GRADIENT, SIGNAL_GRADIENT, ThemeColors, PINK_RED } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { starsForScore, POSITIONS, GRAD_YEARS, STATES, RECRUITING_LEVEL_BANDS, RecruitingLevelBand, getRecruitingLevelBand } from '../../lib/recruitingLevels';
import { getBandFloorForDivision, Division } from '../../constants/RecruitingLevels';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { ScoreRing } from '../../components/ui/ScoreRing';
import { GradientCheck } from '../../components/ui/GradientCheck';

interface Prospect {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
  position: string | null;
  state: string | null;
  city: string | null;
  v1_score: number | null;
  graduation_year: number | null;
  height: string | null;
  weight: string | number | null;
  profile_slug: string | null;
}

interface Filters {
  positions: string[];
  gradYears: number[];
  states: string[];
  minScore: number;
  verifiedOnly: boolean;
}

const EMPTY_FILTERS: Filters = { positions: [], gradYears: [], states: [], minScore: 0, verifiedOnly: false };
const PAGE_SIZE = 24;
const MIN_SCORE_OPTIONS = [0, 50, 60, 70, 80, 90];
type FilterSheet = 'position' | 'class' | 'state' | 'more' | null;

export default function CoachSearchScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();

  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState<'score' | 'class'>('score');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [messagedCount, setMessagedCount] = useState(0);
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [openSheet, setOpenSheet] = useState<FilterSheet>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showLevelModal, setShowLevelModal] = useState(false);
  const [chosenLevelKey, setChosenLevelKey] = useState<string | null>(null);
  const [myRangeFloor, setMyRangeFloor] = useState(0);
  const [levelModalOffered, setLevelModalOffered] = useState(false);

  // Ask which level to view, rather than silently pre-filtering -- matches
  // the old swipe deck's "Choose Your Level" step so a coach always knows
  // which pool they're browsing. Their own floor is pre-highlighted as
  // "Your Range." Offered once per screen mount, not on every focus.
  useEffect(() => {
    if (!coach || levelModalOffered) return;
    const floor = coach.min_score ?? (coach.division ? getBandFloorForDivision(coach.division as Division) : 0) ?? 0;
    setMyRangeFloor(floor);
    setShowLevelModal(true);
    setLevelModalOffered(true);
  }, [coach, levelModalOffered]);

  const chosenLevel = RECRUITING_LEVEL_BANDS.find(b => b.key === chosenLevelKey) ?? null;
  const myRangeBand = getRecruitingLevelBand(myRangeFloor);

  const chooseLevel = (band: RecruitingLevelBand) => {
    setChosenLevelKey(band.key);
    setFilters(prev => ({ ...prev, minScore: band.minScore }));
    setShowLevelModal(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (coach?.id && coach?.verified) {
        loadInitialData();
      }
    }, [coach?.id, coach?.verified])
  );

  const loadInitialData = async () => {
    if (!coach?.id) return;
    try {
      const [savedRes, msgRes] = await Promise.all([
        supabase.from('coach_saved_prospects').select('athlete_id').eq('coach_id', coach.id),
        supabase.from('coach_athlete_conversations').select('id', { count: 'exact', head: true }).eq('coach_id', coach.id),
      ]);
      setSavedIds(new Set((savedRes.data ?? []).map(r => r.athlete_id)));
      setMessagedCount(msgRes.count ?? 0);
    } catch (e) {
      console.error('Load initial data error:', e);
    }
  };

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('athletes').select('id, full_name, profile_photo_url, position, state, city, v1_score, graduation_year, height, weight, profile_slug');

      const term = searchText.trim();
      if (term) q = q.ilike('full_name', `%${term}%`);
      if (filters.positions.length) q = q.in('position', filters.positions);
      if (filters.gradYears.length) q = q.in('graduation_year', filters.gradYears);
      if (filters.states.length) q = q.in('state', filters.states);
      if (filters.minScore > 0) q = q.gte('v1_score', filters.minScore);
      if (filters.verifiedOnly) q = q.not('v1_score', 'is', null);

      if (sortBy === 'class') {
        q = q.order('graduation_year', { ascending: true });
      } else {
        q = q.order('v1_score', { ascending: false, nullsFirst: false });
      }

      const [dataRes, countRes] = await Promise.all([
        q.limit(limit),
        supabase.from('athletes').select('id', { count: 'exact', head: true }).then(res => res),
      ]);

      setProspects((dataRes.data ?? []) as Prospect[]);
      setTotalCount(countRes.count ?? 0);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, [searchText, filters, sortBy, limit]);

  useEffect(() => {
    const timer = setTimeout(runSearch, 250);
    return () => clearTimeout(timer);
  }, [runSearch]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [searchText, filters, sortBy]);

  const toggleSaved = async (athleteId: string) => {
    if (!coach?.id) return;
    try {
      if (savedIds.has(athleteId)) {
        await supabase.from('coach_saved_prospects').delete().eq('coach_id', coach.id).eq('athlete_id', athleteId);
        setSavedIds(prev => { const next = new Set(prev); next.delete(athleteId); return next; });
      } else {
        await supabase.from('coach_saved_prospects').insert({ coach_id: coach.id, athlete_id: athleteId });
        setSavedIds(prev => new Set(prev).add(athleteId));
      }
    } catch (e) {
      console.error('Save toggle error:', e);
    }
  };

  const messageAthlete = async (athleteId: string) => {
    if (!coach?.id) return;
    setPendingAthleteId(athleteId);
    try {
      const existing = await supabase.from('coach_athlete_conversations').select('id').eq('coach_id', coach.id).eq('athlete_id', athleteId).single();
      if (existing.data) {
        router.push(`/(coach)/messages/${existing.data.id}` as any);
        return;
      }

      const created = await supabase.from('coach_athlete_conversations').insert({ coach_id: coach.id, athlete_id: athleteId }).select();
      if (created.data?.[0]) {
        setMessagedCount(c => c + 1);
        router.push(`/(coach)/messages/${created.data[0].id}` as any);
      }
    } catch (e) {
      console.error('Message error:', e);
    } finally {
      setPendingAthleteId(null);
    }
  };

  const toggleSelected = (athleteId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId); else next.add(athleteId);
      return next;
    });
  };

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

  if (coachLoading || !coach) {
    return <LoadingScreen />;
  }

  if (!coach.verified) {
    return (
      <View style={s.container}>
        <EmptyState
          icon="shield"
          title="Verification Pending"
          body="Your coach account is being reviewed. You'll have full access once verified."
        />
      </View>
    );
  }

  if (loading) return <LoadingScreen />;

  const activeFilterChips = [
    ...filters.positions.map(p => ({ key: `pos-${p}`, label: p, clear: () => toggleArrayFilter('positions', p) })),
    ...filters.gradYears.map(y => ({ key: `yr-${y}`, label: `Class of ${y}`, clear: () => toggleGradYear(y) })),
    ...filters.states.map(st => ({ key: `st-${st}`, label: st, clear: () => toggleArrayFilter('states', st) })),
    ...(filters.minScore > 0 ? [{ key: 'min', label: `V1 ${filters.minScore}+`, clear: () => setFilters(prev => ({ ...prev, minScore: 0 })) }] : []),
    ...(filters.verifiedOnly ? [{ key: 'ver', label: 'Verified', clear: () => setFilters(prev => ({ ...prev, verifiedOnly: false })) }] : []),
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>FIND TALENT</Text>
          <Text style={s.title}>Recruit Search</Text>
        </View>
        <View style={s.stats}>
          <View style={s.statItem}>
            <Ionicons name="bookmark" size={14} color={PINK_RED} />
            <Text style={s.statValue}>{savedIds.size}</Text>
            <Text style={s.statLabel}>Saved</Text>
          </View>
          <View style={s.statItem}>
            <Ionicons name="chatbubble" size={14} color={PINK_RED} />
            <Text style={s.statValue}>{messagedCount}</Text>
            <Text style={s.statLabel}>Messaged</Text>
          </View>
        </View>
      </View>

      {/* Level indicator */}
      {chosenLevel && (
        <Pressable style={s.levelPill} onPress={() => setShowLevelModal(true)}>
          <Text style={s.levelPillLabel}>Viewing: <Text style={s.levelPillValue}>{chosenLevel.level}</Text></Text>
          <View style={s.levelPillChange}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={s.levelPillChangeText}>Change</Text>
          </View>
        </Pressable>
      )}

      {/* Search + Sort + View */}
      <View style={s.searchRow}>
        <View style={s.searchInput}>
          <Ionicons name="search" size={16} color={C.textDim} />
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={C.textDim}
            value={searchText}
            onChangeText={setSearchText}
            style={s.input}
          />
        </View>
        <View style={s.viewToggle}>
          <Pressable style={[s.viewBtn, view === 'grid' && s.viewBtnActive]} onPress={() => setView('grid')}>
            <Ionicons name="grid" size={14} color={view === 'grid' ? C.text : C.textDim} />
          </Pressable>
          <Pressable style={[s.viewBtn, view === 'list' && s.viewBtnActive]} onPress={() => setView('list')}>
            <Ionicons name="list" size={15} color={view === 'list' ? C.text : C.textDim} />
          </Pressable>
        </View>
        <Pressable style={s.sortBtn} onPress={() => setSortBy(sortBy === 'score' ? 'class' : 'score')}>
          <Ionicons name="swap-vertical" size={16} color={C.text} />
          <Text style={s.sortBtnText}>{sortBy === 'score' ? 'Score' : 'Class'}</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <View style={s.filterRow}>
        <Pressable
          style={[s.filterPill, filters.positions.length > 0 && s.filterPillActive]}
          onPress={() => setOpenSheet('position')}
        >
          <Text style={[s.filterPillText, filters.positions.length > 0 && s.filterPillTextActive]}>
            Position {filters.positions.length > 0 ? `(${filters.positions.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filters.positions.length > 0 ? C.text : C.textDim} />
        </Pressable>

        <Pressable
          style={[s.filterPill, filters.gradYears.length > 0 && s.filterPillActive]}
          onPress={() => setOpenSheet('class')}
        >
          <Text style={[s.filterPillText, filters.gradYears.length > 0 && s.filterPillTextActive]}>
            Class {filters.gradYears.length > 0 ? `(${filters.gradYears.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filters.gradYears.length > 0 ? C.text : C.textDim} />
        </Pressable>

        <Pressable
          style={[s.filterPill, filters.states.length > 0 && s.filterPillActive]}
          onPress={() => setOpenSheet('state')}
        >
          <Text style={[s.filterPillText, filters.states.length > 0 && s.filterPillTextActive]}>
            State {filters.states.length > 0 ? `(${filters.states.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filters.states.length > 0 ? C.text : C.textDim} />
        </Pressable>

        <Pressable
          style={[s.filterPill, (filters.minScore > 0 || filters.verifiedOnly) && s.filterPillActive]}
          onPress={() => setOpenSheet('more')}
        >
          <Ionicons name="options" size={12} color={(filters.minScore > 0 || filters.verifiedOnly) ? C.text : C.textDim} />
          <Text style={[s.filterPillText, (filters.minScore > 0 || filters.verifiedOnly) && s.filterPillTextActive]}>More</Text>
        </Pressable>
      </View>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <View style={s.chipRow}>
          {activeFilterChips.map(chip => (
            <View key={chip.key} style={s.chip}>
              <Text style={s.chipText}>{chip.label}</Text>
              <Pressable onPress={chip.clear} hitSlop={6}>
                <Ionicons name="close" size={14} color={C.textDim} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={() => setFilters(EMPTY_FILTERS)}>
            <Text style={s.clearAll}>Clear all</Text>
          </Pressable>
        </View>
      )}

      <Text style={s.resultsMeta}><Text style={{ color: C.text, fontFamily: FontFamily.bodyBold }}>{totalCount}</Text> recruit{totalCount === 1 ? '' : 's'} match your search</Text>

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <View style={s.bulkBar}>
          <Text style={s.bulkLabel}>{selected.size} recruit{selected.size === 1 ? '' : 's'} selected</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable style={s.bulkClearBtn} onPress={() => setSelected(new Set())}>
              <Text style={s.bulkClearText}>Clear</Text>
            </Pressable>
            <Pressable
              style={s.bulkMessageBtn}
              onPress={() => router.push(`/(coach)/bulk-message?selected=${Array.from(selected).join(',')}` as any)}
            >
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Text style={s.bulkMessageText}>Message {selected.size}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Results */}
      {prospects.length === 0 ? (
        <EmptyState icon="search" title="No prospects found" body="Try adjusting your filters or search terms." />
      ) : view === 'grid' ? (
        <View style={s.resultGrid}>
          {prospects.map(prospect => {
            const isSelected = selected.has(prospect.id);
            const isSaved = savedIds.has(prospect.id);
            const verified = prospect.v1_score != null;
            return (
              <Card key={prospect.id} style={[s.prospectCard, isSelected && s.prospectCardSelected]}>
                <Pressable disabled={!prospect.profile_slug} onPress={() => prospect.profile_slug && router.push(`/(coach)/athlete/${prospect.profile_slug}` as any)}>
                  <View style={s.cardTopRow}>
                    <Avatar uri={prospect.profile_photo_url} name={prospect.full_name} size={48} />
                    <Pressable hitSlop={8} onPress={() => toggleSelected(prospect.id)} style={s.checkbox}>
                      <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={19} color={isSelected ? PINK_RED : C.textDim} />
                    </Pressable>
                  </View>

                  <View style={s.nameRow}>
                    <Text style={s.prospectName} numberOfLines={1}>{prospect.full_name || 'Unknown'}</Text>
                    {verified && <GradientCheck id={`gc-grid-${prospect.id}`} />}
                  </View>
                  <Text style={s.prospectMeta} numberOfLines={1}>
                    {[prospect.position, prospect.height, prospect.weight ? `${prospect.weight} lbs` : null, prospect.graduation_year ? `Class of ${prospect.graduation_year}` : null].filter(Boolean).join(' · ')}
                  </Text>
                  {(prospect.city || prospect.state) && (
                    <Text style={s.prospectLoc} numberOfLines={1}>{[prospect.city, prospect.state].filter(Boolean).join(', ')}</Text>
                  )}
                  <View style={s.starRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < starsForScore(prospect.v1_score) ? 'star' : 'star-outline'} size={11} color="#f6ba00" />
                    ))}
                  </View>
                </Pressable>

                <View style={s.cardBottomRow}>
                  <ScoreRing score={prospect.v1_score} size={48} />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[s.iconBtn, isSaved && s.iconBtnSaved]} onPress={() => toggleSaved(prospect.id)}>
                      <Ionicons name={isSaved ? 'checkmark' : 'add'} size={18} color={isSaved ? '#f6ba00' : '#fff'} />
                    </Pressable>
                    <Pressable
                      style={s.iconBtn}
                      disabled={pendingAthleteId === prospect.id}
                      onPress={() => messageAthlete(prospect.id)}
                    >
                      <Ionicons name="chatbubble-outline" size={15} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {prospects.map(prospect => {
            const isSelected = selected.has(prospect.id);
            const isSaved = savedIds.has(prospect.id);
            const verified = prospect.v1_score != null;
            return (
              <Card key={prospect.id} style={[s.listRow, isSelected && s.prospectCardSelected]}>
                <Pressable hitSlop={8} onPress={() => toggleSelected(prospect.id)}>
                  <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={19} color={isSelected ? PINK_RED : C.textDim} />
                </Pressable>
                <Pressable style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }} disabled={!prospect.profile_slug} onPress={() => prospect.profile_slug && router.push(`/(coach)/athlete/${prospect.profile_slug}` as any)}>
                  <Avatar uri={prospect.profile_photo_url} name={prospect.full_name} size={44} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={s.nameRow}>
                      <Text style={s.prospectName} numberOfLines={1}>{prospect.full_name || 'Unknown'}</Text>
                      {verified && <GradientCheck id={`gc-list-${prospect.id}`} />}
                    </View>
                    <Text style={s.prospectMeta} numberOfLines={1}>
                      {[prospect.position, prospect.graduation_year ? `Class of ${prospect.graduation_year}` : null, prospect.state].filter(Boolean).join(' · ')}
                    </Text>
                    <View style={s.starRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name={i < starsForScore(prospect.v1_score) ? 'star' : 'star-outline'} size={11} color="#f6ba00" />
                      ))}
                    </View>
                  </View>
                </Pressable>
                <ScoreRing score={prospect.v1_score} size={42} />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable style={[s.iconBtn, isSaved && s.iconBtnSaved]} onPress={() => toggleSaved(prospect.id)}>
                    <Ionicons name={isSaved ? 'checkmark' : 'add'} size={18} color={isSaved ? '#f6ba00' : '#fff'} />
                  </Pressable>
                  <Pressable style={s.iconBtn} disabled={pendingAthleteId === prospect.id} onPress={() => messageAthlete(prospect.id)}>
                    <Ionicons name="chatbubble-outline" size={15} color="#fff" />
                  </Pressable>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {/* Load more */}
      {prospects.length < totalCount && (
        <Pressable style={s.loadMoreBtn} onPress={() => setLimit(l => l + PAGE_SIZE)}>
          <Text style={s.loadMoreText}>Load more</Text>
        </Pressable>
      )}

      <BottomSheetModal visible={openSheet === 'position'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>Position</Text>
        <View style={s.sheetChipWrap}>
          {POSITIONS.map(pos => (
            <Pressable
              key={pos}
              style={[s.sheetChip, filters.positions.includes(pos) && s.sheetChipActive]}
              onPress={() => toggleArrayFilter('positions', pos)}
            >
              <Text style={[s.sheetChipText, filters.positions.includes(pos) && s.sheetChipTextActive]}>{pos}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}>
          <Text style={s.sheetDoneBtnText}>Done</Text>
        </Pressable>
      </BottomSheetModal>

      <BottomSheetModal visible={openSheet === 'class'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>Class Year</Text>
        <View style={s.sheetChipWrap}>
          {GRAD_YEARS.map(year => (
            <Pressable
              key={year}
              style={[s.sheetChip, filters.gradYears.includes(year) && s.sheetChipActive]}
              onPress={() => toggleGradYear(year)}
            >
              <Text style={[s.sheetChipText, filters.gradYears.includes(year) && s.sheetChipTextActive]}>{year}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}>
          <Text style={s.sheetDoneBtnText}>Done</Text>
        </Pressable>
      </BottomSheetModal>

      <BottomSheetModal visible={openSheet === 'state'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>State</Text>
        <ScrollView style={{ maxHeight: 360, alignSelf: 'stretch' }}>
          <View style={s.sheetChipWrap}>
            {STATES.map(({ code, name }) => (
              <Pressable
                key={code}
                style={[s.sheetChip, filters.states.includes(code) && s.sheetChipActive]}
                onPress={() => toggleArrayFilter('states', code)}
              >
                <Text style={[s.sheetChipText, filters.states.includes(code) && s.sheetChipTextActive]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}>
          <Text style={s.sheetDoneBtnText}>Done</Text>
        </Pressable>
      </BottomSheetModal>

      <BottomSheetModal visible={openSheet === 'more'} onClose={() => setOpenSheet(null)}>
        <Text style={s.sheetTitle}>More Filters</Text>
        <Text style={s.sheetSectionLabel}>Min V1 Score</Text>
        <View style={s.sheetChipWrap}>
          {MIN_SCORE_OPTIONS.map(score => (
            <Pressable
              key={score}
              style={[s.sheetChip, filters.minScore === score && s.sheetChipActive]}
              onPress={() => setFilters(prev => ({ ...prev, minScore: score }))}
            >
              <Text style={[s.sheetChipText, filters.minScore === score && s.sheetChipTextActive]}>
                {score === 0 ? 'Any' : `${score}+`}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={s.sheetToggleRow}
          onPress={() => setFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
        >
          <Text style={s.sheetToggleLabel}>Verified only</Text>
          <Ionicons
            name={filters.verifiedOnly ? 'checkbox' : 'square-outline'}
            size={20}
            color={filters.verifiedOnly ? PINK_RED : C.textDim}
          />
        </Pressable>
        <Pressable style={s.sheetDoneBtn} onPress={() => setOpenSheet(null)}>
          <Text style={s.sheetDoneBtnText}>Done</Text>
        </Pressable>
      </BottomSheetModal>

      <Modal visible={showLevelModal} transparent animationType="fade" onRequestClose={() => chosenLevel && setShowLevelModal(false)}>
        <Pressable style={s.levelModalOverlay} onPress={() => chosenLevel && setShowLevelModal(false)}>
          <Pressable style={s.levelModalCard} onPress={() => {}}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.scoreChip}>
                <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreChipBadge}>
                  <Ionicons name="school" size={13} color="#fff" />
                </LinearGradient>
                <Text style={s.scoreChipText}>Your program typically recruits <Text style={s.scoreChipBold}>{myRangeBand.level}</Text></Text>
              </View>

              <Text style={s.pickerTitle}>Choose Your Level</Text>
              <Text style={s.pickerSub}>Athletes outside your range come with a heads-up alert.</Text>

              <View style={{ alignSelf: 'stretch' }}>
                {RECRUITING_LEVEL_BANDS.map(band => {
                  const isMine = band.key === myRangeBand.key;
                  const isReach = band.minScore > myRangeFloor;
                  const rangeText = band.minScore > 0 ? `Typically ${band.minScore}+ V1 Score` : 'Open to any V1 Score';

                  const rowContent = (
                    <>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={s.pickerDivLabel}>{band.level}</Text>
                          {isMine && (
                            <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerTagGrad}>
                              <Text style={s.pickerTagGradText}>Your Level</Text>
                            </LinearGradient>
                          )}
                          {isReach && (
                            <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerTagGrad}>
                              <Text style={s.pickerTagGradText}>Reach</Text>
                            </LinearGradient>
                          )}
                        </View>
                        <Text style={s.pickerRange}>{rangeText}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.textDim} />
                    </>
                  );

                  return (
                    <Pressable key={band.key} onPress={() => chooseLevel(band)}>
                      {isMine ? (
                        <LinearGradient colors={SIGNAL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pickerRowGradientBorder}>
                          <View style={[s.pickerRow, s.pickerRowActiveInner]}>{rowContent}</View>
                        </LinearGradient>
                      ) : (
                        <View style={s.pickerRow}>{rowContent}</View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: C.textDim, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, fontWeight: '900', color: C.text },
    stats: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    statItem: { alignItems: 'center', gap: 4 },
    statValue: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, textTransform: 'uppercase' },

    searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
    searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: C.border },
    input: { flex: 1, fontFamily: FontFamily.body, fontSize: 14, color: C.text },
    viewToggle: { flexDirection: 'row', gap: 2, padding: 3, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    viewBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    viewBtnActive: { backgroundColor: C.surfaceAlt },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
    sortBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },

    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
    filterPillActive: { backgroundColor: PINK_RED + '20', borderColor: PINK_RED },
    filterPillText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
    filterPillTextActive: { color: C.text, fontWeight: '600' },

    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
    chipText: { fontFamily: FontFamily.body, fontSize: 12, color: C.text },
    clearAll: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, textDecorationLine: 'underline' },

    resultsMeta: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginBottom: 14 },

    bulkBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 14 },
    bulkLabel: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text },
    bulkClearBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    bulkClearText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.text },
    bulkMessageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, overflow: 'hidden' },
    bulkMessageText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },

    resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    prospectCard: { width: '47%', gap: 8 },
    prospectCardSelected: { borderWidth: 1, borderColor: C.border2 },
    cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    checkbox: { padding: 2 },

    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, flexShrink: 1 },
    prospectMeta: { fontFamily: FontFamily.body, fontSize: 11.5, color: C.textMuted, marginTop: 2 },
    prospectLoc: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 1 },
    starRow: { flexDirection: 'row', gap: 2, marginTop: 5 },

    cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
    // Same circle treatment as the swipe deck's card action row -- used
    // everywhere an icon action appears in the coach portal.
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
    iconBtnSaved: { backgroundColor: 'rgba(246,186,0,0.16)' },

    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

    loadMoreBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 16 },
    loadMoreText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    sheetTitle: { fontFamily: FontFamily.headlineBold, fontSize: 18, color: C.text, marginBottom: 4 },
    sheetSectionLabel: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.6, alignSelf: 'flex-start', marginTop: 16, marginBottom: 10 },
    sheetChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
    sheetChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
    sheetChipActive: { backgroundColor: PINK_RED, borderColor: PINK_RED },
    sheetChipText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textMuted },
    sheetChipTextActive: { color: '#fff' },
    sheetToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: C.border },
    sheetToggleLabel: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: C.text },
    sheetDoneBtn: { backgroundColor: PINK_RED, borderRadius: 100, paddingVertical: 12, paddingHorizontal: 40, marginTop: 20, alignSelf: 'stretch', alignItems: 'center' },
    sheetDoneBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },

    levelPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border2, borderRadius: 100, paddingVertical: 6, paddingHorizontal: 6, paddingLeft: 14, marginBottom: 16 },
    levelPillLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
    levelPillValue: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    levelPillChange: { borderRadius: 100, paddingVertical: 5, paddingHorizontal: 10, overflow: 'hidden' },
    levelPillChangeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, color: '#fff' },

    // Choose Your Level picker -- same visual treatment as web's centered
    // popup modal (app/coach/search/page.tsx), not a bottom sheet.
    levelModalOverlay: { flex: 1, backgroundColor: 'rgba(8,8,10,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
    levelModalCard: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: C.background, borderRadius: 20, padding: 24 },
    scoreChip: {
      flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
      backgroundColor: C.surfaceAlt, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, paddingLeft: 6,
      marginBottom: 18, maxWidth: '100%',
    },
    scoreChipBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    scoreChipText: { fontFamily: FontFamily.body, fontSize: 11.5, color: C.textMuted, flexShrink: 1 },
    scoreChipBold: { fontFamily: FontFamily.bodyBold, color: C.text },
    pickerTitle: { fontFamily: FontFamily.headline, fontSize: 22, color: C.text, marginBottom: 8, textAlign: 'center' },
    pickerSub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19, marginBottom: 16, textAlign: 'center' },
    pickerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 10 },
    pickerRowGradientBorder: { borderRadius: 17, padding: 1.5, marginBottom: 10 },
    pickerRowActiveInner: { marginBottom: 0, borderRadius: 15.5 },
    pickerDivLabel: { fontFamily: FontFamily.headline, fontSize: 16, color: C.text },
    pickerRange: { fontFamily: FontFamily.body, fontSize: 11.5, color: C.textDim, marginTop: 5 },
    pickerTagGrad: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
    pickerTagGradText: { fontFamily: FontFamily.mono, fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' },
  });
}
