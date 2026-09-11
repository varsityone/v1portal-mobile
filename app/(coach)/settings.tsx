import { requestCoachTour } from '../../lib/coachTour';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCoachData } from '../../hooks/useCoachData';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

export default function CoachSettingsScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { session, signOut } = useAuth();
  const { coach } = useCoachData();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Text style={s.title}>Settings</Text>
      <Text style={s.subtitle}>Manage your account and how V1Portal reaches you.</Text>

      {/* Account */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Account</Text>

        <View style={[s.row, { borderBottomColor: C.border }]}>
          <View>
            <Text style={[s.rowLabel, { color: C.text }]}>School Email</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>{coach?.school_email ?? session?.user?.email}</Text>
          </View>
        </View>

        <View style={s.rowLast}>
          <View>
            <Text style={[s.rowLabel, { color: C.text }]}>Program Profile</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>{coach?.school_name ?? 'Not set'}</Text>
          </View>
          <Pressable style={[s.pillBtnOutline, { borderColor: C.border2 }]} onPress={() => router.push('/(coach)/profile/edit' as any)}>
            <Text style={[s.pillBtnOutlineText, { color: C.text }]}>Edit</Text>
          </Pressable>
        </View>
      </View>

      {/* Notifications */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Notifications</Text>
        <Text style={[s.cardBody, { color: C.textDim }]}>Choose which emails and push alerts you get from V1Portal.</Text>
        <Pressable onPress={() => router.push('/(coach)/notifications-settings' as any)}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pillBtn}>
            <Text style={s.pillBtnText}>Notification Preferences →</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Recruiting Compliance */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Recruiting Compliance</Text>
        <Pressable style={[s.pillBtnOutline, { borderColor: C.border2, alignSelf: 'flex-start' }]} onPress={() => router.push('/(coach)/compliance' as any)}>
          <Text style={[s.pillBtnOutlineText, { color: C.text }]}>View Compliance Calendar →</Text>
        </Pressable>
      </View>

      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Dashboard Tour</Text>
        <Pressable accessibilityRole="button" style={[s.linkRow, { borderTopColor: C.border }]} onPress={async () => {
          await requestCoachTour();
          router.push('/(coach)' as any);
        }}>
          <Text style={[s.rowLabel, { color: C.text }]}>Preview Dashboard Tour</Text>
          <Ionicons name="play-outline" size={18} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Support */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.sectionLabel, { color: C.textDim }]}>Support</Text>
        <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={() => router.push('/(coach)/help' as any)}>
          <View style={s.linkRowLeft}>
            <Ionicons name="help-circle-outline" size={18} color={C.textMuted} />
            <View>
              <Text style={[s.rowLabel, { color: C.text }]}>Help & Support</Text>
              <Text style={[s.rowSub, { color: C.textDim }]}>FAQs and contact support</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Feedback */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.sectionLabel, { color: C.textDim }]}>Feedback</Text>
        <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={() => router.push('/(coach)/help?subject=feedback' as any)}>
          <View style={s.linkRowLeft}>
            <Ionicons name="chatbubble-outline" size={18} color={C.textMuted} />
            <View>
              <Text style={[s.rowLabel, { color: C.text }]}>Share Feedback</Text>
              <Text style={[s.rowSub, { color: C.textDim }]}>Help us improve V1Portal</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Legal */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.sectionLabel, { color: C.textDim }]}>Legal</Text>
        <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={() => router.push('/terms' as any)}>
          <View style={s.linkRowLeft}>
            <Ionicons name="document-text-outline" size={18} color={C.textMuted} />
            <Text style={[s.rowLabel, { color: C.text }]}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Pressable>
        <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={() => router.push('/privacy' as any)}>
          <View style={s.linkRowLeft}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.textMuted} />
            <Text style={[s.rowLabel, { color: C.text }]}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </Pressable>
      </View>

      <Pressable style={s.signOutBtn} onPress={handleSignOut}>
        <Text style={s.signOutBtnText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 56 },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginBottom: 20 },

    card: { borderRadius: 16, padding: 20, marginBottom: 16 },
    cardTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, marginBottom: 16 },
    cardBody: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18, marginBottom: 16 },
    sectionLabel: { fontFamily: FontFamily.bodyBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },

    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    rowLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    rowLabel: { fontFamily: FontFamily.bodySemi, fontSize: 13, marginBottom: 2 },
    rowSub: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 17 },

    pillBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
    pillBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#fff' },
    pillBtnOutline: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
    pillBtnOutlineText: { fontFamily: FontFamily.bodyBold, fontSize: 11 },

    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, marginTop: 8 },
    linkRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },

    signOutBtn: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(230,53,53,0.3)', marginTop: 16 },
    signOutBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: '#e63535' },
  });
}
