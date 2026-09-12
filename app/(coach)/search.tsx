import LoadingScreen from '../../components/LoadingScreen';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { GRADIENT, ThemeColors, PINK_RED } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { starsForScore, POSITIONS, GRAD_YEARS, STATES } from '../../lib/recruitingLevels';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';

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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [messagedCount, setMessagedCount] = useState(0);
  const [pendingAthleteId, setPendingAthleteId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [openSheet, setOpenSheet] = useState<FilterSheet>(null);

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
      let q = supabase.from('athletes').select('id, full_name, profile_photo_url, position, state, city, v1_score, graduation_year, height, weight');

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
        q = q.order('v1_score', { ascending: false });
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
    ...filters.states.map(s => ({ key: `st-${s}`, label: s, clear: () => toggleArrayFilter('states', s) })),
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

      {/* Search + Sort */}
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

      {/* Results */}
      {prospects.length === 0 ? (
        <EmptyState icon="search" title="No prospects found" body="Try adjusting your filters or search terms." />
      ) : (
        <View style={s.resultGrid}>
          {prospects.map(prospect => (
            <Card key={prospect.id} style={s.prospectCard}>
              {/* Photo */}
              {prospect.profile_photo_url ? (
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photoBox}>
                  <Image source={{ uri: prospect.profile_photo_url }} style={s.photo} />
                </LinearGradient>
              ) : (
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photoBox}>
                  <Avatar name={prospect.full_name || ''} size={64} />
                </LinearGradient>
              )}

              {/* Save button */}
              <Pressable
                style={[s.saveBtn, savedIds.has(prospect.id) && s.saveBtnSaved]}
                onPress={() => toggleSaved(prospect.id)}
              >
                <Ionicons name={savedIds.has(prospect.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={PINK_RED} />
              </Pressable>

              {/* Info */}
              <Text style={s.prospectName} numberOfLines={1}>{prospect.full_name || 'Unknown'}</Text>
              <Text style={s.prospectMeta}>{prospect.position || '—'} · {prospect.graduation_year || '—'}</Text>

              {prospect.v1_score !== null && (
                <View style={s.scoreRow}>
                  <Text style={s.scoreNum}>{Math.round(prospect.v1_score)}</Text>
                  <View style={s.starRow}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons
                        key={i}
                        name={i < starsForScore(prospect.v1_score) ? 'star' : 'star-outline'}
                        size={12}
                        color={PINK_RED}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Message button */}
              <Pressable
                style={s.messageBtn}
                onPress={() => messageAthlete(prospect.id)}
                disabled={pendingAthleteId === prospect.id}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#fff" />
                <Text style={s.messageBtnText}>
                  {pendingAthleteId === prospect.id ? 'Opening...' : 'Message'}
                </Text>
              </Pressable>
            </Card>
          ))}
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
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { marginBottom: 24 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: C.textDim, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, fontWeight: '900', color: C.text },
    stats: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', gap: 16, alignItems: 'center' },
    statItem: { alignItems: 'center', gap: 4 },
    statValue: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, textTransform: 'uppercase' },

    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'center' },
    searchInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: C.border },
    input: { flex: 1, fontFamily: FontFamily.body, fontSize: 14, color: C.text },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
    sortBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },

    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.border },
    filterPillActive: { backgroundColor: PINK_RED + '20', borderColor: PINK_RED },
    filterPillText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
    filterPillTextActive: { color: C.text, fontWeight: '600' },

    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
    chipText: { fontFamily: FontFamily.body, fontSize: 12, color: C.text },
    clearAll: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, textDecorationLine: 'underline' },

    resultGrid: { gap: 12 },
    prospectCard: { overflow: 'hidden' },
    photoBox: { width: '100%', height: 160, position: 'relative', marginBottom: 12 },
    photo: { width: '100%', height: '100%', borderRadius: 12 },
    saveBtn: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface + 'dd', alignItems: 'center', justifyContent: 'center' },
    saveBtnSaved: { backgroundColor: PINK_RED + 'dd' },

    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 2 },
    prospectMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginBottom: 8 },

    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    scoreNum: { fontFamily: FontFamily.headline, fontSize: 18, fontWeight: '900', color: PINK_RED },
    starRow: { flexDirection: 'row', gap: 2 },

    messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: PINK_RED, borderRadius: 10, paddingVertical: 10 },
    messageBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

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
  });
}
