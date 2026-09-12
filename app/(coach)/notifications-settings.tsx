import LoadingScreen from '../../components/LoadingScreen';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { ThemeColors, PINK_RED } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

interface NotificationSettings {
  id: string;
  coach_id: string;
  email_new_messages: boolean;
  email_new_matches: boolean;
  email_daily_digest: boolean;
  push_new_messages: boolean;
  push_new_matches: boolean;
}

export default function NotificationsSettingsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coachLoading || !coach?.id) return;

    async function load() {
      setLoading(true);
      const coachId = coach.id!;
      try {
        let { data } = await supabase
          .from('coach_notification_settings')
          .select('*')
          .eq('coach_id', coachId)
          .maybeSingle();

        if (!data) {
          const { data: created } = await supabase
            .from('coach_notification_settings')
            .insert({ coach_id: coachId })
            .select('*')
            .single();
          data = created;
        }

        setSettings((data as NotificationSettings) ?? null);
      } catch (e) {
        console.error('Load settings error:', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [coachLoading, coach?.id]);

  const handleToggle = useCallback(async (field: keyof NotificationSettings, value: boolean) => {
    if (!settings) return;
    setSaving(true);

    try {
      await supabase
        .from('coach_notification_settings')
        .update({ [field]: value })
        .eq('id', settings.id);

      setSettings({ ...settings, [field]: value });
    } catch (e) {
      console.error('Update error:', e);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (coachLoading || loading) {
    return <LoadingScreen />;
  }

  if (!settings) {
    return <View style={s.center}><Text style={s.errorText}>Unable to load settings</Text></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Notifications</Text>
        <Text style={s.headerSub}>Control how you receive updates</Text>
      </View>

      <View style={s.card}>
        <Text style={s.groupTitle}>Email Notifications</Text>
        <View style={[s.setting, s.settingBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>New Messages</Text>
            <Text style={s.sub}>Get notified when a prospect replies to you</Text>
          </View>
          <Pressable
            onPress={() => handleToggle('email_new_messages', !settings.email_new_messages)}
            disabled={saving}
            style={[s.toggle, settings.email_new_messages && { backgroundColor: PINK_RED }]}
          >
            <View style={[s.toggleThumb, settings.email_new_messages && s.toggleThumbActive]} />
          </Pressable>
        </View>
        <View style={[s.setting, s.settingBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>New Matches</Text>
            <Text style={s.sub}>Get notified when you match with a prospect</Text>
          </View>
          <Pressable
            onPress={() => handleToggle('email_new_matches', !settings.email_new_matches)}
            disabled={saving}
            style={[s.toggle, settings.email_new_matches && { backgroundColor: PINK_RED }]}
          >
            <View style={[s.toggleThumb, settings.email_new_matches && s.toggleThumbActive]} />
          </Pressable>
        </View>
        <View style={s.setting}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Daily Digest</Text>
            <Text style={s.sub}>Receive a daily summary of your recruiting activity</Text>
          </View>
          <Pressable
            onPress={() => handleToggle('email_daily_digest', !settings.email_daily_digest)}
            disabled={saving}
            style={[s.toggle, settings.email_daily_digest && { backgroundColor: PINK_RED }]}
          >
            <View style={[s.toggleThumb, settings.email_daily_digest && s.toggleThumbActive]} />
          </Pressable>
        </View>

        <Text style={[s.groupTitle, { marginTop: 24 }]}>Push Notifications</Text>
        <View style={[s.setting, s.settingBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>New Messages</Text>
            <Text style={s.sub}>Get real-time alerts for new prospect messages</Text>
          </View>
          <Pressable
            onPress={() => handleToggle('push_new_messages', !settings.push_new_messages)}
            disabled={saving}
            style={[s.toggle, settings.push_new_messages && { backgroundColor: PINK_RED }]}
          >
            <View style={[s.toggleThumb, settings.push_new_messages && s.toggleThumbActive]} />
          </Pressable>
        </View>
        <View style={s.setting}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>New Matches</Text>
            <Text style={s.sub}>Get instant alerts when you match with a prospect</Text>
          </View>
          <Pressable
            onPress={() => handleToggle('push_new_matches', !settings.push_new_matches)}
            disabled={saving}
            style={[s.toggle, settings.push_new_matches && { backgroundColor: PINK_RED }]}
          >
            <View style={[s.toggleThumb, settings.push_new_matches && s.toggleThumbActive]} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    headerSub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
    card: { backgroundColor: C.surface, borderRadius: 12, padding: 20 },
    groupTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 4 },
    setting: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
    settingBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    label: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    sub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    toggle: { width: 50, height: 30, borderRadius: 15, backgroundColor: C.border2, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 3 },
    toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.text },
    toggleThumbActive: { alignSelf: 'flex-end' },
    errorText: { fontFamily: FontFamily.body, fontSize: 14, color: C.error },
  });
}
