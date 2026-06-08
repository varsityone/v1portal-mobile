import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Colors } from '../../constants/Colors';

// ─── Template engine ──────────────────────────────────────────────────────────

type TemplateKey = 'initial_contact' | 'follow_up' | 'thank_you' | 'visit_request';

const TEMPLATE_OPTIONS: { key: TemplateKey; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'initial_contact', label: 'Initial Contact', icon: 'mail-outline' },
  { key: 'follow_up',       label: 'Follow Up',       icon: 'refresh-outline' },
  { key: 'thank_you',       label: 'Thank You',       icon: 'heart-outline' },
  { key: 'visit_request',   label: 'Visit Request',   icon: 'location-outline' },
];

interface AthProfile {
  name: string;
  position: string;
  year: string;
  gpa: string;
  school: string;
  location: string;
  filmUrl: string;
}

function buildTemplate(key: TemplateKey, ath: AthProfile, coachName: string, schoolName: string): string {
  const coach  = coachName.trim()  || 'Coach';
  const school = schoolName.trim() || '[School Name]';

  const lines = (arr: (string | false)[]): string =>
    arr.filter((l): l is string => l !== false).join('\n');

  switch (key) {
    case 'initial_contact':
      return lines([
        `Coach ${coach},`,
        '',
        `My name is ${ath.name || '[Your Name]'}, and I am a ${ath.year || '[Year]'} ${ath.position || '[Position]'} prospect from ${ath.school || '[Your School]'}${ath.location ? ` in ${ath.location}` : ''}. I am reaching out because I am genuinely interested in ${school} and believe I could contribute to your program.`,
        '',
        ath.gpa     && `Academic: ${ath.gpa} GPA`,
        ath.filmUrl && `Highlight Film: ${ath.filmUrl}`,
        '',
        `I would love the opportunity to learn more about ${school} and discuss how I might fit into your program. Please feel free to reach out at your convenience.`,
        '',
        `Thank you for your time,`,
        ath.name || '[Your Name]',
      ]);

    case 'follow_up':
      return lines([
        `Coach ${coach},`,
        '',
        `I wanted to follow up on my previous message expressing my interest in ${school}. I remain very excited about the possibility of joining your program and wanted to make sure you had everything you need from me.`,
        '',
        ath.filmUrl && `My most recent highlight film: ${ath.filmUrl}`,
        '',
        `Please let me know if you have any questions or need additional information. I look forward to hearing from you.`,
        '',
        `Thank you,`,
        ath.name || '[Your Name]',
      ]);

    case 'thank_you':
      return lines([
        `Coach ${coach},`,
        '',
        `Thank you for taking the time to connect with me about ${school}'s program. Our conversation strengthened my interest in your school and your coaching staff.`,
        '',
        `I am very excited about the possibility of contributing to ${school}'s success, and I will continue to work hard and keep you updated on my progress.`,
        '',
        `I look forward to continuing this conversation.`,
        '',
        `Best regards,`,
        ath.name || '[Your Name]',
      ]);

    case 'visit_request':
      return lines([
        `Coach ${coach},`,
        '',
        `I am very interested in visiting ${school} to experience your program firsthand. An official or unofficial visit would help me better understand how I might fit into your team and campus community.`,
        '',
        `I have flexible availability and would love to coordinate a visit at a time that works best for you and your staff. Please let me know what options are available.`,
        '',
        `Thank you,`,
        ath.name || '[Your Name]',
      ]);
  }
}

// ─── Template picker modal ────────────────────────────────────────────────────

function TemplatePicker({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: TemplateKey | null;
  onSelect: (k: TemplateKey) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>Select Template</Text>
        {TEMPLATE_OPTIONS.map(opt => (
          <Pressable
            key={opt.key}
            style={({ pressed }) => [pm.option, pressed && { backgroundColor: Colors.surfaceAlt }]}
            onPress={() => onSelect(opt.key)}
          >
            <View style={[pm.iconBox, current === opt.key && pm.iconBoxActive]}>
              <Ionicons name={opt.icon} size={18} color={current === opt.key ? Colors.white : Colors.textMuted} />
            </View>
            <Text style={[pm.optionLabel, current === opt.key && pm.optionLabelActive]}>
              {opt.label}
            </Text>
            {current === opt.key && (
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
            )}
          </Pressable>
        ))}
        <Pressable style={pm.cancelBtn} onPress={onClose}>
          <Text style={pm.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 4, borderRadius: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  iconBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  optionLabelActive: { fontWeight: '700', color: Colors.primary },
  cancelBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  cancelText: { fontSize: 15, color: Colors.textMuted },
});

// ─── Form field ───────────────────────────────────────────────────────────────

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={ff.root}>
      <Text style={ff.label}>{label}</Text>
      {children}
      {error ? <Text style={ff.error}>{error}</Text> : null}
    </View>
  );
}

const ff = StyleSheet.create({
  root: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.3 },
  error: { fontSize: 12, color: Colors.error, marginTop: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ComposeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  // Athlete data for template injection
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athProfile, setAthProfile] = useState<AthProfile>({
    name: '', position: '', year: '', gpa: '', school: '', location: '', filmUrl: '',
  });

  // Form state
  const [coachName,    setCoachName]    = useState('');
  const [schoolName,   setSchoolName]   = useState('');
  const [coachEmail,   setCoachEmail]   = useState('');
  const [template,     setTemplate]     = useState<TemplateKey | null>(null);
  const [messageBody,  setMessageBody]  = useState('');

  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [sending, setSending]   = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // ── Fetch athlete profile ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('athletes')
      .select('id, first_name, last_name, position, graduation_year, gpa, school_name, city, state, highlight_film_url')
      .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
      .maybeSingle()
      .then(({ data: ath }) => {
        if (!ath) return;
        setAthleteId(ath.id);
        const firstName = ath.first_name ?? (session?.user?.user_metadata?.first_name as string | undefined) ?? '';
        const lastName  = ath.last_name  ?? (session?.user?.user_metadata?.last_name  as string | undefined) ?? '';
        setAthProfile({
          name:     [firstName, lastName].filter(Boolean).join(' '),
          position: ath.position         ?? '',
          year:     ath.graduation_year  != null ? String(ath.graduation_year) : '',
          gpa:      ath.gpa              != null ? String(ath.gpa)             : '',
          school:   ath.school_name      ?? '',
          location: [ath.city, ath.state].filter(Boolean).join(', '),
          filmUrl:  ath.highlight_film_url ?? '',
        });
      });
  }, [userId]);

  // ── Template selection ────────────────────────────────────────────────────

  const applyTemplate = useCallback((key: TemplateKey) => {
    setTemplate(key);
    setShowPicker(false);
    setMessageBody(buildTemplate(key, athProfile, coachName, schoolName));
    setErrors(prev => ({ ...prev, messageBody: '' }));
  }, [athProfile, coachName, schoolName]);

  // Re-inject athlete data if profile loads after template was selected
  useEffect(() => {
    if (template && (athProfile.name || athProfile.position)) {
      setMessageBody(prev => {
        if (!prev) return prev;
        return buildTemplate(template, athProfile, coachName, schoolName);
      });
    }
  }, [athProfile]);

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!coachName.trim())  e.coachName  = 'Coach name is required';
    if (!schoolName.trim()) e.schoolName = 'School name is required';
    if (!coachEmail.trim()) {
      e.coachEmail = 'Coach email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coachEmail.trim())) {
      e.coachEmail = 'Enter a valid email address';
    }
    if (!messageBody.trim()) e.messageBody = 'Message cannot be empty';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!validate()) return;
    if (!athleteId) {
      Alert.alert('Profile Incomplete', 'Complete your athlete profile before sending outreach.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('coach_outreach').insert({
        athlete_id:   athleteId,
        coach_name:   coachName.trim(),
        school_name:  schoolName.trim(),
        coach_email:  coachEmail.trim(),
        message_body: messageBody.trim(),
        status:       'sent',
        sent_at:      new Date().toISOString(),
      });

      if (error) throw error;

      // Email delivery: call a Supabase edge function here when available.
      // e.g. await supabase.functions.invoke('send-coach-email', { body: { to: coachEmail, message: messageBody } });

      Alert.alert(
        'Outreach Sent',
        `Your outreach to Coach ${coachName.trim()} at ${schoolName.trim()} has been added to your pipeline.`,
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Send Failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedLabel = TEMPLATE_OPTIONS.find(t => t.key === template)?.label ?? null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={s.header}>
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>New Outreach</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* To section */}
        <View style={s.card}>
          <Text style={s.cardTitle}>RECIPIENT</Text>

          <FormField label="Coach Name" error={errors.coachName}>
            <TextInput
              style={[s.input, errors.coachName && s.inputError]}
              value={coachName}
              onChangeText={t => { setCoachName(t); setErrors(p => ({ ...p, coachName: '' })); }}
              placeholder="e.g. Coach Smith"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </FormField>

          <FormField label="School Name" error={errors.schoolName}>
            <TextInput
              style={[s.input, errors.schoolName && s.inputError]}
              value={schoolName}
              onChangeText={t => { setSchoolName(t); setErrors(p => ({ ...p, schoolName: '' })); }}
              placeholder="e.g. University of Georgia"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </FormField>

          <FormField label="Coach Email" error={errors.coachEmail}>
            <TextInput
              style={[s.input, errors.coachEmail && s.inputError]}
              value={coachEmail}
              onChangeText={t => { setCoachEmail(t); setErrors(p => ({ ...p, coachEmail: '' })); }}
              placeholder="coach@university.edu"
              placeholderTextColor={Colors.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </FormField>
        </View>

        {/* Template */}
        <View style={s.card}>
          <Text style={s.cardTitle}>TEMPLATE</Text>
          <Pressable
            style={({ pressed }) => [s.templateRow, pressed && { backgroundColor: Colors.surfaceAlt }]}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons
              name={selectedLabel ? TEMPLATE_OPTIONS.find(t => t.label === selectedLabel)?.icon ?? 'document-outline' : 'document-outline'}
              size={18}
              color={template ? Colors.primary : Colors.textDim}
            />
            <Text style={[s.templateLabel, !template && { color: Colors.textDim }]}>
              {selectedLabel ?? 'Select a template…'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textDim} />
          </Pressable>
          {template && (
            <Text style={s.templateHint}>
              Template pre-filled with your profile data. Edit freely before sending.
            </Text>
          )}
        </View>

        {/* Message */}
        <View style={s.card}>
          <Text style={s.cardTitle}>MESSAGE</Text>
          {errors.messageBody ? <Text style={s.fieldError}>{errors.messageBody}</Text> : null}
          <TextInput
            style={[s.messageInput, errors.messageBody && s.inputError]}
            value={messageBody}
            onChangeText={t => { setMessageBody(t); setErrors(p => ({ ...p, messageBody: '' })); }}
            placeholder="Write your message here, or select a template above…"
            placeholderTextColor={Colors.textDim}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{messageBody.length} characters</Text>
        </View>

        {/* Send button */}
        <Pressable
          style={({ pressed }) => [s.sendBtn, (pressed || sending) && { opacity: 0.8 }]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="send" size={17} color={Colors.white} />
              <Text style={s.sendBtnText}>Send Outreach</Text>
            </>
          )}
        </Pressable>

        <Text style={s.disclaimer}>
          Outreach is saved to your pipeline. Email delivery requires connecting your email in Settings.
        </Text>
      </ScrollView>

      <TemplatePicker
        visible={showPicker}
        current={template}
        onSelect={applyTemplate}
        onClose={() => setShowPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },

  scroll: { flex: 1 },
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 48,
  },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.4,
    marginBottom: 2,
  },

  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.error,
    marginTop: -8,
  },

  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  templateLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  templateHint: {
    fontSize: 12,
    color: Colors.textDim,
    lineHeight: 18,
  },

  messageInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 220,
    lineHeight: 21,
  },
  charCount: {
    fontSize: 11,
    color: Colors.textDim,
    textAlign: 'right',
    marginTop: -8,
  },

  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.2,
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },
});
