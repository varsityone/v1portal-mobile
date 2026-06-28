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
import { GradientButton } from '../components/GradientButton';

const FAQS = [
  { q: 'How do I complete my V1 Assessment?', a: 'Tap the Assessment tab or go to Settings → Retake V1 Assessment. Answer the questions about your athletic profile, academics, and recruiting status. It takes about 10–15 minutes. Your V1 Score will be calculated automatically.' },
  { q: 'What is my V1 Score and what does it mean?', a: 'Your V1 Score is a 0–100 rating across four categories: Athletic, Academic, Production, and Intangibles. It determines which division level of college football programs are the best fit for you.' },
  { q: 'Why am I not seeing any program matches?', a: "Complete your assessment first and make sure you have an active V1Portal account. If you have both, go to the Matches tab and pull to refresh. Still nothing? Submit a support ticket below." },
  { q: 'How do I send an outreach email to a coach?', a: "Go to the Outreach tab and tap the compose button. Select a coach from your target list, review the pre-written template, and send." },
  { q: 'How do I update my profile information?', a: 'Go to Settings → Edit Profile. You can update your personal info, athletic stats, academic scores, film links, and social handles.' },
  { q: 'Can a coach reply to my outreach email?', a: 'Yes. When a coach hits reply, their message goes directly to the email address on your account. Make sure it\'s correct in Edit Profile.' },
  { q: 'How do I manage my account?', a: 'Visit v1portal.com to manage your account. You can also reach us at support@v1portal.com.' },
];

const SUBJECTS = [
  'Assessment Issue',
  'V1 Score Problem',
  'Program Matches',
  'Outreach / Email',
  'Account Management',
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
    fontSize: 16, fontWeight: '700', color: C.text,
  },
  content: {
    padding: 20, paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13, color: C.textMuted, marginBottom: 14,
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
  faqQ: { flex: 1, fontSize: 14, fontWeight: '500', color: C.text, lineHeight: 20 },
  faqA: { fontSize: 13, color: C.textMuted, lineHeight: 20, paddingBottom: 14 },

  // Form
  formCard: {
    backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden', padding: 16,
  },
  formRow: { paddingVertical: 12 },
  formBorder: { borderTopWidth: 1, borderTopColor: C.border },
  label: {
    fontSize: 11, fontWeight: '600', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  input: {
    fontSize: 14, color: C.text,
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
  chipText: { fontSize: 12, fontWeight: '500', color: C.textMuted },
  chipTextActive: { color: '#a855f7', fontWeight: '700' },
  errorText: { fontSize: 12, color: C.error, marginTop: 4 },
  submitBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 100, alignItems: 'center',
  },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

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
  successTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  successBody: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resetLink: { fontSize: 13, color: '#a855f7', fontWeight: '600' },

  // Footer
  footer: { fontSize: 12, color: C.textDim, textAlign: 'center', marginTop: 24 },
  footerLink: { color: '#a855f7' },
});
