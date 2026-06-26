import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/Colors';
import { GradientButton } from '../components/GradientButton';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const C = useColors();
  const s = styles(C);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDelete = async () => {
    setStatus('loading');
    try {
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to delete account. Please contact support@v1portal.com.');
      setStatus('error');
      return;
    }
    setStatus('done');
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
              <Text style={s.title}>Account Deleted</Text>
              <Text style={s.body}>
                Your account and personal data have been permanently removed. Your recruiting history has been anonymized for platform analytics.
              </Text>
              <GradientButton
                style={s.btnPrimary}
                onPress={async () => {
                  try { await supabase.auth.signOut(); } catch {}
                  router.replace('/(auth)/login' as any);
                }}
              >
                <Text style={s.btnPrimaryText}>Return to Home</Text>
              </GradientButton>
            </>
          )}

          {status === 'error' && (
            <>
              <View style={[s.iconCircle, s.iconError]}>
                <Ionicons name="alert-circle-outline" size={24} color="#e63535" />
              </View>
              <Text style={s.title}>Something went wrong</Text>
              <Text style={s.body}>{errorMsg}</Text>
              <View style={s.btnGroup}>
                <Pressable style={s.btnDestructive} onPress={() => setStatus('idle')}>
                  <Text style={s.btnPrimaryText}>Try Again</Text>
                </Pressable>
                <Pressable style={s.btnGhost} onPress={() => router.back()}>
                  <Text style={s.btnGhostText}>Back to Settings</Text>
                </Pressable>
              </View>
            </>
          )}

          {(status === 'idle' || status === 'loading') && (
            <>
              <View style={[s.iconCircle, s.iconError]}>
                <Ionicons name="trash-outline" size={22} color="#e63535" />
              </View>
              <Text style={s.title}>Delete Account</Text>
              <Text style={s.body}>
                This will permanently delete your account and all personal data. Your recruiting history will be anonymized and retained for platform analytics only.
              </Text>
              <Text style={s.subBody}>This action cannot be undone.</Text>
              <View style={s.btnGroup}>
                <Pressable
                  style={[s.btnDestructive, status === 'loading' && s.btnDisabled]}
                  onPress={handleDelete}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.btnPrimaryText}>Yes, Delete My Account</Text>
                  )}
                </Pressable>
                <Pressable style={s.btnGhost} onPress={() => router.back()} disabled={status === 'loading'}>
                  <Text style={s.btnGhostText}>Cancel — keep my account</Text>
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
    backgroundColor: '#111',
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
    marginBottom: 10,
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
    borderColor: 'rgba(255,255,255,0.12)',
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
    color: C.primary,
  },
});
