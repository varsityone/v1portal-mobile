import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachPipeline, PipelineProspect, PipelineStatus } from '../../hooks/useCoachPipeline';
import { ThemeColors, PINK_RED } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Avatar } from '../../components/ui/Avatar';
import { BottomSheetModal } from '../../components/ui/BottomSheetModal';
import { Ionicons } from '@expo/vector-icons';

const STATUSES: { label: string; value: PipelineStatus; color: string }[] = [
  { label: 'Interested', value: 'interested', color: '#a78bfa' },
  { label: 'Contacted', value: 'contacted', color: '#3b82f6' },
  { label: 'Visited', value: 'visited', color: '#06b6d4' },
  { label: 'Offered', value: 'offered', color: '#f59e0b' },
  { label: 'Committed', value: 'committed', color: '#10b981' },
  { label: 'Signed', value: 'signed', color: '#059669' },
  { label: 'Declined', value: 'declined', color: '#ef4444' },
];
const statusInfo = (v: string) => STATUSES.find(s => s.value === v);

export default function PipelineScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { loading: coachLoading } = useCoachData();
  const { prospects, loading, updateStatus } = useCoachPipeline();
  const [filter, setFilter] = useState<'all' | PipelineStatus>('all');
  const [activeProspect, setActiveProspect] = useState<PipelineProspect | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleStatusPick = async (status: PipelineStatus) => {
    if (!activeProspect || status === activeProspect.status) {
      setActiveProspect(null);
      return;
    }
    setUpdating(true);
    try {
      await updateStatus(activeProspect.id, status);
    } catch (e) {
      console.error('Pipeline status update error:', e);
    } finally {
      setUpdating(false);
      setActiveProspect(null);
    }
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={PINK_RED} size="large" /></View>;
  }

  const filtered = filter === 'all' ? prospects : prospects.filter(p => p.status === filter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Pressable style={s.backLink} onPress={() => router.push('/(coach)/recruiting' as any)}>
          <Ionicons name="arrow-back" size={14} color="#fff" />
          <Text style={s.backLinkText}>Back to Recruiting</Text>
        </Pressable>
        <Text style={s.title}>Recruiting Pipeline</Text>
        <Text style={s.subtitle}>Track your recruiting progress from prospect to signed recruit</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        <Pressable
          style={[s.filterChip, filter === 'all' ? s.filterChipAllActive : s.filterChipInactive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[s.filterChipText, filter === 'all' && s.filterChipTextActive]}>All ({prospects.length})</Text>
        </Pressable>
        {STATUSES.map(status => {
          const count = prospects.filter(p => p.status === status.value).length;
          const active = filter === status.value;
          return (
            <Pressable
              key={status.value}
              style={[s.filterChip, active ? { backgroundColor: status.color } : s.filterChipInactive]}
              onPress={() => setFilter(status.value)}
            >
              <Text style={[s.filterChipText, active && s.filterChipTextActive]}>{status.label} ({count})</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No prospects in this pipeline yet</Text>
        </View>
      ) : (
        <View style={s.listCard}>
          {filtered.map((prospect, idx) => {
            const info = statusInfo(prospect.status);
            return (
              <View key={prospect.id} style={[s.row, idx > 0 && s.rowBorder]}>
                <Pressable
                  style={s.rowTapArea}
                  onPress={() => router.push(`/(coach)/recruits/${prospect.athlete_id}` as any)}
                >
                  <Avatar uri={prospect.athlete?.profile_photo_url} name={prospect.athlete?.full_name} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.name} numberOfLines={1}>{prospect.athlete?.full_name}</Text>
                    <Text style={s.meta}>
                      {prospect.athlete?.position ?? '—'} · {prospect.athlete?.state ?? '—'}
                      {prospect.athlete?.v1_score != null ? ` · ${prospect.athlete.v1_score}` : ''}
                    </Text>
                    {prospect.offer_scholarship_amount ? (
                      <Text style={s.scholarship}>${prospect.offer_scholarship_amount.toLocaleString()}</Text>
                    ) : null}
                  </View>
                </Pressable>
                <Pressable
                  style={[s.statusPill, { backgroundColor: info?.color ?? C.border2 }]}
                  onPress={() => setActiveProspect(prospect)}
                  disabled={updating}
                >
                  <Text style={s.statusPillText}>{info?.label ?? prospect.status}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <BottomSheetModal visible={!!activeProspect} onClose={() => (updating ? null : setActiveProspect(null))}>
        <Text style={s.sheetTitle}>{activeProspect?.athlete?.full_name}</Text>
        <Text style={s.sheetSubtitle}>Move to pipeline stage</Text>
        <View style={{ width: '100%', gap: 8, marginTop: 16 }}>
          {STATUSES.map(status => (
            <Pressable
              key={status.value}
              style={[s.sheetOption, activeProspect?.status === status.value && s.sheetOptionActive]}
              onPress={() => handleStatusPick(status.value)}
              disabled={updating}
            >
              <View style={[s.statusDot, { backgroundColor: status.color }]} />
              <Text style={s.sheetOptionText}>{status.label}</Text>
              {activeProspect?.status === status.value && (
                <Ionicons name="checkmark" size={18} color={PINK_RED} style={{ marginLeft: 'auto' }} />
              )}
            </Pressable>
          ))}
        </View>
      </BottomSheetModal>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    backLinkText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: '#fff' },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },

    filterScroll: { marginBottom: 20, marginHorizontal: -20 },
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
    filterChipAllActive: { backgroundColor: PINK_RED },
    filterChipInactive: { borderWidth: 1, borderColor: C.border, backgroundColor: 'transparent' },
    filterChipText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.text },
    filterChipTextActive: { color: '#fff' },

    emptyCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 48, alignItems: 'center' },
    emptyText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim },

    listCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    rowTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    meta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    scholarship: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.text, marginTop: 2 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    statusPillText: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: '#fff' },

    statusDot: { width: 8, height: 8, borderRadius: 4 },
    sheetTitle: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text, textAlign: 'center' },
    sheetSubtitle: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 4, textAlign: 'center' },
    sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, backgroundColor: C.surfaceAlt },
    sheetOptionActive: { borderWidth: 1, borderColor: PINK_RED },
    sheetOptionText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
  });
}
