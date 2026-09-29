// Centered nudge dialog, same layout as web's components/matching/PreSendModal.tsx:
// icon, mono eyebrow, headline, body, white primary pill, quiet text secondary.
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PINK_RED } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';
import { useColors } from '../context/ThemeContext';

interface NudgeModalProps {
  visible: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
  // 'warn' matches web's contact-info variant.
  tone?: 'positive' | 'warn';
  busy?: boolean;
}

export default function NudgeModal({ visible, icon, eyebrow, title, body, primaryLabel, secondaryLabel, onPrimary, onSecondary, tone = 'positive', busy }: NudgeModalProps) {
  const C = useColors();
  const accent = tone === 'warn' ? PINK_RED : C.success;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSecondary}>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <Ionicons name={icon} size={40} color={accent} style={s.icon} />
          <Text style={[s.eyebrow, { color: accent }]}>{eyebrow.toUpperCase()}</Text>
          <Text style={[s.title, { color: C.text }]}>{title}</Text>
          <Text style={[s.body, { color: C.textMuted }]}>{body}</Text>
          <Pressable style={[s.primary, { backgroundColor: C.text }, busy && { opacity: 0.6 }]} onPress={onPrimary} disabled={busy}>
            <Text style={[s.primaryText, { color: C.surface }]}>{primaryLabel}</Text>
          </Pressable>
          <Pressable style={s.secondary} onPress={onSecondary}>
            <Text style={[s.secondaryText, { color: C.textMuted }]}>{secondaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,6,7,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, borderRadius: 20, paddingVertical: 30, paddingHorizontal: 24, alignItems: 'center' },
  icon: { marginBottom: 16 },
  eyebrow: { fontFamily: FontFamily.monoBold, fontSize: 10, letterSpacing: 1, marginBottom: 8 },
  title: { fontFamily: FontFamily.headline, fontSize: 22, lineHeight: 24, textAlign: 'center', marginBottom: 10 },
  body: { fontFamily: FontFamily.body, fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginBottom: 22 },
  primary: { width: '100%', paddingVertical: 15, borderRadius: 100, alignItems: 'center' },
  primaryText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14 },
  secondary: { width: '100%', paddingVertical: 14, marginTop: 8, alignItems: 'center' },
  secondaryText: { fontFamily: FontFamily.bodySemi, fontSize: 13 },
});
