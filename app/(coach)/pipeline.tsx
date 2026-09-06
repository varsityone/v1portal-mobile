import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachPipeline } from '../../hooks/useCoachPipeline';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

const STATUSES = [
  { label: 'Interested', value: 'interested', color: '#3b82f6' },
  { label: 'Pursuing', value: 'pursuing', color: '#8b5cf6' },
  { label: 'Committed', value: 'committed', color: '#f59e0b' },
  { label: 'Signed', value: 'signed', color: '#22c55e' },
];

export default function PipelineScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { coach, loading: coachLoading } = useCoachData();
  const { prospects, loading } = useCoachPipeline();

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (prospects.length === 0) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.eyebrow}>PIPELINE</Text>
          <Text style={s.title}>Recruit Pipeline</Text>
        </View>
        <EmptyState
          icon="briefcase"
          title="No prospects yet"
          body="Start by searching for athletes or adding them from saved prospects."
        />
      </View>
    );
  }

  const grouped = STATUSES.map(status => ({
    ...status,
    prospects: prospects.filter(p => p.status === status.value),
  }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>PIPELINE</Text>
        <Text style={s.title}>Recruit Pipeline</Text>
      </View>

      {grouped.map(
        group =>
          group.prospects.length > 0 && (
            <Card key={group.value} style={s.statusCard}>
              <View style={s.statusHeader}>
                <View style={[s.statusDot, { backgroundColor: group.color }]} />
                <Text style={s.statusTitle}>{group.label}</Text>
                <Text style={s.statusCount}>{group.prospects.length}</Text>
              </View>
              <View style={{ gap: 8, marginTop: 12 }}>
                {group.prospects.map(prospect => (
                  <View key={prospect.id} style={s.prospectRow}>
                    <Avatar
                      uri={prospect.athlete?.profile_photo_url}
                      name={prospect.athlete?.full_name}
                      size={40}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.prospectName} numberOfLines={1}>
                        {prospect.athlete?.full_name}
                      </Text>
                      <Text style={s.prospectMeta}>
                        {prospect.athlete?.position ?? '—'} • {prospect.athlete?.state ?? '—'}
                      </Text>
                    </View>
                    {prospect.athlete?.v1_score != null && (
                      <Text style={s.prospectScore}>{prospect.athlete.v1_score}</Text>
                    )}
                    <Pressable style={s.actionBtn} onPress={() => showStatusMenu(prospect.id, group.value)}>
                      <Ionicons name="chevron-forward" size={18} color={C.textDim} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          ),
      )}
    </ScrollView>
  );
}

function showStatusMenu(prospectId: string, currentStatus: string) {
  // Placeholder for bottom sheet status picker
  console.log('Show status menu for', prospectId, 'current:', currentStatus);
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    statusCard: { marginBottom: 16 },
    statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    statusCount: { marginLeft: 'auto', fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim },

    prospectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    prospectName: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    prospectMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    prospectScore: { fontFamily: FontFamily.headline, fontSize: 14, color: C.primary },
    actionBtn: { padding: 4 },
  });
}
