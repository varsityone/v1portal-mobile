import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAthleteData } from '../../hooks/useAthleteData';
import { supabase } from '../../lib/supabase';
import { registerForPushNotifications } from '../../lib/notifications';
import { requestTour } from '../../lib/onboardingTour';
import { getTierFromAthlete, getTierColor } from '../../lib/tierColors';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

function generateInviteToken(): string {
  const rand = () => Math.random().toString(36).slice(2);
  return `${rand()}${rand()}${Date.now().toString(36)}${rand()}`.slice(0, 48);
}

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { athlete, refresh } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyPulse, setWeeklyPulse] = useState(true);
  const [scoreUpdates, setScoreUpdates] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteLink, setInviteLink] = useState(
    athlete?.invite_token && !athlete?.invite_claimed ? `https://v1portal.com/claim/${athlete.invite_token}` : ''
  );

  useMemo(() => {
    if (athlete) {
      setEmailNotifications(athlete.email_notifications !== false);
      setWeeklyPulse(athlete.weekly_pulse !== false);
      setScoreUpdates(athlete.score_update_notifications !== false);
      setPushEnabled(!!(athlete as any).expo_push_token);
      if (athlete.invited_athlete_email) setInviteEmail(athlete.invited_athlete_email);
    }
  }, [athlete?.id]);

  const isParent = athlete?.account_role === 'parent';
  const tierName = getTierFromAthlete(athlete);
  const tierBg = getTierColor(athlete);

  const handleSave = async () => {
    if (!athlete) return;
    setSaving(true);
    await supabase
      .from('athletes')
      .update({ email_notifications: emailNotifications, weekly_pulse: weeklyPulse, score_update_notifications: scoreUpdates })
      .eq('id', athlete.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handlePushToggle = async (val: boolean) => {
    if (!session || togglingPush || !athlete) return;
    setTogglingPush(true);
    if (val) {
      const token = await registerForPushNotifications(session);
      if (!token) {
        Alert.alert('Notifications Blocked', 'To enable push notifications, go to Settings > V1Portal > Notifications and allow notifications.');
        setPushEnabled(false);
      } else {
        setPushEnabled(true);
      }
    } else {
      await supabase.from('athletes').update({ expo_push_token: null }).eq('id', athlete.id);
      await Notifications.setBadgeCountAsync(0);
      setPushEnabled(false);
    }
    setTogglingPush(false);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !athlete) {
      setInviteError("Enter the athlete's email address");
      return;
    }
    setInviteSending(true);
    setInviteError('');
    try {
      const token = generateInviteToken();
      const { error } = await supabase
        .from('athletes')
        .update({ invite_token: token, invite_claimed: false, invited_athlete_email: inviteEmail.trim() })
        .eq('id', athlete.id);
      if (error) throw error;
      const link = `https://v1portal.com/claim/${token}`;
      setInviteLink(link);
      await Share.share({ message: `You've been invited to V1Portal — set up your athlete account here: ${link}` });
      refresh();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setInviteSending(false);
    }
  };

  const handleManageSubscription = async () => {
    router.push('/(tabs)/upgrade' as any);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handlePreviewOnboarding = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.removeItem('v1portal_onboarding_seen');
    router.replace('/onboarding');
  };

  const handlePreviewTour = async () => {
    await requestTour();
    router.replace('/(tabs)' as any);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Text style={s.title}>Settings</Text>
      <Text style={s.subtitle}>Manage your account preferences and notifications.</Text>

      {/* Account */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Account</Text>

        <View style={[s.row, { borderBottomColor: C.border }]}>
          <View>
            <Text style={[s.rowLabel, { color: C.text }]}>Email Address</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>{session?.user?.email}</Text>
          </View>
        </View>

        <View style={[s.row, { borderBottomColor: C.border }]}>
          <View>
            <Text style={[s.rowLabel, { color: C.text }]}>Account Type</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>{isParent ? 'Parent / Guardian' : 'Athlete'}</Text>
          </View>
        </View>

        {!isParent && (
          <View style={s.rowLast}>
            <View>
              <Text style={[s.rowLabel, { color: C.text }]}>Subscription Tier</Text>
              <Text style={[s.rowSub, { color: tierBg, fontFamily: FontFamily.bodyBold }]}>{tierName}</Text>
            </View>
            {athlete?.subscription_status === 'active' || athlete?.subscription_status === 'trial' ? (
              <Pressable style={[s.pillBtnOutline, { borderColor: C.border2 }]} onPress={handleManageSubscription} disabled={portalLoading}>
                {portalLoading ? <ActivityIndicator size="small" color={C.text} /> : <Text style={[s.pillBtnOutlineText, { color: C.text }]}>Manage</Text>}
              </Pressable>
            ) : (
              <Pressable onPress={() => router.push('/(tabs)/upgrade' as any)}>
                <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pillBtn}>
                  <Text style={s.pillBtnText}>Upgrade</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Invite Athlete — parent accounts only */}
      {isParent && (
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.cardTitle, { color: C.text }]}>Invite Athlete</Text>
          <Text style={[s.cardBody, { color: C.textDim }]}>
            Send your athlete a link so they can create their own login and access this profile directly. They'll be able to see everything you've set up.
          </Text>

          {athlete?.invite_claimed ? (
            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={C.success} />
              <Text style={[s.successText, { color: C.textMuted }]}>Your athlete has claimed their account and is linked to this profile.</Text>
            </View>
          ) : (
            <>
              <View style={s.inviteRow}>
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="Athlete's email address"
                  placeholderTextColor={C.textDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[s.inviteInput, { backgroundColor: C.surfaceAlt, borderColor: C.border, color: C.text }]}
                />
                <Pressable onPress={handleSendInvite} disabled={inviteSending || !inviteEmail.trim()}>
                  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.pillBtn, (inviteSending || !inviteEmail.trim()) && { opacity: 0.6 }]}>
                    <Text style={s.pillBtnText}>{inviteSending ? 'Sending…' : inviteLink ? 'Resend' : 'Send'}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
              {!!inviteError && <Text style={s.errorText}>{inviteError}</Text>}
              {!!inviteLink && (
                <Text style={[s.inviteLinkText, { color: C.textDim }]} numberOfLines={1}>{inviteLink}</Text>
              )}
            </>
          )}
        </View>
      )}

      {/* Email Notifications */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Email Notifications</Text>
        <Text style={[s.cardBody, { color: C.textDim }]}>Control which emails you receive from V1Portal.</Text>

        <View style={[s.toggleRow, { borderBottomColor: C.border }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.rowLabel, { color: C.text }]}>All Email Notifications</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>Master switch — turning this off stops all V1Portal emails.</Text>
          </View>
          <Switch value={emailNotifications} onValueChange={setEmailNotifications} trackColor={{ false: C.border, true: '#000' }} thumbColor="#fff" />
        </View>

        <View style={[s.toggleRow, { borderBottomColor: C.border, opacity: emailNotifications ? 1 : 0.4 }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.rowLabel, { color: C.text }]}>Weekly Recruiting Pulse</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>Your weekly score, top program matches, and D1 requirements scorecard. Sent every Monday.</Text>
          </View>
          <Switch value={emailNotifications && weeklyPulse} onValueChange={setWeeklyPulse} disabled={!emailNotifications} trackColor={{ false: C.border, true: '#000' }} thumbColor="#fff" />
        </View>

        <View style={[s.toggleRowLast, { opacity: emailNotifications ? 1 : 0.4 }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.rowLabel, { color: C.text }]}>Score Update Notifications</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>Get notified when your V1 Score changes after retaking the assessment.</Text>
          </View>
          <Switch value={emailNotifications && scoreUpdates} onValueChange={setScoreUpdates} disabled={!emailNotifications} trackColor={{ false: C.border, true: '#000' }} thumbColor="#fff" />
        </View>
      </View>

      {/* Push Notifications — mobile-only, additive */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.cardTitle, { color: C.text }]}>Push Notifications</Text>
        <View style={s.toggleRowLast}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.rowLabel, { color: C.text }]}>Real-Time Alerts</Text>
            <Text style={[s.rowSub, { color: C.textDim }]}>Get push notifications on this device for new matches and messages.</Text>
          </View>
          <Switch value={pushEnabled} onValueChange={handlePushToggle} disabled={togglingPush} trackColor={{ false: C.border, true: '#000' }} thumbColor="#fff" />
        </View>
      </View>

      {/* Retake Assessment */}
      <View style={[s.card, s.retakeCard, { backgroundColor: C.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.rowLabel, { color: C.text }]}>Retake Assessment</Text>
          <Text style={[s.rowSub, { color: C.textDim }]}>Updated your stats, film, or academics? Retake to get a fresh V1 Score.</Text>
        </View>
        <Pressable onPress={() => router.push('/assessment?retake=true' as any)}>
          <LinearGradient colors={['red', '#aa00ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.retakeBtn}>
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={s.retakeBtnText}>Retake</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Support */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <Text style={[s.sectionLabel, { color: C.textDim }]}>Support</Text>
        <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={() => router.push('/help' as any)}>
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
        <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={() => router.push('/help' as any)}>
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

      {/* Save */}
      <View style={s.saveRow}>
        <Pressable onPress={handleSave} disabled={saving}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.saveBtn, saving && { opacity: 0.7 }]}>
            <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Preferences'}</Text>
          </LinearGradient>
        </Pressable>
        {saved && (
          <View style={s.savedRow}>
            <Ionicons name="checkmark" size={14} color={C.success} />
            <Text style={[s.savedText, { color: C.success }]}>Saved</Text>
          </View>
        )}
      </View>

      {/* Danger zone */}
      <View style={[s.dangerCard, { backgroundColor: C.surface }]}>
        <View>
          <Text style={s.dangerTitle}>Unsubscribe</Text>
          <Text style={[s.cardBody, { color: C.textDim, marginBottom: 14 }]}>Stop all emails from V1Portal. You can re-enable anytime from this page.</Text>
          <Pressable style={s.dangerBtn} onPress={() => router.push('/unsubscribe' as any)}>
            <Text style={s.dangerBtnText}>Unsubscribe from all emails</Text>
          </Pressable>
        </View>
        <View style={[s.dangerDivider, { borderTopColor: 'rgba(230,53,53,0.15)' }]}>
          <Text style={s.dangerTitle}>Delete Account</Text>
          <Text style={[s.cardBody, { color: C.textDim, marginBottom: 14 }]}>Permanently delete your account and all personal data. Your recruiting history will be anonymized for platform analytics. This cannot be undone.</Text>
          <Pressable style={s.dangerBtn} onPress={() => router.push('/delete-account' as any)}>
            <Text style={s.dangerBtnText}>Delete Account</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={[s.dangerBtn, s.signOutBtn]} onPress={handleSignOut}>
        <Text style={s.dangerBtnText}>Sign Out</Text>
      </Pressable>

      {__DEV__ && (
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Text style={[s.sectionLabel, { color: C.textDim }]}>Developer</Text>
          <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={handlePreviewOnboarding}>
            <Text style={[s.rowLabel, { color: C.text }]}>Preview Onboarding Slides</Text>
          </Pressable>
          <Pressable style={[s.linkRow, { borderTopColor: C.border }]} onPress={handlePreviewTour}>
            <Text style={[s.rowLabel, { color: C.text }]}>Preview Dashboard Tour</Text>
          </Pressable>
        </View>
      )}
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

    pillBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
    pillBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#fff' },
    pillBtnOutline: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
    pillBtnOutlineText: { fontFamily: FontFamily.bodyBold, fontSize: 11 },

    successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: 'rgba(113,255,126,0.08)' },
    successText: { flex: 1, fontFamily: FontFamily.body, fontSize: 13 },
    inviteRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    inviteInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontFamily: FontFamily.body, fontSize: 13 },
    errorText: { fontFamily: FontFamily.body, fontSize: 12, color: '#e63535', marginBottom: 8 },
    inviteLinkText: { fontFamily: FontFamily.mono, fontSize: 11 },

    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
    toggleRowLast: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },

    retakeCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    retakeBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, marginTop: 8 },
    linkRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },

    saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    saveBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 100 },
    saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    savedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    savedText: { fontFamily: FontFamily.bodySemi, fontSize: 13 },

    dangerCard: { borderWidth: 1, borderColor: 'rgba(230,53,53,0.2)', borderRadius: 16, padding: 20, marginTop: 24, gap: 20 },
    dangerTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#e63535', marginBottom: 8 },
    dangerDivider: { borderTopWidth: 1, paddingTop: 20 },
    dangerBtn: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(230,53,53,0.3)' },
    dangerBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: '#e63535' },
    signOutBtn: { marginTop: 16, alignSelf: 'center' },
  });
}
