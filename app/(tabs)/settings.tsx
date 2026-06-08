import { useCallback, useEffect, useState } from 'react';
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
import { Colors } from '../../constants/Colors';

// ─── Row components ───────────────────────────────────────────────────────────

type RowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  destructive?: boolean;
};

function SettingsRow({ icon, label, onPress, destructive }: RowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={destructive ? Colors.error : Colors.textMuted}
        />
      </View>
      <Text style={[styles.rowLabel, destructive && styles.rowDestructive]}>
        {label}
      </Text>
      {!destructive && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
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
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? (
          <Text style={styles.rowSublabel}>{sublabel}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={Colors.white}
        ios_backgroundColor={Colors.border}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;

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
        // Permissions denied — guide user to Settings
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
      // Revoke by clearing the stored token
      if (athleteId) {
        await supabase
          .from('athletes')
          .update({ expo_push_token: null })
          .eq('id', athleteId);
      }
      // We can't programmatically revoke OS permissions, but clearing the token
      // means the server won't send anything to this device.
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>{session?.user?.email}</Text>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Account</Text>
        <View style={styles.groupCard}>
          <SettingsRow icon="person-outline" label="Edit Profile" />
          <SettingsRow icon="lock-closed-outline" label="Change Password" />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Notifications</Text>
        <View style={styles.groupCard}>
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

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Assessment</Text>
        <View style={styles.groupCard}>
          <SettingsRow
            icon="refresh-outline"
            label="Retake V1 Assessment"
            onPress={() => router.push('/assessment' as any)}
          />
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>App</Text>
        <View style={styles.groupCard}>
          <SettingsRow icon="information-circle-outline" label="About V1Portal" />
          <SettingsRow icon="help-circle-outline" label="Help & Support" />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => router.push('/privacy')}
          />
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.groupCard}>
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          />
        </View>
      </View>

      {__DEV__ && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Developer</Text>
          <View style={styles.groupCard}>
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  group: {
    marginBottom: 24,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  rowIcon: {
    width: 22,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  rowSublabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  rowDestructive: {
    color: Colors.error,
  },
});
