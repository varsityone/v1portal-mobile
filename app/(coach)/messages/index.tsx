import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../../hooks/useCoachData';
import { useCoachInbox } from '../../../hooks/useCoachInbox';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Avatar } from '../../../components/ui/Avatar';
import { EmptyState } from '../../../components/ui/EmptyState';

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

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
        <Text style={s.eyebrow}>MESSAGES</Text>
        <Text style={s.title}>Conversations</Text>
      </View>

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          body="Message an athlete to start a conversation."
          actionLabel="Search for Players"
          onAction={() => router.push('/(coach)/search' as any)}
        />
      ) : (
        <View style={{ gap: 8, marginTop: 16 }}>
          {conversations.map(conv => {
            const athlete = conv.athlete;
            const lastSender = conv.last_message_from === 'coach' ? 'You: ' : `${athlete?.full_name?.split(' ')[0]}: `;
            return (
              <Pressable
                key={conv.id}
                style={[s.row, conv.coach_unread_count > 0 && s.rowHighlighted]}
                onPress={() => router.push(`/(coach)/messages/${conv.id}` as any)}
              >
                <Avatar uri={athlete?.profile_photo_url} name={athlete?.full_name} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.name} numberOfLines={1}>{athlete?.full_name ?? 'Unknown'}</Text>
                    {conv.coach_unread_count > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{conv.coach_unread_count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.preview} numberOfLines={1}>{lastSender}{athlete?.position ?? '—'}</Text>
                </View>
                <Text style={s.time}>{formatDate(conv.last_message_at)}</Text>
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
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
    rowHighlighted: { borderColor: `${C.primary}4D`, backgroundColor: `${C.primary}08` },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    preview: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
    badgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 9, color: '#fff' },
    time: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim },
  });
}
