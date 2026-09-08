import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { signInWithApple } from '../../lib/appleAuth';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { GoogleButton } from '../../components/GoogleButton';
import { Colors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    const { error: gErr } = await signInWithGoogle();
    setGoogleLoading(false);
    if (gErr) setError(gErr);
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError('');
    const { error: aErr } = await signInWithApple();
    setAppleLoading(false);
    if (aErr) setError(aErr);
  };

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
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>Log in to your V1Portal® account</Text>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#f87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Apple (iOS only) */}
        {Platform.OS === 'ios' && (
          appleLoading ? (
            <View style={styles.appleLoadingWrap}>
              <ActivityIndicator color={Colors.text} />
            </View>
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={10}
              style={styles.appleBtn}
              onPress={handleAppleSignIn}
            />
          )
        )}

        {/* Google */}
        <GoogleButton onPress={handleGoogleSignIn} loading={googleLoading} />

        {/* Divider */}
        <View style={styles.divider}>
          <Text style={styles.dividerText}>or log in with email</Text>
        </View>

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

          <AuthButton label="Log In →" onPress={handleLogin} loading={loading} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/(auth)/signup/role')} hitSlop={8}>
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
    paddingTop: Platform.OS === 'ios' ? 72 : (StatusBar.currentHeight ?? 24) + 24,
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
    fontFamily: FontFamily.statNumber,
    fontSize: 38,
    color: Colors.text,
    letterSpacing: -1.3,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontWeight: '300',
    fontSize: 13,
    color: Colors.textMuted,
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
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  fieldLabel: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  forgotText: {
    fontFamily: FontFamily.bodySemi,
    fontSize: 11,
    color: '#fff',
  },
  appleBtn: {
    width: '100%',
    height: 50,
    marginBottom: 12,
    marginTop: 4,
  },
  appleLoadingWrap: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerText: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    color: Colors.textDim,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
    fontSize: 12,
  },
  footerLink: {
    fontFamily: FontFamily.bodySemi,
    color: '#fff',
    fontSize: 12,
  },
});
