import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../../lib/supabase';
import { signInWithGoogle } from '../../../lib/googleAuth';
import { signUpWithApple } from '../../../lib/appleAuth';
import { savePendingRole, isAccountRole, ROLE_BLURBS, ROLE_HEADLINES, type AccountRole } from '../../../lib/roleStorage';
import { AuthInput } from '../../../components/AuthInput';
import { GoogleButton } from '../../../components/GoogleButton';
import { GRADIENT } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';

// Matches web's app/(auth)/signup/page.tsx exactly: a full-screen 4-step
// sequential wizard (Name -> Email -> Password -> Finish) on pure black,
// entered from a step-0 role-intro screen, gradient reserved for the final
// submit button only.

const STEP_LABELS = ['Name', 'Email', 'Password', 'Finish'];

export default function SignupWizardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role: AccountRole = isAccountRole(params.role) ? params.role : 'athlete';

  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const confirmRef = useRef<TextInput>(null);

  const canProceed = () => {
    if (step === 1) return fullName.trim().length > 0;
    if (step === 2) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (step === 3) return password.length >= 6 && password === confirmPassword;
    if (step === 4) return agreedToTerms;
    return true;
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }
    if (!authData.user) {
      setLoading(false);
      setError('Something went wrong creating your account. Please try again.');
      return;
    }

    const isFlagFootball = role === 'flag_football';
    const athleteRow = {
      user_id: authData.user.id,
      email: authData.user.email ?? email.trim().toLowerCase(),
      full_name: fullName.trim(),
      account_role: isFlagFootball ? 'flag_football' : role,
      ...(isFlagFootball && { flag_football_waitlist: true }),
    };

    let { error: athleteError } = await supabase.from('athletes').upsert([athleteRow], { onConflict: 'user_id' });
    if (athleteError) {
      await new Promise(r => setTimeout(r, 1000));
      ({ error: athleteError } = await supabase.from('athletes').upsert([athleteRow], { onConflict: 'user_id' }));
    }

    setLoading(false);

    if (athleteError) {
      setError("Your account was created, but we couldn't finish setting up your profile. Please try logging in — if this keeps happening, contact support@v1portal.com.");
      return;
    }

    fetch('https://v1portal.com/api/email/transactional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.EXPO_PUBLIC_V1_API_KEY ?? '',
      },
      body: JSON.stringify({
        type: 'pre_welcome',
        to: authData.user.email ?? email.trim().toLowerCase(),
        data: { firstName: fullName.trim().split(' ')[0] || 'Athlete' },
      }),
    }).catch(() => {});

    // No explicit navigation here — app/_layout.tsx's SIGNED_IN listener
    // handles post-signup routing app-wide (onboarding slides first for a
    // new device/account, then the role-appropriate home route), the same
    // way it already does for Google/Apple sign-up.
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setError('');
    if (step < 4) setStep(s => s + 1);
    else handleFinalSubmit();
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    setError('');
    await savePendingRole(role);
    const { error: gErr } = await signInWithGoogle();
    setGoogleLoading(false);
    if (gErr) setError(gErr);
  };

  const handleAppleSignup = async () => {
    setAppleLoading(true);
    setError('');
    const { error: aErr } = await signUpWithApple(role);
    setAppleLoading(false);
    if (aErr) setError(aErr);
  };

  const backLink = (label: string, onPress: () => void) => (
    <Pressable style={s.backBtn} onPress={onPress} hitSlop={8}>
      <Ionicons name="chevron-back" size={13} color="#6b6d70" />
      <Text style={s.backText}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={s.wizard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.topbar}>
        {step === 0
          ? backLink('Change role', () => router.replace('/(auth)/signup/role'))
          : backLink('Back', () => { setError(''); setStep(s2 => s2 - 1); })}
        {step > 0 && (
          <View style={s.progress}>
            <Text style={s.progressLabel}>STEP {step} OF 4</Text>
            <View style={s.progressTrack}>
              {STEP_LABELS.map((_, i) => (
                <View key={i} style={[s.progressSeg, i < step && s.progressSegFilled]} />
              ))}
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!!error && <Text style={s.error}>{error}</Text>}

        {step === 0 && (
          <>
            <Image source={require('../../../assets/logo-dark.png')} style={s.logo} resizeMode="contain" />
            <View style={s.roleIconWrap}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.roleIconGradient}>
                <Ionicons name={role === 'coach' ? 'clipboard-outline' : role === 'parent' ? 'people-outline' : role === 'flag_football' ? 'flag-outline' : 'body-outline'} size={26} color="#fff" />
              </LinearGradient>
            </View>
            <View style={s.entryCopy}>
              <Text style={s.headline}>{ROLE_HEADLINES[role]}</Text>
              <Text style={s.blurb}>{ROLE_BLURBS[role]}</Text>
            </View>

            {Platform.OS === 'ios' && (
              appleLoading ? (
                <View style={s.appleLoadingWrap}><ActivityIndicator color="#fff" /></View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={10}
                  style={s.appleBtn}
                  onPress={handleAppleSignup}
                />
              )
            )}
            <GoogleButton onPress={handleGoogleSignup} loading={googleLoading} />

            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            <Pressable style={s.btnNeutral} onPress={() => setStep(1)}>
              <Text style={s.btnNeutralText}>{role === 'flag_football' ? 'Join With Email' : 'Sign Up With Email'}</Text>
            </Pressable>

            <Text style={s.footnote}>
              Already have an account?{' '}
              <Text style={s.footnoteLink} onPress={() => router.replace('/(auth)/login')}>Log in</Text>
            </Text>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={s.headlineStep}>What should we call you?</Text>
            <AuthInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
            <Pressable style={[s.btnNeutral, !canProceed() && s.btnDisabled]} disabled={!canProceed()} onPress={handleNext}>
              <Text style={[s.btnNeutralText, !canProceed() && s.btnDisabledText]}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <View>
              <Text style={s.headlineStep}>What's your email?</Text>
              <Text style={s.substep}>We'll send your V1 Score here. No spam, ever.</Text>
            </View>
            <AuthInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
            <Pressable style={[s.btnNeutral, !canProceed() && s.btnDisabled]} disabled={!canProceed()} onPress={handleNext}>
              <Text style={[s.btnNeutralText, !canProceed() && s.btnDisabledText]}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={s.headlineStep}>Create a password.</Text>
            <AuthInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              showToggle
              textContentType="newPassword"
              autoFocus
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
                onSubmitEditing={handleNext}
              />
              {!!confirmPassword && password !== confirmPassword && (
                <Text style={s.fieldError}>Passwords do not match</Text>
              )}
            </View>
            <Pressable style={[s.btnNeutral, !canProceed() && s.btnDisabled]} disabled={!canProceed()} onPress={handleNext}>
              <Text style={[s.btnNeutralText, !canProceed() && s.btnDisabledText]}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 4 && (
          <>
            <View>
              <Text style={s.headlineStep}>Last thing.</Text>
              <Text style={s.substep}>{fullName || 'Your name'} · {email || 'your@email.com'}</Text>
            </View>
            <View style={s.checkboxes}>
              <Pressable style={s.checkboxRow} onPress={() => setMarketingOptIn(v => !v)}>
                <View style={[s.checkbox, marketingOptIn && s.checkboxChecked]}>
                  {marketingOptIn && <Ionicons name="checkmark" size={11} color="#0a0a0a" />}
                </View>
                <Text style={s.checkboxLabel}>I want to receive weekly recruiting tips and updates from V1Portal.</Text>
              </Pressable>
              <Pressable style={s.checkboxRow} onPress={() => setAgreedToTerms(v => !v)}>
                <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
                  {agreedToTerms && <Ionicons name="checkmark" size={11} color="#0a0a0a" />}
                </View>
                <Text style={s.checkboxLabel}>I agree to the <Text style={s.checkboxLink}>Terms of Service</Text> and <Text style={s.checkboxLink}>Privacy Policy</Text>.</Text>
              </Pressable>
            </View>
            <Pressable style={[s.btnGradientWrap, (!canProceed() || loading) && s.btnDisabled]} disabled={!canProceed() || loading} onPress={handleNext}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Text style={s.btnGradientText}>{loading ? 'Creating your account…' : 'Enter the Portal →'}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wizard: { flex: 1, backgroundColor: '#0a0a0a' },
  topbar: { paddingHorizontal: 24, paddingTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  backText: { fontFamily: FontFamily.body, fontSize: 12.5, color: '#6b6d70' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressLabel: { fontFamily: FontFamily.mono, fontSize: 9.5, color: '#5a5d63', letterSpacing: 1 },
  progressTrack: { flexDirection: 'row', gap: 5, width: 100 },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  progressSegFilled: { backgroundColor: '#fff' },

  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 20 },

  logo: { height: 24, width: 130, alignSelf: 'center' },
  roleIconWrap: { alignItems: 'center' },
  roleIconGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  entryCopy: { alignItems: 'center', gap: 12 },
  headline: { fontFamily: FontFamily.headline, fontSize: 32, color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  blurb: { fontFamily: FontFamily.body, fontSize: 12.5, color: '#9a9da2', textAlign: 'center', lineHeight: 20, maxWidth: 340, alignSelf: 'center' },

  headlineStep: { fontFamily: FontFamily.headline, fontSize: 34, color: '#fff', letterSpacing: -0.3 },
  substep: { fontFamily: FontFamily.body, fontSize: 12.5, color: '#6b6d70', marginTop: 8 },

  error: { fontFamily: FontFamily.body, fontSize: 12.5, color: '#ff8a8a', backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: 10, padding: 12 },
  fieldError: { fontFamily: FontFamily.body, fontSize: 11, color: '#ff8a8a', marginTop: -8 },

  appleBtn: { width: '100%', height: 50 },
  appleLoadingWrap: { height: 50, alignItems: 'center', justifyContent: 'center' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.09)' },
  dividerText: { fontFamily: FontFamily.mono, fontSize: 9.5, color: '#4d4f54', letterSpacing: 1.5, textTransform: 'uppercase' },

  btnNeutral: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  btnNeutralText: { fontFamily: FontFamily.bodyBold, fontSize: 14.5, color: '#0a0a0a' },
  btnDisabled: { backgroundColor: '#1a1b1e', opacity: 1 },
  btnDisabledText: { color: '#5a5d63' },

  footnote: { textAlign: 'center', fontFamily: FontFamily.body, fontSize: 12, color: '#6b6d70' },
  footnoteLink: { fontFamily: FontFamily.bodyBold, color: '#fff' },

  checkboxes: { gap: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: '#4d4f54', marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#fff', borderColor: '#fff' },
  checkboxLabel: { flex: 1, fontFamily: FontFamily.body, fontSize: 11.5, color: '#6b6d70', lineHeight: 17 },
  checkboxLink: { color: '#FF5341' },

  btnGradientWrap: { borderRadius: 10, paddingVertical: 15, alignItems: 'center', overflow: 'hidden' },
  btnGradientText: { fontFamily: FontFamily.bodyBold, fontSize: 14.5, color: '#fff' },
});
