import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachSaved } from '../../hooks/useCoachSaved';
import { useCoachTemplates } from '../../hooks/useCoachTemplates';
import { useCoachBulkMessage } from '../../hooks/useCoachBulkMessage';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

export default function BulkMessageScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { loading: coachLoading } = useCoachData();
  const { saved, loading: savedLoading } = useCoachSaved();
  const { templates, loading: templatesLoading } = useCoachTemplates();
  const { sending, progress, send } = useCoachBulkMessage();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const selectedProspects = saved.filter(p => selectedIds.has(p.athlete_id));
  const availableToAdd = saved.filter(p => !selectedIds.has(p.athlete_id));

  const toggle = (athleteId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) next.delete(athleteId);
      else next.add(athleteId);
      return next;
    });
  };

  const canSend = message.trim().length > 0 && selectedIds.size > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    await send(Array.from(selectedIds), templateId || '', message);
    setMessage('');
    setSelectedIds(new Set());
    setTemplateId(null);
  };

  if (coachLoading || savedLoading || templatesLoading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Pressable style={s.backLink} onPress={() => router.push('/(coach)/messages' as any)}>
          <Ionicons name="arrow-back" size={14} color="#fff" />
          <Text style={s.backLinkText}>Back to Messages</Text>
        </Pressable>
        <Text style={s.title}>Bulk Message</Text>
        <Text style={s.subtitle}>Send the same message to multiple prospects</Text>
      </View>

      <View style={s.card}>
        <Text style={s.sectionTitle}>Selected ({selectedIds.size})</Text>
        {selectedProspects.length === 0 ? (
          <View style={s.emptySelected}>
            <Text style={s.emptySelectedText}>
              Choose from your saved prospects below to add them here
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {selectedProspects.map(p => (
              <View key={p.athlete_id} style={s.selectedRow}>
                <View>
                  <Text style={s.selectedName}>{p.athlete?.full_name ?? 'Unknown'}</Text>
                  <Text style={s.selectedMeta}>{p.athlete?.position ?? '—'}</Text>
                </View>
                <Pressable onPress={() => toggle(p.athlete_id)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={C.textDim} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {availableToAdd.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 20 }]}>Add from Saved</Text>
            <View style={s.chips}>
              {availableToAdd.map(p => (
                <Pressable key={p.athlete_id} style={s.chip} onPress={() => toggle(p.athlete_id)}>
                  <Text style={s.chipText}>+ {p.athlete?.full_name ?? 'Unknown'}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      {templates.length > 0 && (
        <View style={s.card}>
          <Text style={s.sectionTitle}>Use Template (optional)</Text>
          <View style={s.chips}>
            {templates.map(t => (
              <Pressable
                key={t.id}
                style={[s.chip, templateId === t.id && s.chipActive]}
                onPress={() => {
                  const next = templateId === t.id ? null : t.id;
                  setTemplateId(next);
                  if (next) setMessage(t.content);
                }}
              >
                <Text style={[s.chipText, templateId === t.id && s.chipTextActive]}>{t.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.sectionTitle}>Message</Text>
        <TextInput
          style={s.messageInput}
          placeholder="Type your message here..."
          placeholderTextColor={C.textDim}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={7}
          textAlignVertical="top"
          editable={!sending}
        />
        <Text style={s.warningText}>Contact info (phone, email) is not allowed in bulk messages.</Text>
      </View>

      {sending && progress.total > 0 && (
        <View style={s.card}>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>Progress</Text>
            <Text style={s.progressValue}>{progress.sent}/{progress.total}</Text>
          </View>
          {progress.failed > 0 && <Text style={s.errorText}>{progress.failed} failed</Text>}
        </View>
      )}

      <Pressable onPress={handleSend} disabled={!canSend}>
        <LinearGradient
          colors={canSend ? ['#501af0', '#a855f7'] : [C.border, C.border]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.sendBtn}
        >
          {sending ? (
            <Text style={s.sendBtnText}>Sending to {selectedIds.size}...</Text>
          ) : (
            <Text style={s.sendBtnText}>Send to {selectedIds.size}</Text>
          )}
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
    backLinkText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: '#fff' },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },

    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 20, marginBottom: 16 },
    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 12 },

    emptySelected: { paddingVertical: 24, alignItems: 'center' },
    emptySelectedText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center' },

    selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12 },
    selectedName: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text },
    selectedMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
    chipActive: { backgroundColor: 'rgba(131,58,180,0.15)', borderColor: 'rgba(168,85,247,0.4)' },
    chipText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },
    chipTextActive: { color: '#a855f7' },

    messageInput: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, color: C.text, fontFamily: FontFamily.body, fontSize: 13, minHeight: 140, backgroundColor: C.background },
    warningText: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 8 },

    progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
    progressLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    progressValue: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    errorText: { fontFamily: FontFamily.body, fontSize: 11, color: C.error, marginTop: 6 },

    sendBtn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
    sendBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
  });
}
