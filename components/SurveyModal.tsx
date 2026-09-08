import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { FontFamily } from '../constants/Fonts';
import { ThemeColors } from '../constants/Colors';

interface SurveyModalProps {
  onClose: () => void;
  source?: string;
}

export default function SurveyModal({ onClose }: SurveyModalProps) {
  const C = useColors();
  const s = createStyles(C);
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async () => {
    try {
      await fetch('https://v1portal.com/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'survey',
          feedback,
          source: 'mobile_results',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.error('Survey submit error:', e);
    }
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={true}
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.container}>
          {submitted ? (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={48} color={C.primary} style={{ marginBottom: 16 }} />
              <Text style={s.successTitle}>Thank you!</Text>
              <Text style={s.successBody}>We appreciate your feedback and will use it to improve V1Portal.</Text>
            </View>
          ) : (
            <>
              <View style={s.header}>
                <Text style={s.title}>Help us improve</Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <Ionicons name="close" size={24} color={C.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
                <Text style={s.label}>How can we make V1Portal better?</Text>
                <TextInput
                  placeholder="Share your thoughts..."
                  value={feedback}
                  onChangeText={setFeedback}
                  style={s.input}
                  placeholderTextColor={C.textDim}
                />
              </ScrollView>

              <Pressable
                style={[s.submitBtn, !feedback.trim() && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={!feedback.trim()}
              >
                <Text style={s.submitBtnText}>Send Feedback</Text>
              </Pressable>
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
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontFamily: FontFamily.headlineBold,
      fontSize: 18,
      color: C.text,
    },
    content: {
      marginBottom: 20,
    },
    label: {
      fontFamily: FontFamily.body,
      fontSize: 13,
      color: C.textMuted,
      marginBottom: 12,
    },
    input: {
      backgroundColor: C.background,
      borderRadius: 12,
      padding: 14,
      minHeight: 120,
      fontFamily: FontFamily.body,
      fontSize: 13,
      color: C.text,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: C.border,
    },
    successBox: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    successTitle: {
      fontFamily: FontFamily.headlineBold,
      fontSize: 18,
      color: C.text,
      marginBottom: 8,
    },
    successBody: {
      fontFamily: FontFamily.body,
      fontSize: 13,
      color: C.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    submitBtn: {
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitBtnText: {
      fontFamily: FontFamily.bodyBold,
      fontSize: 14,
      color: '#ffffff',
    },
  });
}
