import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../constants/Fonts';

export default function SaveProgramDialog({ name, saved, onSave, onClose }: {
  name: string; saved: boolean; onSave: () => Promise<void>; onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <Modal transparent visible animationType="fade" onRequestClose={() => { if (!saving) onClose(); }}>
    <View style={styles.backdrop}>
      <ScrollView style={styles.panel} contentContainerStyle={styles.content} accessibilityViewIsModal>
        <Ionicons name="bookmark" size={64} color="#fff" accessible={false} style={{ marginBottom: 20 }} />
        <Text accessibilityRole="header" style={styles.title}>Matching isn’t available yet</Text>
        <Text style={styles.body}>{name} isn’t available for matching right now. Save this program to revisit later. Saving won’t send a message or create a match.</Text>
        {saved && <Text accessibilityLiveRegion="polite" style={[styles.body, { color: '#fff', marginTop: 16 }]}>Saved! Find it under Swipe History → Saved.</Text>}
        {!!error && <Text accessibilityRole="alert" style={[styles.body, { color: '#fca5a5', marginTop: 16 }]}>{error}</Text>}
        <View style={styles.actions}>
          {!saved && <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} style={[styles.primary, saving && { opacity: 0.6 }]} onPress={async () => {
            setSaving(true); setError('');
            try { await onSave(); } catch { setError('Unable to save this program. Please try again.'); }
            finally { setSaving(false); }
          }}><Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save for later'}</Text></Pressable>}
          <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={styles.secondary}><Text style={styles.secondaryText}>{saved ? 'Keep browsing' : 'Not now'}</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,6,7,0.82)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { flexGrow: 0, width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: '#000', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  title: { fontFamily: FontFamily.headline, fontSize: 32, lineHeight: 36, color: '#fff', textAlign: 'center', marginBottom: 14 },
  body: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 23, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  actions: { width: '100%', gap: 8, marginTop: 24 },
  primary: { width: '100%', padding: 15, borderRadius: 100, backgroundColor: '#fff' },
  primaryText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#0a0a0a', textAlign: 'center' },
  secondary: { width: '100%', padding: 14 },
  secondaryText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
});
