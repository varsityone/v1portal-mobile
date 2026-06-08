import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { Colors } from '../../constants/Colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
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
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.logo}>
            <Text style={styles.logoAccent}>V1</Text>Portal
          </Text>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.description}>
            Enter your email and we'll send you a link to set a new password.
          </Text>
        </View>

        <View style={styles.form}>
          {sent ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successText}>
                We sent a password reset link to{' '}
                <Text style={styles.successEmail}>{email.trim()}</Text>
              </Text>
            </View>
          ) : (
            <>
              {!!error && <Text style={styles.errorBanner}>{error}</Text>}
              <AuthInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />
              <AuthButton
                label="Send Reset Link"
                onPress={handleReset}
                loading={loading}
              />
            </>
          )}
        </View>

        <Pressable
          style={styles.loginLink}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.loginLinkText}>Back to sign in</Text>
        </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  back: {
    marginBottom: 36,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  header: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 38,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: 16,
  },
  logoAccent: {
    color: Colors.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  form: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 8,
    padding: 12,
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 10,
    padding: 20,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 6,
  },
  successText: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  successEmail: {
    color: Colors.text,
    fontWeight: '500',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 36,
    paddingVertical: 8,
  },
  loginLinkText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
