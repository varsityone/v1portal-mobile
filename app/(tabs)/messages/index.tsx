import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { useAthleteInbox } from '../../../hooks/useAthleteInbox';
import { needsNcaaRegistration } from '../../../lib/profileCompleteness';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function MessagesInboxScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { athlete, loading: athleteLoading } = useAthleteData();
  const { conversations, loading, refresh } = useAthleteInbox();
  const [ncaaBannerDismissed, setNcaaBannerDismissed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (athleteLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Text style={s.title}>Messages</Text>
      <Text style={s.subtitle}>Conversations with coaches who want to recruit you</Text>

      {!ncaaBannerDismissed && needsNcaaRegistration(athlete) && (
        <View style={s.ncaaBanner}>
          <Ionicons name="warning" size={16} color="#EA0C5F" style={{ marginTop: 1, flexShrink: 0 }} />
          <Text style={s.ncaaBannerText}>
            <Text style={s.ncaaBannerBold}>NCAA Eligibility ID needed.</Text> Coaches will ask before things get serious — register at{' '}
            <Text style={s.ncaaBannerLink} onPress={() => Linking.openURL('https://web3.ncaa.org/ecwr3/')}>eligibilitycenter.org</Text>
            {' '}and add it to your profile.
          </Text>
          <Pressable onPress={() => setNcaaBannerDismissed(true)} hitSlop={8} style={{ flexShrink: 0 }}>
            <Ionicons name="close" size={16} color={C.textDim} />
          </Pressable>
        </View>
      )}

      {conversations.length === 0 ? (
        <View style={s.emptyCard}>
          <View style={s.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={24} color="#71ff7e" />
          </View>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyBody}>Coaches will message you here once they express interest</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {conversations.map(conv => {
            const coach = conv.coach;
            const subtitle = coach?.position_coached && coach?.school_name
              ? `${coach.position_coached} at ${coach.school_name}`
              : coach?.school_name ?? 'Coach';
            return (
              <Pressable
                key={conv.id}
                style={s.row}
                onPress={() => router.push(`/(tabs)/messages/${conv.id}` as any)}
              >
                {coach?.profile_photo_url ? (
                  <Image source={{ uri: coach.profile_photo_url }} style={s.avatar} />
                ) : (
                  <LinearGradient colors={['#71ff7e', '#4ade80']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={s.name} numberOfLines={1}>{coach?.full_name || 'Coach'}</Text>
                    {conv.athlete_unread_count > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{conv.athlete_unread_count}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.preview} numberOfLines={1}>{subtitle}</Text>
                </View>
                <Text style={s.time}>{formatDate(conv.last_message_at)}</Text>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
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
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 8 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginBottom: 32 },

    ncaaBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(234,12,95,0.1)', borderWidth: 1, borderColor: 'rgba(234,12,95,0.3)', borderRadius: 14, padding: 16, marginBottom: 24 },
    ncaaBannerText: { flex: 1, fontFamily: FontFamily.body, fontSize: 13, lineHeight: 19, color: C.textMuted },
    ncaaBannerBold: { fontFamily: FontFamily.bodyBold, color: C.text },
    ncaaBannerLink: { fontFamily: FontFamily.bodyBold, color: '#EA0C5F' },

    emptyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 48, paddingHorizontal: 32, alignItems: 'center' },
    emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(113,255,126,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },

    row: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 },
    avatar: { width: 56, height: 56, borderRadius: 10, flexShrink: 0 },
    name: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff', flexShrink: 1 },
    preview: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: 'rgba(113,255,126,0.2)' },
    badgeText: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', color: '#71ff7e' },
    time: { fontFamily: FontFamily.mono, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  });
}
