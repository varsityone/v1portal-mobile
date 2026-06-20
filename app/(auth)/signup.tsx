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
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { signUpWithApple } from '../../lib/appleAuth';
import { savePendingRole, type AccountRole } from '../../lib/roleStorage';
import { AuthInput } from '../../components/AuthInput';
import { AuthButton } from '../../components/AuthButton';
import { GoogleButton } from '../../components/GoogleButton';
import { Colors } from '../../constants/Colors';

type RoleId = AccountRole;

const ROLES: Array<{ id: RoleId; label: string; sub: string }> = [
  { id: 'athlete',       label: "I'm the Athlete",      sub: "Building my own recruiting profile" },
  { id: 'parent',        label: "I'm a Parent",          sub: "Helping my son or daughter get recruited" },
  { id: 'flag_football', label: "Flag Football – Girls", sub: "Join the waitlist for our girls program" },
];

export default function SignupScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const requireRole = (): boolean => {
    if (!selectedRole) {
      setError('Please select your role to continue.');
      return false;
    }
    return true;
  };

  const handleGoogleSignUp = async () => {
    if (!requireRole()) return;
    setGoogleLoading(true);
    setError('');
    await savePendingRole(selectedRole!);
    const { error: gErr } = await signInWithGoogle();
    setGoogleLoading(false);
    if (gErr) setError(gErr);
  };

  const handleAppleSignUp = async () => {
    if (!requireRole()) return;
    setAppleLoading(true);
    setError('');
    const { error: aErr } = await signUpWithApple(selectedRole!);
    setAppleLoading(false);
    if (aErr) setError(aErr);
  };

  const handleSignup = async () => {
    if (!requireRole()) return;
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
      const isFlagFootball = selectedRole === 'flag_football';
      supabase.from('athletes').upsert([{
        user_id: authData.user.id,
        email: authData.user.email ?? email.trim().toLowerCase(),
        full_name: fullName,
        account_role: isFlagFootball ? 'flag_football' : (selectedRole ?? 'athlete'),
        ...(isFlagFootball && { flag_football_waitlist: true }),
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
          <Text style={styles.title}>Know Your Real Targets.</Text>
          <Text style={styles.subtitle}>Create your free V1Portal account</Text>
        </View>

        {/* Role Selection */}
        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Who are you?</Text>
          {ROLES.map(role => {
            const isSelected = selectedRole === role.id;
            return (
              <Pressable
                key={role.id}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => { setSelectedRole(role.id); setError(''); }}
              >
                <View style={[styles.roleRadio, isSelected && styles.roleRadioSelected]}>
                  {isSelected && <View style={styles.roleRadioDot} />}
                </View>
                <View style={styles.roleContent}>
                  <Text style={[styles.roleTitle, isSelected && styles.roleTitleSelected]}>
                    {role.label}
                  </Text>
                  <Text style={styles.roleSub}>{role.sub}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBanner}>
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
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={10}
              style={styles.appleBtn}
              onPress={handleAppleSignUp}
            />
          )
        )}

        {/* Google */}
        <GoogleButton onPress={handleGoogleSignUp} loading={googleLoading} />

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with email</Text>
          <View style={styles.dividerLine} />
        </View>

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
    paddingTop: Platform.OS === 'ios' ? 72 : (StatusBar.currentHeight ?? 24) + 24,
    paddingBottom: 48,
  },
  logo: {
    height: 30,
    width: 140,
    marginBottom: 40,
  },
  heading: {
    marginBottom: 24,
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
  roleSection: {
    marginBottom: 20,
    gap: 8,
  },
  roleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
  },
  roleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(131,58,180,0.06)',
  },
  roleRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleRadioSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  roleRadioDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  roleContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  roleTitleSelected: {
    color: Colors.primary,
  },
  roleSub: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 11,
    color: Colors.textDim,
    fontWeight: '500',
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
