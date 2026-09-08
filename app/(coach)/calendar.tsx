import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachCalendarEvents } from '../../hooks/useCoachCalendarEvents';
import { useCoachSaved } from '../../hooks/useCoachSaved';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

const EVENT_TYPES = [
  { label: 'Contact Attempt', value: 'contact', color: '#8b5cf6' },
  { label: 'Campus Visit', value: 'visit', color: '#22c55e' },
  { label: 'Game Day', value: 'game', color: '#3b82f6' },
  { label: 'Quiet Period', value: 'quiet', color: '#6b7280' },
];
const typeInfo = (v: string) => EVENT_TYPES.find(t => t.value === v);

export default function CalendarScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { loading: coachLoading } = useCoachData();
  const { events, loading, create, delete: deleteEvent } = useCoachCalendarEvents();
  const { saved } = useCoachSaved();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('contact');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setTitle('');
    setType('contact');
    setDate(new Date().toISOString().split('T')[0]);
    setAthleteId(null);
    setNotes('');
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !date || !athleteId) return;
    setCreating(true);
    try {
      await create(title, type, date, athleteId, notes || undefined);
      resetForm();
    } catch (e) {
      console.error('Create event error:', e);
    } finally {
      setCreating(false);
    }
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  const groupedByMonth = events.reduce(
    (acc, e) => {
      const month = e.event_date.slice(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(e);
      return acc;
    },
    {} as Record<string, typeof events>,
  );
  const monthKeys = Object.keys(groupedByMonth).sort();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Pressable style={s.backLink} onPress={() => router.push('/(coach)/recruiting' as any)}>
          <Ionicons name="arrow-back" size={14} color="#fff" />
          <Text style={s.backLinkText}>Back to Recruiting</Text>
        </Pressable>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Recruiting Calendar</Text>
            <Text style={s.subtitle}>Track contact windows and key dates</Text>
          </View>
          <Pressable onPress={() => (showForm ? resetForm() : setShowForm(true))}>
            <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.addBtn}>
              <Text style={s.addBtnText}>{showForm ? 'Cancel' : 'Add Event'}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {showForm && (
        <View style={s.formCard}>
          {saved.length === 0 ? (
            <Text style={s.noAthletesText}>
              Save a prospect first. Every calendar event needs to be linked to an athlete.
            </Text>
          ) : (
            <>
              <Text style={s.label}>Athlete</Text>
              <View style={s.chips}>
                {saved.map(p => (
                  <Pressable
                    key={p.athlete_id}
                    style={[s.chip, athleteId === p.athlete_id && s.chipActive]}
                    onPress={() => setAthleteId(p.athlete_id)}
                  >
                    <Text style={[s.chipText, athleteId === p.athlete_id && s.chipTextActive]}>
                      {p.athlete?.full_name ?? 'Unknown'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.label}>Type</Text>
              <View style={s.chips}>
                {EVENT_TYPES.map(t => (
                  <Pressable
                    key={t.value}
                    style={[s.chip, type === t.value && { backgroundColor: t.color, borderColor: t.color }]}
                    onPress={() => setType(t.value)}
                  >
                    <Text style={[s.chipText, type === t.value && s.chipTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={s.label}>Date</Text>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={C.textDim} value={date} onChangeText={setDate} />

              <Text style={s.label}>Title</Text>
              <TextInput
                style={s.input}
                placeholder="e.g., Contact QB about offer"
                placeholderTextColor={C.textDim}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={s.label}>Notes</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Optional notes..."
                placeholderTextColor={C.textDim}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={s.buttonRow}>
                <Pressable style={s.saveBtn} onPress={handleCreate} disabled={creating || !title.trim() || !athleteId}>
                  <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtnFill}>
                    <Text style={s.saveBtnText}>{creating ? 'Adding...' : 'Add Event'}</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={s.cancelBtn} onPress={resetForm}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {events.length === 0 && !showForm ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No events yet. Add your first one to get started.</Text>
        </View>
      ) : (
        monthKeys.map(month => (
          <View key={month} style={s.monthCard}>
            <Text style={s.monthTitle}>{new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
            <View style={{ gap: 10, marginTop: 12 }}>
              {groupedByMonth[month].map(event => {
                const info = typeInfo(event.event_type);
                return (
                  <View key={event.id} style={s.eventRow}>
                    <View style={[s.eventDot, { backgroundColor: info?.color ?? '#6b7280' }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.eventTitle}>{event.title}</Text>
                      <Text style={s.eventMeta}>{event.event_date} · {info?.label ?? event.event_type}</Text>
                      {event.notes && <Text style={s.eventNotes}>{event.notes}</Text>}
                    </View>
                    <Pressable onPress={() => deleteEvent(event.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={16} color={C.error} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ))
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
    addBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    addBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },

    formCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 20, marginBottom: 24 },
    noAthletesText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center', paddingVertical: 20 },
    label: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginTop: 12 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, color: C.text, fontFamily: FontFamily.body, fontSize: 13, backgroundColor: C.background },
    textarea: { minHeight: 80 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.background },
    chipActive: { backgroundColor: 'rgba(131,58,180,0.15)', borderColor: 'rgba(168,85,247,0.4)' },
    chipText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },
    chipTextActive: { color: '#fff' },
    buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
    saveBtn: { flex: 1, borderRadius: 8, overflow: 'hidden' },
    saveBtnFill: { paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    cancelBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    emptyCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 48, alignItems: 'center' },
    emptyText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center' },

    monthCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 18, marginBottom: 14 },
    monthTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
    eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
    eventTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    eventMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    eventNotes: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 4, fontStyle: 'italic' },
  });
}
