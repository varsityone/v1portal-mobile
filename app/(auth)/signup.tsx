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

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else if (authData.user) {
      supabase.from('athletes').upsert([{
        user_id: authData.user.id,
        email: authData.user.email ?? email.trim().toLowerCase(),
        full_name: fullName,
        account_role: 'athlete',
      }], { onConflict: 'user_id' }).then(() => {});

      fetch('https://v1portal.com/api/email/transactional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.EXPO_PUBLIC_V1_API_KEY ?? '',
        },
        body: JSON.stringify({
          type: 'pre_welcome',
          to: authData.user.email ?? email.trim().toLowerCase(),
          data: { firstName: firstName.trim() },
        }),
      }).catch(() => {});

      router.replace('/(tabs)');
    }
  };

  const passwordMismatch = !!confirmPassword && password !== confirmPassword;

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
          <Text style={styles.title}>Get Recruited.</Text>
          <Text style={styles.subtitle}>Create your free V1Portal account</Text>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Fields */}
        <View style={styles.fields}>
          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <AuthInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="John"
                textContentType="givenName"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => lastNameRef.current?.focus()}
              />
            </View>
            <View style={styles.nameSpacer} />
            <View style={styles.nameField}>
              <AuthInput
                ref={lastNameRef}
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Smith"
                textContentType="familyName"
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </View>
          </View>

          <AuthInput
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AuthInput
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            showToggle
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
          />

          <View>
            <AuthInput
              ref={confirmRef}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              showToggle
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
            {passwordMismatch && (
              <Text style={styles.mismatch}>Passwords do not match</Text>
            )}
          </View>

          <AuthButton label="Create Account →" onPress={handleSignup} loading={loading} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>

        <Text style={styles.terms}>
          By signing up you agree to our Terms and Privacy Policy
        </Text>
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
  nameRow: {
    flexDirection: 'row',
  },
  nameField: {
    flex: 1,
  },
  nameSpacer: {
    width: 12,
  },
  mismatch: {
    fontSize: 11,
    color: '#f87171',
    marginTop: -12,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
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
  terms: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textDim,
  },
});
