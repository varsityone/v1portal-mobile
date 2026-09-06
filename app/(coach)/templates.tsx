import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachTemplates } from '../../hooks/useCoachTemplates';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

export default function TemplatesScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { templates, loading, create, delete: deleteTemplate } = useCoachTemplates();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !content.trim()) {
      alert('Name and content are required');
      return;
    }

    setCreating(true);
    try {
      await create(name, category, content);
      setName('');
      setCategory('');
      setContent('');
      setShowForm(false);
    } catch (e) {
      alert('Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!showForm && templates.length === 0) {
    return (
      <View style={[s.container, { flex: 1, justifyContent: 'center' }]}>
        <EmptyState
          icon="document"
          title="No templates yet"
          body="Create message templates to speed up outreach."
          actionLabel="Create Template"
          onAction={() => setShowForm(true)}
        />
      </View>
    );
  }

  return (
    <View style={[s.container, { flex: 1 }]}>
      <View style={s.header}>
        <Text style={s.eyebrow}>TOOLS</Text>
        <Text style={s.title}>Message Templates</Text>
      </View>

      {showForm ? (
        <Card style={s.formCard}>
          <Text style={s.sectionTitle}>New Template</Text>
          <TextInput
            style={s.input}
            placeholder="Template name"
            placeholderTextColor={C.textDim}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={s.input}
            placeholder="Category (optional)"
            placeholderTextColor={C.textDim}
            value={category}
            onChangeText={setCategory}
          />
          <TextInput
            style={[s.input, s.contentInput]}
            placeholder="Message content"
            placeholderTextColor={C.textDim}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={6}
          />
          <View style={s.buttonRow}>
            <Pressable
              style={[s.btn, s.btnCancel]}
              onPress={() => {
                setShowForm(false);
                setName('');
                setCategory('');
                setContent('');
              }}
            >
              <Text style={[s.btnText, s.btnCancelText]}>Cancel</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnPrimary]} onPress={handleCreate} disabled={creating}>
              <Text style={s.btnText}>{creating ? 'Creating...' : 'Create'}</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <>
          <FlatList
            data={templates}
            keyExtractor={t => t.id}
            renderItem={({ item: t }) => (
              <Card style={s.templateCard}>
                <View style={s.templateHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.templateName}>{t.name}</Text>
                    {t.category && <Text style={s.templateCategory}>{t.category}</Text>}
                  </View>
                  <Pressable onPress={() => deleteTemplate(t.id)}>
                    <Ionicons name="trash-outline" size={18} color={C.error} />
                  </Pressable>
                </View>
                <Text style={s.templateContent} numberOfLines={3}>{t.content}</Text>
              </Card>
            )}
            scrollEnabled={false}
          />

          <Pressable style={s.addBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add-circle" size={24} color={C.primary} />
            <Text style={s.addBtnText}>Add Template</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 16 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 12 },
    formCard: { marginBottom: 16 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 12, color: C.text, fontFamily: FontFamily.body, fontSize: 14 },
    contentInput: { minHeight: 100, textAlignVertical: 'top' },
    buttonRow: { flexDirection: 'row', gap: 10 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    btnPrimary: { backgroundColor: C.primary },
    btnCancel: { borderWidth: 1, borderColor: C.border },
    btnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#ffffff' },
    btnCancelText: { color: C.text },

    templateCard: { marginBottom: 12 },
    templateHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
    templateName: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    templateCategory: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    templateContent: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, lineHeight: 18 },

    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: C.primary },
    addBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.primary },
  });
}
