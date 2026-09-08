import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { Colors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';

const STRENGTH_COLOR = (len: number) => (len < 6 ? '#f87171' : len < 9 ? '#fb923c' : Colors.success);
const STRENGTH_LABEL = (len: number) => (len < 6 ? 'Too short' : len < 9 ? 'Fair' : len < 12 ? 'Good' : 'Strong');

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const confirmRef = useRef<TextInput>(null);
  const redirectAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!success) return;
    Animated.timing(redirectAnim, { toValue: 1, duration: 2500, useNativeDriver: false }).start();
    const t = setTimeout(() => router.replace('/(auth)/login'), 2500);
    return () => clearTimeout(t);
  }, [success]);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleUpdate = async () => {
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);

    const { error: authError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Image
            source={require('../../assets/logo-dark.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {success ? (
            <View style={styles.center}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={22} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Password Updated</Text>
              <Text style={styles.sub}>You're good. Redirecting you to login...</Text>
              <View style={styles.redirectBar}>
                <Animated.View
                  style={[
                    styles.redirectFill,
                    { width: redirectAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                  ]}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.center}>
                <Text style={styles.title}>New Password</Text>
                <Text style={styles.sub}>Set a new password for your account</Text>
              </View>

              {!!error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.fields}>
                <AuthInput
                  label="New Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  showToggle
                  textContentType="newPassword"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />

                <AuthInput
                  ref={confirmRef}
                  label="Confirm Password"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="••••••••"
                  showToggle
                  textContentType="newPassword"
                  returnKeyType="done"
                  onSubmitEditing={handleUpdate}
                  error={mismatch ? 'Passwords do not match' : undefined}
                />

                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map(i => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: password.length >= i * 3 ? STRENGTH_COLOR(password.length) : Colors.border },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.strengthLabel}>{STRENGTH_LABEL(password.length)}</Text>
                  </View>
                )}

                <AuthButton
                  label="Update Password →"
                  onPress={handleUpdate}
                  loading={loading}
                  disabled={!password || !confirm}
                />
              </View>

              <Pressable style={styles.switchRow} onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
                <Text style={styles.backLink}>← Back to login</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 32,
  },
  logo: {
    height: 30,
    width: 140,
    alignSelf: 'center',
    marginBottom: 28,
  },
  center: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: FontFamily.statNumber,
    fontSize: 30,
    color: Colors.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sub: {
    fontFamily: FontFamily.body,
    fontWeight: '300',
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  successIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(113,255,126,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(113,255,126,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontFamily: FontFamily.statNumber,
    fontSize: 24,
    color: Colors.text,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  redirectBar: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.border,
    borderRadius: 1,
    overflow: 'hidden',
    marginTop: 20,
  },
  redirectFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: '#f87171',
  },
  fields: {
    gap: 0,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  strengthLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textDim,
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  backLink: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: '#ffffff',
  },
});
