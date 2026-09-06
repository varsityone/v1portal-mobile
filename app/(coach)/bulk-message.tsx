import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachSaved } from '../../hooks/useCoachSaved';
import { useCoachTemplates } from '../../hooks/useCoachTemplates';
import { useCoachBulkMessage } from '../../hooks/useCoachBulkMessage';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { FilterChips } from '../../components/ui/FilterChips';
import { Ionicons } from '@expo/vector-icons';

export default function BulkMessageScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { saved, loading: savedLoading } = useCoachSaved();
  const { templates, loading: templatesLoading } = useCoachTemplates();
  const { sending, progress, send } = useCoachBulkMessage();

  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customContent, setCustomContent] = useState('');

  const athleteOptions = saved.map(s => ({ label: s.athlete?.full_name ?? 'Unknown', value: s.athlete_id }));
  const templateOptions = templates.map(t => ({ label: t.name, value: t.id }));

  const handleSendClick = async () => {
    if (selectedAthletes.size === 0) {
      alert('Select at least one athlete');
      return;
    }

    if (!customContent.trim() && !selectedTemplate) {
      alert('Enter a message or select a template');
      return;
    }

    await send(Array.from(selectedAthletes), selectedTemplate || '', customContent);
  };

  if (coachLoading || savedLoading || templatesLoading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>TOOLS</Text>
        <Text style={s.title}>Bulk Message</Text>
      </View>

      {/* Athlete selection */}
      <Card>
        <Text style={s.sectionTitle}>Select Athletes ({selectedAthletes.size})</Text>
        <FilterChips
          options={athleteOptions}
          selected={Array.from(selectedAthletes)}
          onToggle={id => {
            const newSet = new Set(selectedAthletes);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            setSelectedAthletes(newSet);
          }}
        />
      </Card>

      {/* Template selection */}
      {templateOptions.length > 0 && (
        <Card>
          <Text style={s.sectionTitle}>Use Template (optional)</Text>
          <FilterChips
            options={templateOptions}
            selected={selectedTemplate ? [selectedTemplate] : []}
            onToggle={id => setSelectedTemplate(selectedTemplate === id ? null : id)}
          />
        </Card>
      )}

      {/* Custom message */}
      <Card>
        <Text style={s.sectionTitle}>Message</Text>
        <TextInput
          style={s.messageInput}
          placeholder="Type your message here..."
          placeholderTextColor={C.textDim}
          value={customContent}
          onChangeText={setCustomContent}
          multiline
          numberOfLines={6}
          editable={!sending}
        />
        <Text style={s.warningText}>Note: Contact info (phone, email) is not allowed in bulk messages</Text>
      </Card>

      {/* Progress indicator */}
      {sending && progress.total > 0 && (
        <Card>
          <View style={s.progressRow}>
            <Text style={s.progressLabel}>Progress</Text>
            <Text style={s.progressValue}>{progress.sent}/{progress.total}</Text>
          </View>
          {progress.failed > 0 && <Text style={s.errorText}>{progress.failed} failed</Text>}
        </Card>
      )}

      {/* Send button */}
      <Pressable style={[s.sendBtn, (sending || selectedAthletes.size === 0) && s.sendBtnDisabled]} onPress={handleSendClick} disabled={sending || selectedAthletes.size === 0}>
        {sending ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Ionicons name="send" size={16} color="#ffffff" />
            <Text style={s.sendBtnText}>Send to {selectedAthletes.size}</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 10 },
    messageInput: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 8,
      padding: 12,
      color: C.text,
      fontFamily: FontFamily.body,
      fontSize: 14,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    warningText: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 8 },

    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    progressValue: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    errorText: { fontFamily: FontFamily.body, fontSize: 11, color: C.error },

    sendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 24,
    },
    sendBtnDisabled: { opacity: 0.5 },
    sendBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#ffffff' },
  });
}
