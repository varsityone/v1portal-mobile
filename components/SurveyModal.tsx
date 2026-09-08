import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useColors } from '../context/ThemeContext';
import { FontFamily } from '../constants/Fonts';
import { ThemeColors } from '../constants/Colors';

interface SurveyModalProps {
  onClose: () => void;
  source?: string;
}

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Okay', 'Good', 'Amazing'];
const HEADER_GRADIENT = ['#ff0000', '#aa00ff'] as const;

// Matches web's components/SurveyModal.tsx exactly — same 6 questions, same
// canAdvance gating, same POST target (/api/survey) and payload shape.
export default function SurveyModal({ onClose, source = 'popup' }: SurveyModalProps) {
  const C = useColors();
  const s = createStyles(C);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [easeOfUse, setEaseOfUse] = useState(0);
  const [scoreAccuracy, setScoreAccuracy] = useState('');
  const [mostUseful, setMostUseful] = useState('');
  const [confusingOrMissing, setConfusingOrMissing] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [otherFeedback, setOtherFeedback] = useState('');

  const canAdvance = [
    easeOfUse > 0,
    scoreAccuracy !== '',
    true,
    true,
    npsScore !== null,
    true,
  ][step];

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch('https://v1portal.com/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || null,
          email: user?.email || null,
          ease_of_use: easeOfUse,
          score_accuracy: scoreAccuracy,
          most_useful: mostUseful,
          confusing_or_missing: confusingOrMissing,
          nps_score: npsScore,
          other_feedback: otherFeedback,
          source,
        }),
      });
    } catch (e) {
      console.error('Survey submit error:', e);
    }
    setSubmitting(false);
    setDone(true);
  };

  const questions = [
    {
      label: 'How easy was it to get your V1 Score?',
      sub: 'Rate your experience with the app so far.',
      input: (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => setEaseOfUse(n)} hitSlop={4}>
              <Ionicons
                name={n <= easeOfUse ? 'star' : 'star-outline'}
                size={32}
                color={n <= easeOfUse ? '#facc15' : C.border}
              />
            </Pressable>
          ))}
          {easeOfUse > 0 && (
            <Text style={{ fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginLeft: 4 }}>
              {STAR_LABELS[easeOfUse]}
            </Text>
          )}
        </View>
      ),
    },
    {
      label: 'Did the score feel accurate to where you are as an athlete?',
      sub: 'Be honest — this helps us improve.',
      input: (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {[['yes', 'Yes, spot on'], ['somewhat', 'Somewhat'], ['no', 'Not really']].map(([val, label]) => {
            const active = scoreAccuracy === val;
            return (
              <Pressable
                key={val}
                onPress={() => setScoreAccuracy(val)}
                style={[s.pill, active && s.pillActive]}
              >
                <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ),
    },
    {
      label: 'What was the most useful part of the app?',
      sub: 'Could be a feature, the score itself, the gameplan — anything.',
      input: (
        <TextInput
          value={mostUseful}
          onChangeText={setMostUseful}
          placeholder="Tell us what stood out..."
          placeholderTextColor={C.textDim}
          multiline
          numberOfLines={3}
          style={s.textarea}
        />
      ),
    },
    {
      label: 'What was confusing or missing?',
      sub: 'No filters — raw feedback makes the product better.',
      input: (
        <TextInput
          value={confusingOrMissing}
          onChangeText={setConfusingOrMissing}
          placeholder="What didn't make sense or what do you wish was there?"
          placeholderTextColor={C.textDim}
          multiline
          numberOfLines={3}
          style={s.textarea}
        />
      ),
    },
    {
      label: 'How likely are you to recommend V1Portal to another athlete or parent?',
      sub: '0 = not at all · 10 = absolutely',
      input: (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {Array.from({ length: 11 }, (_, i) => {
              const active = npsScore === i;
              return (
                <Pressable
                  key={i}
                  onPress={() => setNpsScore(i)}
                  style={[s.npsBox, active && s.npsBoxActive]}
                >
                  <Text style={[s.npsBoxText, active && s.npsBoxTextActive]}>{i}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={s.npsLabel}>Not likely</Text>
            <Text style={s.npsLabel}>Extremely likely</Text>
          </View>
        </View>
      ),
    },
    {
      label: 'Anything else you want us to know?',
      sub: 'Optional — but we read every word.',
      input: (
        <TextInput
          value={otherFeedback}
          onChangeText={setOtherFeedback}
          placeholder="Open floor..."
          placeholderTextColor={C.textDim}
          multiline
          numberOfLines={3}
          style={s.textarea}
        />
      ),
    },
  ];

  const total = questions.length;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.card}>
          <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
            <Ionicons name="close" size={15} color="#fff" />
          </Pressable>

          {done ? (
            <>
              <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.doneHeader}>
                <Ionicons name="sparkles" size={48} color="#fff" />
              </LinearGradient>
              <View style={s.doneBody}>
                <Text style={s.doneTitle}>Thanks for the feedback!</Text>
                <Text style={s.doneText}>
                  This goes directly to Coach Wes. We use every response to make the app better.
                </Text>
                <Pressable onPress={onClose}>
                  <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.doneBtn}>
                    <Text style={s.doneBtnText}>Back to App</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
                <Text style={s.headerEyebrow}>Question {step + 1} of {total}</Text>
                <View style={s.progressRow}>
                  {questions.map((_, i) => (
                    <View key={i} style={[s.progressSeg, i <= step && s.progressSegFilled]} />
                  ))}
                </View>
              </LinearGradient>

              <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
                <Text style={s.qLabel}>{questions[step].label}</Text>
                <Text style={s.qSub}>{questions[step].sub}</Text>
                {questions[step].input}
              </ScrollView>

              <View style={s.navRow}>
                {step > 0 && (
                  <Pressable style={s.backBtn} onPress={() => setStep(st => st - 1)}>
                    <Text style={s.backBtnText}>Back</Text>
                  </Pressable>
                )}
                <Pressable
                  disabled={!canAdvance || submitting}
                  onPress={step < total - 1 ? () => setStep(st => st + 1) : submit}
                  style={{ flex: 1, opacity: canAdvance ? 1 : 0.35 }}
                >
                  <LinearGradient colors={HEADER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.nextBtn}>
                    <Text style={s.nextBtnText}>
                      {submitting ? 'Submitting…' : step < total - 1 ? 'Next' : 'Submit Feedback'}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    },
    card: {
      width: '100%',
      maxWidth: 480,
      backgroundColor: C.surface,
      borderRadius: 20,
      overflow: 'hidden',
    },
    closeBtn: {
      position: 'absolute',
      top: 14,
      right: 14,
      zIndex: 2,
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 22,
      paddingBottom: 18,
    },
    headerEyebrow: {
      fontFamily: FontFamily.bodyBold,
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.75)',
      marginBottom: 10,
    },
    progressRow: { flexDirection: 'row', gap: 5 },
    progressSeg: { flex: 1, height: 3, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.28)' },
    progressSegFilled: { backgroundColor: 'rgba(255,255,255,0.95)' },

    body: { paddingHorizontal: 24, paddingTop: 22, maxHeight: 320 },
    qLabel: { fontFamily: FontFamily.headlineBold, fontSize: 18, color: C.text, marginBottom: 6, lineHeight: 23 },
    qSub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 18 },

    pill: {
      paddingVertical: 10, paddingHorizontal: 18, borderRadius: 100,
      borderWidth: 2, borderColor: C.border, backgroundColor: 'transparent',
    },
    pillActive: { borderColor: C.primary, backgroundColor: 'rgba(80,26,255,0.12)' },
    pillText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textMuted },
    pillTextActive: { color: C.primary },

    textarea: {
      marginTop: 10, padding: 14, borderRadius: 10,
      borderWidth: 1.5, borderColor: C.border, backgroundColor: C.background,
      fontFamily: FontFamily.body, fontSize: 14, color: C.text,
      minHeight: 80, textAlignVertical: 'top',
    },

    npsBox: {
      width: 38, height: 38, borderRadius: 8,
      borderWidth: 2, borderColor: C.border,
      alignItems: 'center', justifyContent: 'center',
    },
    npsBoxActive: { borderColor: C.primary, backgroundColor: C.primary },
    npsBoxText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.textMuted },
    npsBoxTextActive: { color: '#fff' },
    npsLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim },

    navRow: { flexDirection: 'row', gap: 10, padding: 24, paddingTop: 20 },
    backBtn: {
      paddingVertical: 12, paddingHorizontal: 20, borderRadius: 100,
      borderWidth: 1.5, borderColor: C.border,
    },
    backBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: C.textMuted },
    nextBtn: { paddingVertical: 13, borderRadius: 100, alignItems: 'center' },
    nextBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: '#fff' },

    doneHeader: { paddingVertical: 40, alignItems: 'center' },
    doneBody: { padding: 28, alignItems: 'center' },
    doneTitle: { fontFamily: FontFamily.headlineBold, fontSize: 20, color: C.text, marginBottom: 8, textAlign: 'center' },
    doneText: { fontFamily: FontFamily.body, fontSize: 14, color: C.textMuted, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
    doneBtn: { paddingVertical: 13, paddingHorizontal: 32, borderRadius: 100 },
    doneBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: '#fff' },
  });
}
