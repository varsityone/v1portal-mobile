import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachSaved, SavedProspect } from '../../hooks/useCoachSaved';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors, useTheme } from '../../context/ThemeContext';

export default function SavedProspectsScreen() {
  const router = useRouter();
  const C = useColors();
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const { loading: coachLoading } = useCoachData();
  const { saved, loading, sort, setSort, remove } = useCoachSaved();
  const [removing, setRemoving] = useState<string | null>(null);

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  const handleRemove = async (id: string) => {
    setRemoving(id);
    await remove(id);
    setRemoving(null);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Saved Prospects</Text>
        <Text style={s.subtitle}>Athletes you've bookmarked to track and follow up with.</Text>
      </View>

      {saved.length > 0 && (
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
      )}

      {saved.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="bookmark-outline" size={26} color="#a855f7" />
          </View>
          <Text style={s.emptyTitle}>No saved prospects yet</Text>
          <Text style={s.emptyBody}>Save prospects as you swipe to build your watchlist.</Text>
          <Pressable onPress={() => router.push('/(coach)/match' as any)}>
            <Text style={s.emptyLink}>Start Swiping →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 16 }}>
          {saved.map((row: SavedProspect) => {
            const athlete = row.athlete;
            if (!athlete) return null;
            return (
              <Pressable
                key={row.id}
                style={s.row}
                onPress={() => router.push(`/(coach)/recruits/${row.athlete_id}` as any)}
              >
                {athlete.profile_photo_url ? (
                  <Image source={{ uri: athlete.profile_photo_url }} style={s.photo} />
                ) : (
                  <View style={[s.photo, s.photoFallback]}>
                    <Ionicons name="person" size={22} color={theme === 'dark' ? '#000' : '#fff'} />
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={1}>{athlete.full_name ?? 'Unknown'}</Text>
                  <Text style={s.meta} numberOfLines={1}>
                    {athlete.position ?? '—'} · {athlete.state ?? '—'} · Class of {athlete.graduation_year ?? '—'}
                  </Text>
                  {row.notes ? <Text style={s.notes} numberOfLines={1}>{row.notes}</Text> : null}
                </View>
                {athlete.v1_score != null && (
                  <LinearGradient
                    colors={['#501af0', '#a855f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.scoreBadge}
                  >
                    <Text style={s.scoreBadgeText}>{athlete.v1_score}</Text>
                  </LinearGradient>
                )}
                <Pressable
                  onPress={() => handleRemove(row.id)}
                  disabled={removing === row.id}
                  hitSlop={10}
                  style={s.removeBtn}
                >
                  <Text style={[s.removeBtnText, removing === row.id && { opacity: 0.5 }]}>Remove</Text>
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
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },

    sortRow: { flexDirection: 'row', gap: 8 },
    sortButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    sortButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
    sortText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textDim },
    sortTextActive: { color: '#fff' },

    emptyWrap: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
    emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(131,58,180,0.12)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    emptyTitle: { fontFamily: FontFamily.headline, fontSize: 17, color: C.text, marginBottom: 6 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 16 },
    emptyLink: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
    photo: { width: 60, height: 60, borderRadius: 10 },
    photoFallback: { backgroundColor: '#71ff7e', alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    meta: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    notes: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, marginTop: 4, fontStyle: 'italic' },
    scoreBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    scoreBadgeText: { fontFamily: FontFamily.statNumber, fontSize: 15, color: '#fff' },
    removeBtn: { paddingHorizontal: 4 },
    removeBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.error },
  });
}
