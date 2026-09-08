import { useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../../hooks/useCoachData';
import { useCoachInbox } from '../../../hooks/useCoachInbox';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function MessagesInboxScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { conversations, loading } = useCoachInbox();

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>OUTREACH</Text>
        <Text style={s.title}>Messages</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={s.emptyCard}>
          <View style={s.emptyIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#a78bfa" />
          </View>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyBody}>Start reaching out to prospects to begin conversations</Text>
          <Pressable onPress={() => router.push('/(coach)/search' as any)}>
            <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.emptyBtn}>
              <Text style={s.emptyBtnText}>Find Prospects</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {conversations.map(conv => {
            const athlete = conv.athlete;
            const senderLabel = conv.last_message_from === 'athlete' ? 'They: ' : 'You: ';
            return (
              <Pressable
                key={conv.id}
                style={s.row}
                onPress={() => router.push(`/(coach)/messages/${conv.id}` as any)}
              >
                {athlete?.profile_photo_url ? (
                  <Image source={{ uri: athlete.profile_photo_url }} style={s.photo} />
                ) : (
                  <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.photo} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.name} numberOfLines={1}>{athlete?.full_name ?? 'Unknown'}</Text>
                    {conv.coach_unread_count > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{conv.coach_unread_count}</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.metaRow}>
                    {athlete?.position ? <Text style={s.meta}>{athlete.position}</Text> : null}
                    {athlete?.v1_score != null ? <Text style={s.meta}>V1: {athlete.v1_score}</Text> : null}
                  </View>
                  <Text style={s.lastLine}>
                    {senderLabel}{new Date(conv.last_message_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
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
    eyebrow: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text },

    emptyCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 56, paddingHorizontal: 32, alignItems: 'center' },
    emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(168,85,247,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontFamily: FontFamily.headline, fontSize: 17, color: C.text, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', marginBottom: 20 },
    emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    emptyBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16 },
    photo: { width: 56, height: 56, borderRadius: 10 },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100, backgroundColor: C.primary },
    badgeText: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: '#fff' },
    metaRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    meta: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    lastLine: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, marginTop: 4 },
  });
}
