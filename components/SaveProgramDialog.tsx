import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../constants/Fonts';
import { FLAME_GRADIENT } from '../constants/Colors';

export default function SaveProgramDialog({ name, saved, onSave, onClose, onContinueAfterSave }: {
  name: string; saved: boolean; onSave: () => Promise<void>; onClose: () => void; onContinueAfterSave?: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Matches web's two-dialog pattern exactly (components/matching/SaveProgramDialog.tsx):
  // once saved, this isn't a line appended to the same prompt -- it's a
  // completely distinct success screen (gradient background, checkmark,
  // different headline/copy), not just a status message bolted onto the
  // original dialog.
  if (saved) {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={() => (onContinueAfterSave ?? onClose)()}>
        <View style={styles.backdrop}>
          <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successPanel}>
            <ScrollView contentContainerStyle={styles.content} accessibilityViewIsModal>
              <Ionicons name="checkmark-circle" size={64} color="#fff" accessible={false} style={{ marginBottom: 20 }} />
              <Text accessibilityRole="header" style={styles.title}>Successfully added to your interest</Text>
              <Text style={[styles.body, { color: '#fff' }]}>Find it under My interest in the Swipe History drawer.</Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={onContinueAfterSave ?? onClose} style={styles.secondary}>
                  <Text style={[styles.secondaryText, { color: '#fff' }]}>Continue browsing</Text>
                </Pressable>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    );
  }

  return <Modal transparent visible animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
    <View style={styles.backdrop}>
      <ScrollView style={styles.panel} contentContainerStyle={styles.content} accessibilityViewIsModal>
        <Ionicons name="bookmark" size={64} color="#fff" accessible={false} style={{ marginBottom: 20 }} />
        <Text style={styles.eyebrow}>Verification pending</Text>
        <Text accessibilityRole="header" style={styles.title}>Profile not yet verified</Text>
        <Text style={styles.body}>{name} hasn’t been verified on V1Portal yet. Our compliance team is working to verify this coach/program profile. You can add it to your interest list, but matching and messaging aren’t available until verification is complete.</Text>
        {!!error && <Text accessibilityRole="alert" style={[styles.body, { color: '#fca5a5', marginTop: 16 }]}>{error}</Text>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} style={[styles.primary, saving && { opacity: 0.6 }]} onPress={async () => {
            setSaving(true); setError('');
            try { await onSave(); } catch { setError('Unable to save this program. Please try again.'); }
            finally { setSaving(false); }
          }}><Text style={styles.primaryText}>{saving ? 'Adding…' : 'Add to interest'}</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>Continue browsing</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,6,7,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { flexGrow: 0, width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: '#000', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  successPanel: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 20 },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#fff', marginBottom: 10 },
  title: { fontFamily: FontFamily.headline, fontSize: 32, lineHeight: 36, color: '#fff', textAlign: 'center', marginBottom: 14 },
  body: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 23, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  actions: { width: '100%', gap: 8, marginTop: 24 },
  primary: { width: '100%', padding: 15, borderRadius: 100, backgroundColor: '#fff' },
  primaryText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#0a0a0a', textAlign: 'center' },
  secondary: { width: '100%', padding: 14 },
  secondaryText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
});
