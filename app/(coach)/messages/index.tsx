import { DEFAULT_PROFILE_IMAGE } from '../../../constants/ProfileImage';
import LoadingScreen from '../../../components/LoadingScreen';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { useCoachInbox, ConversationRow as CoachConversationRow } from '../../../hooks/useCoachInbox';
import { ThemeColors, PINK_RED, BRAND_GREEN, GRADIENT } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { EmptyState } from '../../../components/ui/EmptyState';

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsOf(name: string | null) {
  return (name || 'A').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

type FilterKey = 'all' | 'unread' | 'waiting';

export default function MessagesInboxScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { conversations, loading, refresh } = useCoachInbox();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!coach?.id) return;
    supabase.from('coach_accounts').update({ last_active_at: new Date().toISOString() }).eq('id', coach.id);
  }, [coach?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter(c => {
      const hay = `${c.athlete?.full_name ?? ''} ${c.athlete?.position ?? ''}`.toLowerCase();
      const matchesQuery = !q || hay.includes(q);
      const matchesFilter =
        filter === 'all' ? true :
        filter === 'unread' ? c.coach_unread_count > 0 :
        c.last_message_from === 'athlete';
      return matchesQuery && matchesFilter;
    });
  }, [conversations, query, filter]);

  const unreadCount = conversations.filter(c => c.coach_unread_count > 0).length;
  const waitingCount = conversations.filter(c => c.last_message_from === 'athlete').length;

  if (coachLoading || loading) {
    return <LoadingScreen />;
  }

  if (!coach?.verified) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <EmptyState icon="alert-circle-outline" title="Verification Pending" />
      </ScrollView>
    );
  }

  const FILTERS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: conversations.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'waiting', label: 'Waiting on you', count: waitingCount },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Text style={s.title}>Messages</Text>
      <Text style={s.subtitle}>Conversations with prospects you've reached out to</Text>

      {conversations.length > 0 && (
        <>
          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color={C.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search prospects"
              placeholderTextColor={C.textDim}
              style={s.searchInput}
            />
          </View>

          <View style={s.filterRow}>
            {FILTERS.map(f => {
              const on = filter === f.key;
              return (
                <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[s.filterBtn, on && s.filterBtnActive]}>
                  <Text style={[s.filterBtnText, on && s.filterBtnTextActive]}>{f.label}</Text>
                  <View style={[s.filterCount, on && s.filterCountActive]}>
                    <Text style={[s.filterCountText, on && s.filterCountTextActive]}>{f.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {conversations.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="chatbubbles" size={44} color="#fff" style={{ marginBottom: 16 }} />
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyBody}>Start reaching out to prospects to begin conversations</Text>
          <Pressable onPress={() => router.push('/(coach)/search' as any)}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Find Prospects</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyTitle}>No conversations match</Text>
          <Text style={s.emptyBody}>Try a different search or filter</Text>
        </View>
      ) : (
        <View style={s.list}>
          {filtered.map((conv, i) => (
            <ConversationRowItem
              key={conv.id}
              conv={conv}
              isLast={i === filtered.length - 1}
              C={C}
              s={s}
              onPress={() => router.push(`/(coach)/messages/${conv.id}` as any)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ConversationRowItem({ conv, isLast, C, s, onPress }: {
  conv: CoachConversationRow;
  isLast: boolean;
  C: ThemeColors;
  s: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const athlete = conv.athlete;
  const unread = conv.coach_unread_count > 0;
  const waiting = conv.last_message_from === 'athlete';
  const subtitle = athlete?.position ?? '';

  return (
    <Pressable
      style={[s.row, !isLast && s.rowBorder, unread && s.rowUnread]}
      onPress={onPress}
    >
      <Image source={athlete?.profile_photo_url ? { uri: athlete?.profile_photo_url } : DEFAULT_PROFILE_IMAGE} style={s.avatar} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
          <Text style={[s.name, unread && s.nameUnread]} numberOfLines={1}>{athlete?.full_name || 'Athlete'}</Text>
          <Text style={[s.time, unread && s.timeUnread]}>{timeAgo(conv.last_message_at)}</Text>
        </View>
        <View style={s.metaRow}>
          {athlete?.v1_score != null && (
            <View style={s.divisionChip}>
              <Text style={s.divisionChipText}>V1 {athlete.v1_score}</Text>
            </View>
          )}
          {!!subtitle && <Text style={s.metaText} numberOfLines={1}>{subtitle}</Text>}
          {waiting && (
            <View style={s.waitingChip}>
              <Text style={s.waitingChipText}>WAITING ON YOU</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={[s.preview, unread && s.previewUnread]} numberOfLines={1}>{conv.preview ?? ''}</Text>
          {unread && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{conv.coach_unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 8 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginBottom: 24 },

    searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 12 },
    searchInput: { flex: 1, fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text, padding: 0 },

    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: C.surfaceAlt },
    filterBtnActive: { backgroundColor: C.text },
    filterBtnText: { fontFamily: FontFamily.eyebrow, fontSize: 11, color: C.textMuted },
    filterBtnTextActive: { color: C.background },
    filterCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 100, backgroundColor: C.background },
    filterCountActive: { backgroundColor: C.surfaceAlt },
    filterCountText: { fontFamily: FontFamily.monoBold, fontSize: 10, color: C.text },
    filterCountTextActive: { color: C.text },

    emptyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center' },
    emptyTitle: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20 },
    emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    emptyBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    list: { backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    rowUnread: { backgroundColor: C.surfaceAlt },
    avatar: { width: 48, height: 48, borderRadius: 24, flexShrink: 0 },
    avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    avatarFallbackText: { fontFamily: FontFamily.eyebrow, fontSize: 15, color: C.text },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.textMuted, flexShrink: 1 },
    nameUnread: { fontFamily: FontFamily.bodyExtraBold, color: C.text },
    time: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, marginLeft: 'auto', flexShrink: 0 },
    timeUnread: { color: C.text },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
    divisionChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4, backgroundColor: C.surfaceAlt },
    divisionChipText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 9, color: C.textMuted, letterSpacing: 0.3 },
    metaText: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.textDim, flexShrink: 1 },
    waitingChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: PINK_RED },
    waitingChipText: { fontFamily: FontFamily.eyebrow, fontSize: 8.5, color: '#fff', letterSpacing: 0.4 },
    preview: { flex: 1, fontFamily: FontFamily.body, fontSize: 12.5, color: C.textDim },
    previewUnread: { fontFamily: FontFamily.bodyBold, color: C.text },
    badge: { flexShrink: 0, minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 100, backgroundColor: BRAND_GREEN, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontFamily: FontFamily.monoBold, fontSize: 11, color: '#0a0a0a' },
  });
}
