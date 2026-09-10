import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../context/ThemeContext';
import { ThemeColors, PINK_RED } from '../../constants/Colors';
import { GradientButton } from '../../components/GradientButton';

// Mirrors web's COACH_FAQS (lib/faqs.ts) so both platforms answer the same
// questions the same way.
const FAQS = [
  { q: 'How do I find athletes that fit my program?', a: 'Use Discover to swipe through athletes matched to your program, or Recruit Search to filter by position, division fit, location, and more. Save anyone you want to track to your Saved list.' },
  { q: 'How does matching work for coaches?', a: "When you and an athlete both express interest, it becomes a mutual match under My Matches — that's when you can message directly. Swiping or saving an athlete alone doesn't notify them." },
  { q: 'How do I message an athlete?', a: 'Once you have a mutual match, go to My Matches or Messages and open the conversation. You can also use Bulk Message with a saved Template to reach multiple recruits at once.' },
  { q: 'What is the Recruiting Board / Pipeline for?', a: 'Pipeline tracks recruits through your stages (e.g. Watching → Contacted → Offered → Committed). Recruiting Board gives you a visual, drag-and-drop view of the same pipeline.' },
  { q: 'Why does Compliance show contact restrictions?', a: 'Compliance reflects NCAA/NJCAA recruiting calendar rules for your division and updates automatically through the recruiting year. It shows your current contact period and days remaining — check it before reaching out during a quiet or dead period.' },
  { q: 'How do I update my program profile?', a: 'Go to Profile + Settings → Edit Profile to update your school, division, coaching staff, and program details. Program Profile shows how athletes see your listing.' },
  { q: 'Is the coach portal free?', a: "Yes — coach accounts are free for the 2026 season. We'll notify you well in advance before any coach pricing changes." },
  { q: 'How do I verify my coach account?', a: 'Submit a ticket below with your school email and title/role — we verify coaches manually to keep the platform trustworthy for athletes and typically confirm within 24 hours.' },
];

const SUBJECTS = [
  'Account Verification',
  'Recruit Search / Discover Issue',
  'Matches Not Showing',
  'Messaging / Bulk Message Issue',
  'Pipeline / Recruiting Board Issue',
  'Compliance Question',
  'Program Profile Update',
  'Bug Report',
  'Feedback / Suggestion',
  'Other',
];

export default function CoachHelpScreen() {
  const { session } = useAuth();
  const { subject: subjectParam } = useLocalSearchParams<{ subject?: string }>();
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
  const scrollRef = useRef<ScrollView>(null);
  const [formCardY, setFormCardY] = useState(0);

  useEffect(() => {
    if (subjectParam === 'feedback') {
      setSubject('Feedback / Suggestion');
      if (formCardY > 0) scrollRef.current?.scrollTo({ y: formCardY, animated: true });
    }
  }, [subjectParam, formCardY]);

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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.eyebrow}>SUPPORT</Text>
          <Text style={s.title}>Help & Support</Text>
        </View>

        {/* FAQs */}
        <Text style={s.sectionTitle}>Frequently Asked Questions</Text>
        <View style={s.faqCard}>
          {FAQS.map((faq, i) => (
            <View key={i} style={[s.faqItem, i > 0 && s.faqBorder]}>
              <Pressable style={s.faqRow} onPress={() => setOpenFaq(openFaq === i ? null : i)}>
                <Text style={s.faqQ}>{faq.q}</Text>
                <Ionicons name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={14} color={C.textMuted} />
              </Pressable>
              {openFaq === i && <Text style={s.faqA}>{faq.a}</Text>}
            </View>
          ))}
        </View>

        {/* Support ticket */}
        <View onLayout={e => setFormCardY(e.nativeEvent.layout.y)}>
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

            <GradientButton style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>Submit Ticket</Text>
              }
            </GradientButton>
          </View>
        )}
        </View>

        <Text style={s.footer}>
          Or email us directly at{' '}
          <Text style={s.footerLink}>support@v1portal.com</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (C: ThemeColors) => StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 20 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: '800', color: C.text },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: C.textMuted, marginBottom: 14 },

  faqCard: { backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden' },
  faqItem: { paddingHorizontal: 16 },
  faqBorder: { borderTopWidth: 1, borderTopColor: C.border },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: '500', color: C.text, lineHeight: 20 },
  faqA: { fontSize: 13, color: C.textMuted, lineHeight: 20, paddingBottom: 14 },

  formCard: { backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden', padding: 16 },
  formRow: { paddingVertical: 12 },
  formBorder: { borderTopWidth: 1, borderTopColor: C.border },
  label: { fontSize: 11, fontWeight: '600', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { fontSize: 14, color: C.text, backgroundColor: C.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.border },
  textarea: { minHeight: 100, paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: `${PINK_RED}26`, borderColor: `${PINK_RED}66` },
  chipText: { fontSize: 12, fontWeight: '500', color: C.textMuted },
  chipTextActive: { color: PINK_RED, fontWeight: '700' },
  errorText: { fontSize: 12, color: C.error, marginTop: 4 },
  submitBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 100, alignItems: 'center' },
  submitBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  successCard: { backgroundColor: C.surface, borderRadius: 14, padding: 28, alignItems: 'center' },
  successIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(113,255,126,0.1)', borderWidth: 1, borderColor: 'rgba(113,255,126,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  successBody: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resetLink: { fontSize: 13, color: '#fff', fontWeight: '600' },

  footer: { fontSize: 12, color: C.textDim, textAlign: 'center', marginTop: 24 },
  footerLink: { color: '#fff' },
});
