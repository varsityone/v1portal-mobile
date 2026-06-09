import { useRef, useState } from 'react';
import {
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
import { supabase } from '../../lib/supabase';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { Colors } from '../../constants/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace('/(tabs)');
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
        {/* Logo */}
        <Image
          source={require('../../assets/logo-dark.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.title}>Welcome Back.</Text>
          <Text style={styles.subtitle}>Sign in to your V1Portal® account</Text>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Fields */}
        <View style={styles.fields}>
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <View>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Pressable onPress={() => router.push('/(auth)/forgot-password')} hitSlop={8}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>
            <AuthInput
              ref={passwordRef}
              label=""
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              showToggle
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <AuthButton label="Sign In →" onPress={handleLogin} loading={loading} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/signup')}>
            <Text style={styles.footerLink}>Sign up free</Text>
          </Pressable>
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
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 48,
  },
  logo: {
    height: 30,
    width: 140,
    marginBottom: 40,
  },
  heading: {
    marginBottom: 28,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1.4,
    lineHeight: 42,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '300',
    color: Colors.textMuted,
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
  },
  fields: {
    gap: 0,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  forgotText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
});
