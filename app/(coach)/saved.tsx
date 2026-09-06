import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachSaved } from '../../hooks/useCoachSaved';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { starsForScore } from '../../lib/recruitingLevels';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';

export default function SavedProspectsScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { saved, loading, sort, setSort, remove } = useCoachSaved();
  const [removing, setRemoving] = useState<string | null>(null);

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!coach?.verified) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <EmptyState icon="alert-circle-outline" title="Verification Pending" />
      </ScrollView>
    );
  }

  const handleRemove = async (id: string) => {
    setRemoving(id);
    await remove(id);
    setRemoving(null);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>RECRUITMENT</Text>
        <View style={s.titleRow}>
          <Text style={s.title}>Saved Prospects</Text>
          <Text style={s.count}>{saved.length}</Text>
        </View>
      </View>

      <View style={s.sortRow}>
        <Pressable
          style={[s.sortButton, sort === 'recent' && s.sortButtonActive]}
          onPress={() => setSort('recent')}
        >
          <Text style={[s.sortText, sort === 'recent' && s.sortTextActive]}>Recently Saved</Text>
        </Pressable>
        <Pressable
          style={[s.sortButton, sort === 'score' && s.sortButtonActive]}
          onPress={() => setSort('score')}
        >
          <Text style={[s.sortText, sort === 'score' && s.sortTextActive]}>Highest Score</Text>
        </Pressable>
      </View>

      {saved.length === 0 ? (
        <EmptyState
          title="No saved prospects yet"
          body="Save athletes from the search or your matches to keep track of top recruits."
          actionLabel="Search for Players"
          onAction={() => router.push('/(coach)/search' as any)}
        />
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {saved.map(row => {
            const athlete = row.athlete;
            if (!athlete) return null;
            const stars = starsForScore(athlete.v1_score);
            return (
              <Pressable
                key={row.id}
                style={s.row}
                onPress={() => router.push(`/(coach)/recruit/${athlete.full_name?.replace(/\s+/g, '-').toLowerCase()}-${row.athlete_id}` as any)}
              >
                <Avatar uri={athlete.profile_photo_url} name={athlete.full_name} size={48} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>{athlete.full_name ?? 'Unknown'}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {athlete.position ?? '—'} · {athlete.state ?? '—'} · Class of {athlete.graduation_year ?? '—'}
                  </Text>
                  {athlete.v1_score != null && (
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
                  {row.notes && <Text style={s.notes} numberOfLines={1}>{row.notes}</Text>}
                </View>
                {athlete.v1_score != null && (
                  <Text style={s.score}>{athlete.v1_score}</Text>
                )}
                <Pressable
                  onPress={() => handleRemove(row.id)}
                  disabled={removing === row.id}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={16} color={C.error} opacity={removing === row.id ? 0.5 : 1} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    count: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textDim },

    sortRow: { flexDirection: 'row', gap: 8 },
    sortButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    sortButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
    sortText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textDim },
    sortTextActive: { color: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    meta: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    starsRow: { flexDirection: 'row', gap: 3, marginTop: 4 },
    notes: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, marginTop: 4, fontStyle: 'italic' },
    score: { fontFamily: FontFamily.headline, fontSize: 17, color: C.primary },
  });
}
