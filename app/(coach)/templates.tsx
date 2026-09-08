import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachTemplates, MessageTemplate } from '../../hooks/useCoachTemplates';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

const CATEGORIES = [
  { value: 'general', label: 'General Outreach' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'offer', label: 'Offer' },
  { value: 'visit', label: 'Visit Invitation' },
];

const EMPTY_FORM = { title: '', content: '', category: 'general' };

export default function TemplatesScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { loading: coachLoading } = useCoachData();
  const { templates, loading, create, update, delete: deleteTemplate } = useCoachTemplates();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await update(editingId, form.title, form.category, form.content);
      } else {
        await create(form.title, form.category, form.content);
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: MessageTemplate) => {
    setForm({ title: t.title, content: t.content, category: t.category || 'general' });
    setEditingId(t.id);
    setShowForm(true);
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Pressable style={s.backLink} onPress={() => router.push('/(coach)/recruiting' as any)}>
          <Ionicons name="arrow-back" size={14} color="#fff" />
          <Text style={s.backLinkText}>Back to Recruiting</Text>
        </Pressable>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Message Templates</Text>
            <Text style={s.subtitle}>Create reusable outreach messages</Text>
          </View>
          <Pressable
            onPress={() => {
              if (showForm) {
                resetForm();
              } else {
                setForm(EMPTY_FORM);
                setEditingId(null);
                setShowForm(true);
              }
            }}
          >
            <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.newBtn}>
              <Text style={s.newBtnText}>{showForm ? 'Cancel' : 'New Template'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {showForm && (
        <View style={s.formCard}>
          <Text style={s.label}>Template Name</Text>
          <TextInput
            style={s.input}
            placeholder="e.g., Initial Contact"
            placeholderTextColor={C.textDim}
            value={form.title}
            onChangeText={t => setForm(f => ({ ...f, title: t }))}
          />

          <Text style={s.label}>Category</Text>
          <View style={s.chips}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.value}
                style={[s.chip, form.category === cat.value && s.chipActive]}
                onPress={() => setForm(f => ({ ...f, category: cat.value }))}
              >
                <Text style={[s.chipText, form.category === cat.value && s.chipTextActive]}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Message</Text>
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="Type your message template..."
            placeholderTextColor={C.textDim}
            value={form.content}
            onChangeText={t => setForm(f => ({ ...f, content: t }))}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
          />

          <View style={s.buttonRow}>
            <Pressable style={s.saveBtn} onPress={handleSave} disabled={saving}>
              <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtnFill}>
                <Text style={s.saveBtnText}>{saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={s.cancelBtn} onPress={resetForm}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      {templates.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No templates yet. Create your first one to get started.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {templates.map(t => (
            <View key={t.id} style={s.templateCard}>
              <Text style={s.templateName}>{t.title}</Text>
              <Text style={s.templateCategory}>{CATEGORIES.find(c => c.value === t.category)?.label ?? t.category}</Text>
              <Text style={s.templateContent} numberOfLines={3}>{t.content}</Text>
              <View style={s.cardActions}>
                <Pressable style={s.actionBtn} onPress={() => handleEdit(t)}>
                  <Text style={s.actionBtnText}>Edit</Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={() => deleteTemplate(t.id)}>
                  <Text style={[s.actionBtnText, s.deleteText]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
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
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, color: C.text, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
    newBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    newBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    formCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 20, marginBottom: 24 },
    label: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 12 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, color: C.text, fontFamily: FontFamily.body, fontSize: 13, backgroundColor: C.background },
    textarea: { minHeight: 160 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
    chipActive: { backgroundColor: 'rgba(131,58,180,0.15)', borderColor: 'rgba(168,85,247,0.4)' },
    chipText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },
    chipTextActive: { color: '#a855f7' },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    saveBtn: { flex: 1, borderRadius: 8, overflow: 'hidden' },
    saveBtnFill: { paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    cancelBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    emptyCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 48, alignItems: 'center' },
    emptyText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center' },

    templateCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 18 },
    templateName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 2 },
    templateCategory: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textTransform: 'capitalize', marginBottom: 10 },
    templateContent: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 14 },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    actionBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.text },
    deleteText: { color: '#ef4444' },
  });
}
