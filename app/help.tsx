import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useColors } from '../context/ThemeContext';
import { ThemeColors } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';
import { GradientButton } from '../components/GradientButton';

// Mirrors web's lib/faqs.ts SUPPORT_FAQS exactly.
const FAQS = [
  { q: 'How do I complete my V1 Assessment?', a: "Start the assessment from the home page or your dashboard. It's a series of questions about your athletic profile, academics, and recruiting status — takes about 5-10 minutes. Your V1 Score is calculated automatically once you finish." },
  { q: 'What is my V1 Score and what does it mean?', a: 'Your V1 Score is a 0–100 rating across four categories: Athletic Ability, Academics, Football Production, and Intangibles. It determines which division level — D1, D2, D3, NAIA, or JUCO — your profile realistically fits.' },
  { q: 'Why am I not seeing any program matches?', a: 'Free shows your V1 Score and a few matched programs once your assessment is complete; Match+ unlocks your full match list (300+). If you have Match+ and still see nothing, go to the Matches tab and click "Refresh Matches." Still nothing? Submit a ticket below and we\'ll look into it within 24 hours.' },
  { q: 'How do I send an outreach email to a coach?', a: 'Go to the Outreach tab, find the coach, and click "Send Email." You can review and customize the message before it goes out. Coach replies go directly to your email address — make sure the email on your profile is correct.' },
  { q: 'How do I update my profile information?', a: 'Click "Edit Profile" in the navigation. You can update personal info, athletic stats, academic scores, film links, and social handles. Save before leaving.' },
  { q: 'Why does my profile show outdated information?', a: 'Your profile pulls from what you entered during the assessment and any manual edits in Edit Profile. If something looks wrong, go to Edit Profile and update it directly.' },
  { q: 'How do I upgrade my subscription?', a: 'Go to the Pricing page and select the Match+ plan at $29/month. Match+ gives you full access to program matches, coach outreach, analytics, and your complete recruiting calendar.' },
  { q: 'How do I cancel my subscription?', a: 'Go to Settings and click "Manage Subscription" — it opens Stripe\'s secure billing portal where you can cancel immediately. Need help? Submit a ticket below and we\'ll take care of it within 24 hours.' },
  { q: 'I signed up with Apple or Google — how do I manage my account?', a: 'Your account is tied to your Apple ID or Google account. Sign in at v1portal.com using the same method you used when you created your account. To manage or cancel your subscription, go to Settings → Manage Subscription.' },
  { q: 'My analytics are showing zeros — is something wrong?', a: 'Profile views only count when someone visits your public profile page. Share your profile link with coaches to start generating views. Outreach stats update after your first sent email.' },
];

// Mirrors web's <select> subject options exactly.
const SUBJECTS = [
  'Assessment Issue',
  'V1 Score Problem',
  'Program Matches Not Showing',
  'Outreach / Email Issue',
  'Profile Update Issue',
  'Billing / Subscription',
  'Cancel Subscription',
  'Bug Report',
  'Other',
];

export default function HelpScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const C = useColors();
  const s = styles(C);

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(session?.user?.email ?? '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('https://v1portal.com/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (res.ok) {
        setSubmitted(true);
        setName(''); setEmail(session?.user?.email ?? ''); setSubject(''); setMessage('');
      } else {
        setError('Something went wrong. Email us at support@v1portal.com.');
      }
    } catch {
      setError('Something went wrong. Email us at support@v1portal.com.');
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Nav */}
        <View style={s.nav}>
          <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <Text style={s.navTitle}>Help & Support</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* FAQs */}
          <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
          <View style={s.faqCard}>
            {FAQS.map((faq, i) => (
              <View key={i} style={[s.faqItem, i > 0 && s.faqBorder]}>
                <Pressable
                  style={s.faqRow}
                  onPress={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <Text style={s.faqQ}>{faq.q}</Text>
                  <Ionicons
                    name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={C.textMuted}
                  />
                </Pressable>
                {openFaq === i && (
                  <Text style={s.faqA}>{faq.a}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Support ticket */}
          <Text style={[s.sectionTitle, { marginTop: 28 }]}>Submit a Support Ticket</Text>
          <Text style={s.sectionSub}>We respond within 24 hours.</Text>

          {submitted ? (
            <View style={s.successCard}>
              <View style={s.successIcon}>
                <Ionicons name="checkmark" size={24} color="#71ff7e" />
              </View>
              <Text style={s.successTitle}>Ticket Submitted</Text>
              <Text style={s.successBody}>We'll get back to you within 24 hours at the email you provided.</Text>
              <Pressable onPress={() => setSubmitted(false)}>
                <Text style={s.resetLink}>Submit another ticket</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.formCard}>

              <View style={s.formRow}>
                <Text style={s.label}>Full Name</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={C.textDim}
                  autoCapitalize="words"
                />
              </View>

              <View style={[s.formRow, s.formBorder]}>
                <Text style={s.label}>Email Address</Text>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={C.textDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={[s.formRow, s.formBorder]}>
                <Text style={s.label}>Subject</Text>
                <View style={s.chips}>
                  {SUBJECTS.map(sub => (
                    <Pressable
                      key={sub}
                      style={[s.chip, subject === sub && s.chipActive]}
                      onPress={() => setSubject(sub)}
                    >
                      <Text style={[s.chipText, subject === sub && s.chipTextActive]}>{sub}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[s.formRow, s.formBorder]}>
                <Text style={s.label}>Message</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe your issue in as much detail as possible..."
                  placeholderTextColor={C.textDim}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <GradientButton
                style={s.submitBtn}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.submitBtnText}>Submit Ticket</Text>
                }
              </GradientButton>

            </View>
          )}

          <Text style={s.footer}>
            Or email us directly at{' '}
            <Text style={s.footerLink}>support@v1portal.com</Text>
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: {
    fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text,
  },
  content: {
    padding: 20, paddingBottom: 48,
  },
  sectionTitle: {
    fontFamily: FontFamily.statNumber, fontSize: 20, color: C.text, marginBottom: 4,
  },
  sectionSub: {
    fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginBottom: 14,
  },

  // FAQ
  faqCard: {
    backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden',
  },
  faqItem: { paddingHorizontal: 16 },
  faqBorder: { borderTopWidth: 1, borderTopColor: C.border },
  faqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, gap: 12,
  },
  faqQ: { flex: 1, fontFamily: FontFamily.body, fontSize: 14, color: C.text, lineHeight: 20 },
  faqA: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 20, paddingBottom: 14 },

  // Form
  formCard: {
    backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden', padding: 16,
  },
  formRow: { paddingVertical: 12 },
  formBorder: { borderTopWidth: 1, borderTopColor: C.border },
  label: {
    fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    fontFamily: FontFamily.body, fontSize: 14, color: C.text,
    backgroundColor: C.surfaceAlt,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
  },
  textarea: { minHeight: 100, paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },
  chipActive: {
    backgroundColor: 'rgba(131,58,180,0.15)', borderColor: 'rgba(131,58,180,0.4)',
  },
  chipText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
  chipTextActive: { fontFamily: FontFamily.bodyBold, color: '#a855f7' },
  errorText: { fontFamily: FontFamily.body, fontSize: 12, color: C.error, marginTop: 4 },
  submitBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 100, alignItems: 'center',
  },
  submitBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },

  // Success
  successCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 28, alignItems: 'center',
  },
  successIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(113,255,126,0.1)',
    borderWidth: 1, borderColor: 'rgba(113,255,126,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successTitle: { fontFamily: FontFamily.statNumber, fontSize: 18, color: C.text, marginBottom: 8 },
  successBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resetLink: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: '#fff' },

  // Footer
  footer: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, textAlign: 'center', marginTop: 24 },
  footerLink: { color: '#fff' },
});
