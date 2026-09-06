import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachSearch, SearchFilters } from '../../hooks/useCoachSearch';
import { GRADIENT, SCORE_GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { starsForScore, POSITIONS, STATES, GRAD_YEARS } from '../../lib/recruitingLevels';
import { SearchBar } from '../../components/ui/SearchBar';
import { FilterChips, ChipOption } from '../../components/ui/FilterChips';
import { Avatar, initialsFor } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export default function CoachSearchScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { results, loading, hasMore, filters, setFilters, loadMore, refreshSort, currentSort } = useCoachSearch();

  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (coachLoading) return;
    if (!coach?.verified) return;
    loadSavedIds();
  }, [coach?.id, coachLoading]);

  const loadSavedIds = async () => {
    if (!coach?.id) return;
    try {
      const { data } = await supabase
        .from('coach_saved_prospects')
        .select('athlete_id')
        .eq('coach_id', coach.id);
      setSavedIds(new Set((data ?? []).map(row => row.athlete_id)));
    } catch (e) {
      console.error('Load saved error:', e);
    }
  };

  const applySearch = () => {
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
