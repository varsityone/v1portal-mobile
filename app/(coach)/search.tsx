import { useEffect, useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { starsForScore, POSITIONS, GRAD_YEARS, getRecruitingLevelBand } from '../../lib/recruitingLevels';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

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
  const [activeFiltersOpen, setActiveFiltersOpen] = useState(false);

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
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
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
            <Ionicons name="bookmark" size={14} color={C.primary} />
            <Text style={s.statValue}>{savedIds.size}</Text>
            <Text style={s.statLabel}>Saved</Text>
          </View>
          <View style={s.statItem}>
            <Ionicons name="chatbubble" size={14} color={C.primary} />
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
          onPress={() => setActiveFiltersOpen(!activeFiltersOpen)}
        >
          <Text style={[s.filterPillText, filters.positions.length > 0 && s.filterPillTextActive]}>
            Position {filters.positions.length > 0 ? `(${filters.positions.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filters.positions.length > 0 ? C.text : C.textDim} />
        </Pressable>

        <Pressable
          style={[s.filterPill, filters.gradYears.length > 0 && s.filterPillActive]}
          onPress={() => setActiveFiltersOpen(!activeFiltersOpen)}
        >
          <Text style={[s.filterPillText, filters.gradYears.length > 0 && s.filterPillTextActive]}>
            Class {filters.gradYears.length > 0 ? `(${filters.gradYears.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filters.gradYears.length > 0 ? C.text : C.textDim} />
        </Pressable>

        <Pressable
          style={[s.filterPill, filters.states.length > 0 && s.filterPillActive]}
          onPress={() => setActiveFiltersOpen(!activeFiltersOpen)}
        >
          <Text style={[s.filterPillText, filters.states.length > 0 && s.filterPillTextActive]}>
            State {filters.states.length > 0 ? `(${filters.states.length})` : ''}
          </Text>
          <Ionicons name="chevron-down" size={12} color={filters.states.length > 0 ? C.text : C.textDim} />
        </Pressable>

        <Pressable
          style={[s.filterPill, (filters.minScore > 0 || filters.verifiedOnly) && s.filterPillActive]}
          onPress={() => setActiveFiltersOpen(!activeFiltersOpen)}
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
      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
      ) : prospects.length === 0 ? (
        <EmptyState icon="search" title="No prospects found" body="Try adjusting your filters or search terms." />
      ) : (
        <View style={s.resultGrid}>
          {prospects.map(prospect => (
            <Card key={prospect.id} style={s.prospectCard}>
              {/* Photo */}
              {prospect.profile_photo_url ? (
                <LinearGradient colors={[C.primary, '#E1306C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photoBox}>
                  <Image source={{ uri: prospect.profile_photo_url }} style={s.photo} />
                </LinearGradient>
              ) : (
                <LinearGradient colors={[C.primary, '#E1306C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photoBox}>
                  <Avatar name={prospect.full_name || ''} size={64} />
                </LinearGradient>
              )}

              {/* Save button */}
              <Pressable
                style={[s.saveBtn, savedIds.has(prospect.id) && s.saveBtnSaved]}
                onPress={() => toggleSaved(prospect.id)}
              >
                <Ionicons name={savedIds.has(prospect.id) ? 'bookmark' : 'bookmark-outline'} size={18} color={C.primary} />
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
                        color={C.primary}
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
    </ScrollView>
  );
}

function Image({ source, style }: any) {
  // React Native Image component - using native
  return null;
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
    filterPillActive: { backgroundColor: C.primary + '20', borderColor: C.primary },
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
    saveBtnSaved: { backgroundColor: C.primary + 'dd' },

    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 2 },
    prospectMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginBottom: 8 },

    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    scoreNum: { fontFamily: FontFamily.headline, fontSize: 18, fontWeight: '900', color: C.primary },
    starRow: { flexDirection: 'row', gap: 2 },

    messageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10 },
    messageBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    loadMoreBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 16 },
    loadMoreText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.primary },
  });
}
    const updated = { ...filters };
    if (searchText.trim()) {
      // Name filter would need a client-side name search since supabase doesn't support full live ilike on partial matches in this context.
      // For now, we'll implement name search by filtering results client-side or via a debounced re-query.
    }
    setFilters(updated);
  };

  const handleSaveToggle = async (athleteId: string) => {
    if (!coach?.id) return;
    setSaving(athleteId);
    try {
      if (savedIds.has(athleteId)) {
        await supabase
          .from('coach_saved_prospects')
          .delete()
          .eq('coach_id', coach.id)
          .eq('athlete_id', athleteId);
        setSavedIds(s => {
          const next = new Set(s);
          next.delete(athleteId);
          return next;
        });
      } else {
        await supabase
          .from('coach_saved_prospects')
          .insert({ coach_id: coach.id, athlete_id: athleteId });
        setSavedIds(s => new Set([...s, athleteId]));
      }
    } catch (e) {
      console.error('Save toggle error:', e);
    } finally {
      setSaving(null);
    }
  };

  const handleMessage = async (athleteId: string) => {
    if (!coach?.id) return;
    try {
      const { data: existing } = await supabase
        .from('coach_athlete_conversations')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('athlete_id', athleteId)
        .maybeSingle();

      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: created } = await supabase
          .from('coach_athlete_conversations')
          .insert({ coach_id: coach.id, athlete_id: athleteId })
          .select('id')
          .single();
        conversationId = created?.id;
      }

      if (conversationId) {
        router.push(`/(coach)/messages/${conversationId}` as any);
      }
    } catch (e) {
      console.error('Message error:', e);
    }
  };

  const handleAddPipeline = async (athleteId: string) => {
    if (!coach?.id) return;
    try {
      await supabase
        .from('coach_recruit_pipeline')
        .insert({ coach_id: coach.id, athlete_id: athleteId, status: 'interested' });
    } catch (e) {
      if ((e as any)?.message?.includes('duplicate') || (e as any)?.code === '23505') {
        // Already in pipeline, no error
      } else {
        console.error('Pipeline error:', e);
      }
    }
  };

  if (coachLoading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!coach?.verified) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Verification Pending"
          body={coach?.email_verified
            ? "Your email is confirmed. We're doing a quick manual check on your program — you'll be live within one business day."
            : 'Check your inbox for a confirmation email and click the link to activate your program.'}
        />
      </ScrollView>
    );
  }

  const positionOptions: ChipOption[] = POSITIONS.map(p => ({ label: p, value: p }));
  const gradOptions: ChipOption[] = GRAD_YEARS.map(y => ({ label: `'${y.toString().slice(-2)}`, value: y.toString() }));
  const stateOptions: ChipOption[] = STATES.map(s => ({ label: s.code, value: s.code }));

  return (
    <View style={s.root}>
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <View style={s.header}>
          <Text style={s.eyebrow}>RECRUIT SEARCH</Text>
          <Text style={s.title}>Find Players</Text>
        </View>

        <SearchBar
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by name…"
          onFilterPress={() => setShowFilters(!showFilters)}
          filterActive={Object.values(filters).some(v => (Array.isArray(v) ? v.length > 0 : v > 0))}
        />

        {showFilters && (
          <View style={s.filtersCard}>
            <View style={s.filterSection}>
              <Text style={s.filterLabel}>Position</Text>
              <FilterChips
                options={positionOptions}
                selected={filters.positions}
                onToggle={p => setFilters({ ...filters, positions: filters.positions.includes(p) ? filters.positions.filter(x => x !== p) : [...filters.positions, p] })}
              />
            </View>

            <View style={s.filterSection}>
              <Text style={s.filterLabel}>Graduation Year</Text>
              <FilterChips
                options={gradOptions}
                selected={filters.gradYears.map(y => y.toString())}
                onToggle={y => {
                  const num = parseInt(y);
                  setFilters({
                    ...filters,
                    gradYears: filters.gradYears.includes(num) ? filters.gradYears.filter(x => x !== num) : [...filters.gradYears, num],
                  });
                }}
              />
            </View>

            <View style={s.filterSection}>
              <Text style={s.filterLabel}>State</Text>
              <FilterChips
                options={stateOptions}
                selected={filters.states}
                onToggle={st => setFilters({ ...filters, states: filters.states.includes(st) ? filters.states.filter(x => x !== st) : [...filters.states, st] })}
              />
            </View>

            <View style={s.filterSection}>
              <Text style={s.filterLabel}>Verified Only</Text>
              <Pressable
                style={[s.toggleSwitch, filters.verifiedOnly && { backgroundColor: C.primary }]}
                onPress={() => setFilters({ ...filters, verifiedOnly: !filters.verifiedOnly })}
              >
                <View style={[s.toggleThumb, filters.verifiedOnly && s.toggleThumbActive]} />
              </Pressable>
            </View>

            <View style={s.sortRow}>
              <Text style={s.filterLabel}>Sort By</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={[s.sortButton, currentSort === 'score' && s.sortButtonActive]}
                  onPress={() => refreshSort('score')}
                >
                  <Text style={[s.sortButtonText, currentSort === 'score' && s.sortButtonTextActive]}>Score</Text>
                </Pressable>
                <Pressable
                  style={[s.sortButton, currentSort === 'year' && s.sortButtonActive]}
                  onPress={() => refreshSort('year')}
                >
                  <Text style={[s.sortButtonText, currentSort === 'year' && s.sortButtonTextActive]}>Year</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {loading && results.length === 0 ? (
          <View style={s.center}>
            <ActivityIndicator color={C.primary} size="large" />
          </View>
        ) : results.length === 0 ? (
          <EmptyState title="No players found" body="Try adjusting your filters or search criteria." />
        ) : (
          <View style={{ gap: 10, marginTop: 16 }}>
            {results.map(result => {
              const stars = starsForScore(result.v1_score);
              const isSaved = savedIds.has(result.id);
              return (
                <Pressable key={result.id} style={[s.row]}>
                  <Avatar uri={result.profile_photo_url} name={result.full_name} size={48} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{result.full_name ?? 'Unknown'}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {result.position ?? '—'} · {result.state ?? '—'} · Class of {result.graduation_year ?? '—'}
                    </Text>
                    {result.v1_score != null && (
                      <View style={s.starsRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < stars ? 'star' : 'star-outline'}
                            size={12}
                            color={i < stars ? '#F6BA00' : C.textDim}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  {result.v1_score != null && (
                    <View style={s.scoreRing}>
                      <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                      <Text style={s.scoreValue}>{result.v1_score}</Text>
                    </View>
                  )}
                  {result.v1_score != null && <Badge label="Verified" tone="success" />}
                </Pressable>
              );
            })}

            <View style={s.actionsRow}>
              <Pressable
                style={[s.actionButton, s.saveButton]}
                onPress={() => results.length > 0 && handleSaveToggle(results[0]?.id)}
                disabled={saving === results[0]?.id}
              >
                <Ionicons name="bookmark" size={18} color={C.primary} />
                <Text style={s.actionButtonText}>Save</Text>
              </Pressable>
              <Pressable
                style={[s.actionButton, s.messageButton]}
                onPress={() => results.length > 0 && handleMessage(results[0]?.id)}
              >
                <Ionicons name="chatbubble" size={18} color="#fff" />
                <Text style={[s.actionButtonText, { color: '#fff' }]}>Message</Text>
              </Pressable>
              <Pressable
                style={[s.actionButton, s.pipelineButton]}
                onPress={() => results.length > 0 && handleAddPipeline(results[0]?.id)}
              >
                <Ionicons name="add-circle" size={18} color={C.primary} />
                <Text style={s.actionButtonText}>Pipeline</Text>
              </Pressable>
            </View>

            {hasMore && (
              <Pressable style={s.loadMore} onPress={loadMore}>
                <Text style={s.loadMoreText}>Load More</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    filtersCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginTop: 16, borderWidth: 1, borderColor: C.border },
    filterSection: { marginBottom: 16 },
    filterLabel: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text, marginBottom: 8 },
    toggleSwitch: { width: 50, height: 30, borderRadius: 15, backgroundColor: C.border2, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 3 },
    toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.text },
    toggleThumbActive: { alignSelf: 'flex-end' },
    sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
    sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: C.border2 },
    sortButtonActive: { backgroundColor: C.primary },
    sortButtonText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim },
    sortButtonTextActive: { color: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    meta: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    starsRow: { flexDirection: 'row', gap: 3, marginTop: 4 },
    scoreRing: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    scoreValue: { fontFamily: FontFamily.headline, fontSize: 16, color: '#fff' },

    actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    saveButton: { backgroundColor: `${C.primary}18`, borderWidth: 1, borderColor: C.primary },
    messageButton: { backgroundColor: C.primary },
    pipelineButton: { backgroundColor: `${C.primary}18`, borderWidth: 1, borderColor: C.primary },
    actionButtonText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.primary },

    loadMore: { alignItems: 'center', paddingVertical: 16, marginTop: 12 },
    loadMoreText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.primary },
  });
}
