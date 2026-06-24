import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { registerForPushNotifications } from '../../lib/notifications';
import { useColors } from '../../context/ThemeContext';
import { ThemeColors } from '../../constants/Colors';

// ─── Row components ───────────────────────────────────────────────────────────

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  destructive?: boolean;
};

function SettingsRow({ icon, label, onPress, destructive }: RowProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <Pressable
      style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      onPress={onPress}
    >
      <View style={s.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? C.error : C.textMuted}
        />
      </View>
      <Text style={[s.rowLabel, destructive && s.rowDestructive]}>
        {label}
      </Text>
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color={C.icon} />
      )}
    </Pressable>
  );
}

type ToggleRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
};

function ToggleRow({ icon, label, sublabel, value, onValueChange, disabled }: ToggleRowProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>
        <Ionicons name={icon} size={18} color={C.icon} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sublabel ? (
          <Text style={s.rowSublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: C.border, true: C.primary }}
        thumbColor={C.white}
        ios_backgroundColor={C.border}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [togglingPush, setTogglingPush] = useState(false);

  const fetchNotifPrefs = useCallback(async () => {
    if (!userId) return;

    const { data: ath } = await supabase
      .from('athletes')
      .select('id, email_notifications, expo_push_token')
      .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
      .maybeSingle();

    if (ath) {
      setAthleteId(ath.id);
      setEmailNotifs(ath.email_notifications ?? false);
      setPushEnabled(!!ath.expo_push_token);
    }
  }, [userId]);

  useEffect(() => { fetchNotifPrefs(); }, [fetchNotifPrefs]);

  const handleEmailToggle = async (val: boolean) => {
    if (!athleteId || togglingEmail) return;
    setTogglingEmail(true);
    setEmailNotifs(val);
    await supabase
      .from('athletes')
      .update({ email_notifications: val })
      .eq('id', athleteId);
    setTogglingEmail(false);
  };

  const handlePushToggle = async (val: boolean) => {
    if (!session || togglingPush) return;
    setTogglingPush(true);

    if (val) {
      const token = await registerForPushNotifications(session);
      if (!token) {
        Alert.alert(
          'Notifications Blocked',
          'To enable push notifications, go to Settings > V1Portal > Notifications and allow notifications.',
          [{ text: 'OK' }],
        );
        setPushEnabled(false);
      } else {
        setPushEnabled(true);
      }
    } else {
      if (athleteId) {
        await supabase
          .from('athletes')
          .update({ expo_push_token: null })
          .eq('id', athleteId);
      }
      await Notifications.setBadgeCountAsync(0);
      setPushEnabled(false);
    }

    setTogglingPush(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handlePreviewOnboarding = async () => {
    await AsyncStorage.removeItem('v1portal_onboarding_seen');
    router.replace('/onboarding');
  };

  const handleDeleteAccount = () => router.push('/delete-account' as any);

  const handleUnsubscribe = () => router.push('/unsubscribe' as any);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
        <Text style={s.subtitle}>{session?.user?.email}</Text>
      </View>

      <View style={s.group}>
        <Text style={s.groupLabel}>Account</Text>
        <View style={s.groupCard}>
          <SettingsRow icon="person-outline" label="Edit Profile" />
          <SettingsRow icon="lock-closed-outline" label="Change Password" />
        </View>
      </View>

      <View style={s.group}>
        <Text style={s.groupLabel}>Notifications</Text>
        <View style={s.groupCard}>
          <ToggleRow
            icon="mail-outline"
            label="Email Notifications"
            sublabel="Recruiting updates and alerts"
            value={emailNotifs}
            onValueChange={handleEmailToggle}
            disabled={togglingEmail}
          />
          <ToggleRow
            icon="notifications-outline"
            label="Push Notifications"
            sublabel="Real-time alerts on this device"
            value={pushEnabled}
            onValueChange={handlePushToggle}
            disabled={togglingPush}
          />
        </View>
      </View>

      <View style={s.group}>
        <Text style={s.groupLabel}>Assessment</Text>
        <View style={s.groupCard}>
          <SettingsRow
            icon="refresh-outline"
            label="Retake V1 Assessment"
            onPress={() => router.push('/assessment' as any)}
          />
        </View>
      </View>

      <View style={s.group}>
        <Text style={s.groupLabel}>App</Text>
        <View style={s.groupCard}>
          <SettingsRow icon="information-circle-outline" label="About V1Portal" />
          <SettingsRow icon="help-circle-outline" label="Help & Support" />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => router.push('/privacy')}
          />
        </View>
      </View>

      <View style={s.group}>
        <View style={s.groupCard}>
          <SettingsRow
            icon="mail-unread-outline"
            label="Unsubscribe from Emails"
            onPress={handleUnsubscribe}
          />
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
          <SettingsRow
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            destructive
          />
        </View>
      </View>

      {__DEV__ && (
        <View style={s.group}>
          <Text style={s.groupLabel}>Developer</Text>
          <View style={s.groupCard}>
            <SettingsRow
              icon="phone-portrait-outline"
              label="Preview Onboarding Slides"
              onPress={handlePreviewOnboarding}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: C.background,
    },
    container: {
      paddingTop: 20,
      paddingBottom: 32,
      paddingHorizontal: 24,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: C.text,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      color: C.textMuted,
    },
    group: {
      marginBottom: 24,
    },
    groupLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: C.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 8,
      marginLeft: 4,
    },
    groupCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: C.border,
      gap: 12,
    },
    rowPressed: {
      backgroundColor: C.surfaceAlt,
    },
    rowIcon: {
      width: 22,
      alignItems: 'center',
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: C.text,
    },
    rowSublabel: {
      fontSize: 12,
      color: C.textMuted,
      marginTop: 1,
    },
    rowDestructive: {
      color: C.error,
    },
  });
}
