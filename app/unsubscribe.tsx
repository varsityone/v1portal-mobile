import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/Colors';
import { GradientButton } from '../components/GradientButton';

export default function UnsubscribeScreen() {
  const router = useRouter();
  const { account } = useLocalSearchParams<{ account?: string }>();
  const isCoach = account === 'coach';
  const C = useColors();
  const s = styles(C);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [alreadyOff, setAlreadyOff] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isCoach) {
      const { data: coach, error } = await supabase.from('coach_accounts').select('id').eq('user_id', user.id).single();
      if (error || !coach) { setStatus('error'); return; }
      setProfileId(coach.id);
      const { data, error: settingsError } = await supabase.from('coach_notification_settings')
        .select('email_new_messages, email_new_matches, email_daily_digest').eq('coach_id', coach.id).maybeSingle();
      if (settingsError) { setStatus('error'); return; }
      if (data && data.email_new_messages === false && data.email_new_matches === false && data.email_daily_digest === false) {
        setAlreadyOff(true);
        setStatus('done');
      }
    } else {
      const { data: ath, error } = await supabase.from('athletes').select('id, email_notifications')
        .or(`user_id.eq.${user.id},linked_user_id.eq.${user.id}`).maybeSingle();
      if (error || !ath) { setStatus('error'); return; }
      setProfileId(ath.id);
      if (ath.email_notifications === false) { setAlreadyOff(true); setStatus('done'); }
    }
  }, [isCoach]);

  useEffect(() => { fetchStatus().catch(() => setStatus('error')); }, [fetchStatus]);

  const saveEmailPreferences = async (enabled: boolean) => {
    if (!profileId) throw new Error('Account not found.');
    const result = isCoach
      ? await supabase.from('coach_notification_settings').upsert({
          coach_id: profileId, email_new_messages: enabled, email_new_matches: enabled, email_daily_digest: enabled,
        }, { onConflict: 'coach_id' }).select('coach_id').single()
      : await supabase.from('athletes').update({
          email_notifications: enabled, weekly_pulse: enabled, score_update_notifications: enabled,
        }).eq('id', profileId).select('id').single();
    if (result.error) throw result.error;
  };

  const handleUnsubscribe = async () => {
    setStatus('loading');
    try {
      await saveEmailPreferences(false);

      setStatus('done');
    } catch (err: any) {
      setStatus('error');
    }
  };

  const handleResubscribe = async () => {
    setStatus('loading');
    try {
      await saveEmailPreferences(true);
      setAlreadyOff(false);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>

        {/* Logo */}
        <Image
          source={require('../assets/logo-mark.png')}
          style={s.logo}
          resizeMode="contain"
        />

        <View style={s.card}>

          {status === 'done' && (
            <>
              <View style={[s.iconCircle, s.iconSuccess]}>
                <Ionicons name="checkmark" size={24} color="#71ff7e" />
              </View>
              <Text style={s.title}>
                {alreadyOff ? 'Already unsubscribed' : "You're unsubscribed"}
              </Text>
              <Text style={s.body}>
                {alreadyOff
                  ? "You're already opted out of V1Portal emails. No action needed."
                  : "You won't receive any more emails from V1Portal. Your account and data are still active."}
              </Text>
              <View style={s.btnGroup}>
                <Pressable style={s.btnGhost} onPress={handleResubscribe}>
                  <Text style={s.btnGhostText}>Re-enable emails</Text>
                </Pressable>
                <GradientButton style={s.btnPrimary} onPress={() => router.replace((isCoach ? '/(coach)' : '/(tabs)') as any)}>
                  <Text style={s.btnPrimaryText}>Go to Dashboard</Text>
                </GradientButton>
              </View>
            </>
          )}

          {status === 'error' && (
            <>
              <View style={[s.iconCircle, s.iconError]}>
                <Ionicons name="alert-circle-outline" size={24} color="#e63535" />
              </View>
              <Text style={s.title}>Something went wrong</Text>
              <Text style={s.body}>
                We couldn't process your request. Try again or manage your preferences from Settings.
              </Text>
              <GradientButton style={s.btnPrimary} onPress={() => router.back()}>
                <Text style={s.btnPrimaryText}>Go to Settings</Text>
              </GradientButton>
            </>
          )}

          {(status === 'idle' || status === 'loading') && (
            <>
              <View style={[s.iconCircle, s.iconPrimary]}>
                <Ionicons name="mail" size={22} color="#fff" />
              </View>
              <Text style={s.title}>Unsubscribe from emails</Text>
              <Text style={s.body}>
                {isCoach ? 'This will stop recruiting emails about new messages, new matches, and your daily digest.' : 'This will stop all emails from V1Portal including your weekly recruiting pulse and score update notifications.'}
              </Text>
              <Text style={s.subBody}>
                Your account and all your data stay active. You can re-enable emails anytime from Settings.
              </Text>
              <View style={s.btnGroup}>
                <Pressable
                  style={[s.btnDestructive, status === 'loading' && s.btnDisabled]}
                  onPress={handleUnsubscribe}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.btnPrimaryText}>Yes, unsubscribe me</Text>
                  )}
                </Pressable>
                <Pressable style={s.btnGhost} onPress={() => router.back()} disabled={status === 'loading'}>
                  <Text style={s.btnGhostText}>Cancel — keep my emails</Text>
                </Pressable>
              </View>
            </>
          )}

        </View>

        <Text style={s.support}>
          Need help?{' '}
          <Text style={s.supportLink}>support@v1portal.com</Text>
        </Text>

      </View>
    </SafeAreaView>
  );
}

const styles = (C: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.background,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 40,
  },
  card: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconSuccess: {
    backgroundColor: 'rgba(113,255,126,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(113,255,126,0.2)',
  },
  iconError: {
    backgroundColor: 'rgba(230,53,53,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(230,53,53,0.2)',
  },
  iconPrimary: {
    backgroundColor: 'rgba(131,58,180,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(131,58,180,0.15)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  subBody: {
    fontSize: 12,
    color: C.textDim,
    textAlign: 'center',
    marginBottom: 24,
  },
  btnGroup: {
    width: '100%',
    gap: 10,
  },
  btnPrimary: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 100,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  btnDestructive: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 100,
    backgroundColor: '#e63535',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnGhost: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textMuted,
  },
  support: {
    fontSize: 12,
    color: C.textDim,
    marginTop: 24,
  },
  supportLink: {
    color: '#fff',
  },
});
