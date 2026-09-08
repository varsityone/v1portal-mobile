import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { Colors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'v1portal://reset-password' }
    );

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
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

          {sent ? (
            <View style={styles.center}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={22} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.sub}>
                We sent a reset link to <Text style={styles.emailBold}>{email.trim()}</Text>.
                Check your inbox and follow the instructions.
              </Text>
              <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
                <Text style={styles.backLink}>← Back to login</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.center}>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.sub}>Enter your email and we'll send you a reset link</Text>
              </View>

              {!!error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.fields}>
                <AuthInput
                  label="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="done"
                  onSubmitEditing={handleReset}
                />
                <AuthButton label="Send Reset Link →" onPress={handleReset} loading={loading} />
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
  emailBold: {
    fontFamily: FontFamily.bodySemi,
    color: Colors.text,
  },
  backLink: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: '#ffffff',
    marginTop: 18,
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
    gap: 16,
  },
  switchRow: {
    alignItems: 'center',
    marginTop: 4,
  },
});
