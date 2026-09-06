import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachCalendarEvents } from '../../hooks/useCoachCalendarEvents';
import { useCoachSaved } from '../../hooks/useCoachSaved';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { FilterChips } from '../../components/ui/FilterChips';
import { EmptyState } from '../../components/ui/EmptyState';
import { Ionicons } from '@expo/vector-icons';

const EVENT_TYPES = [
  { label: 'Game', value: 'game' },
  { label: 'Contact', value: 'contact' },
  { label: 'Visit', value: 'visit' },
  { label: 'Commitment', value: 'commitment' },
  { label: 'Other', value: 'other' },
];

export default function CalendarScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { events, loading, create, delete: deleteEvent } = useCoachCalendarEvents();
  const { saved } = useCoachSaved();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('game');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !date) {
      alert('Title and date are required');
      return;
    }

    setCreating(true);
    try {
      await create(title, type, date, athleteId ?? undefined, notes || undefined);
      setTitle('');
      setType('game');
      setDate(new Date().toISOString().split('T')[0]);
      setAthleteId(null);
      setNotes('');
      setShowForm(false);
    } catch (e) {
      alert('Failed to create event');
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

  if (!showForm && events.length === 0) {
    return (
      <View style={[s.container, { flex: 1, justifyContent: 'center' }]}>
        <EmptyState
          icon="calendar"
          title="No events yet"
          body="Track recruiting games, visits, and key dates on your calendar."
          actionLabel="Add Event"
          onAction={() => setShowForm(true)}
        />
      </View>
    );
  }

  const athleteOptions = saved.map(s => ({ label: s.athlete?.full_name ?? 'Unknown', value: s.athlete_id }));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>CALENDAR</Text>
        <Text style={s.title}>Recruiting Calendar</Text>
      </View>

      {showForm ? (
        <Card style={s.formCard}>
          <Text style={s.sectionTitle}>New Event</Text>

          <TextInput
            style={s.input}
            placeholder="Event title"
            placeholderTextColor={C.textDim}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={s.fieldLabel}>Event Type</Text>
          <FilterChips
            options={EVENT_TYPES}
            selected={[type]}
            onToggle={t => setType(t)}
          />

          <TextInput
            style={s.input}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor={C.textDim}
            value={date}
            onChangeText={setDate}
          />

          {athleteOptions.length > 0 && (
            <>
              <Text style={s.fieldLabel}>Athlete (optional)</Text>
              <FilterChips
                options={athleteOptions}
                selected={athleteId ? [athleteId] : []}
                onToggle={id => setAthleteId(athleteId === id ? null : id)}
              />
            </>
          )}

          <TextInput
            style={[s.input, s.notesInput]}
            placeholder="Notes (optional)"
            placeholderTextColor={C.textDim}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={s.buttonRow}>
            <Pressable
              style={[s.btn, s.btnCancel]}
              onPress={() => {
                setShowForm(false);
                setTitle('');
                setType('game');
                setDate(new Date().toISOString().split('T')[0]);
                setAthleteId(null);
                setNotes('');
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
          {monthKeys.map(month => (
            <Card key={month} style={s.monthCard}>
              <Text style={s.monthTitle}>{new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
              <View style={{ gap: 10, marginTop: 12 }}>
                {groupedByMonth[month].map(event => (
                  <View key={event.id} style={s.eventRow}>
                    <View style={[s.eventDot, { backgroundColor: getTypeColor(event.event_type) }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.eventTitle}>{event.title}</Text>
                      <Text style={s.eventMeta}>{event.event_date} • {event.event_type}</Text>
                      {event.notes && <Text style={s.eventNotes}>{event.notes}</Text>}
                    </View>
                    <Pressable onPress={() => deleteEvent(event.id)}>
                      <Ionicons name="trash-outline" size={16} color={C.error} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </Card>
          ))}

          <Pressable style={s.addBtn} onPress={() => setShowForm(true)}>
            <Ionicons name="add-circle" size={24} color={C.primary} />
            <Text style={s.addBtnText}>Add Event</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    game: '#3b82f6',
    contact: '#8b5cf6',
    visit: '#22c55e',
    commitment: '#f59e0b',
    other: '#6b7280',
  };
  return colors[type] ?? '#6b7280';
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    formCard: { marginBottom: 16 },
    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 12 },
    fieldLabel: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text, marginTop: 12, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: 12, marginBottom: 12, color: C.text, fontFamily: FontFamily.body, fontSize: 14 },
    notesInput: { minHeight: 80, textAlignVertical: 'top' },
    buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    btnPrimary: { backgroundColor: C.primary },
    btnCancel: { borderWidth: 1, borderColor: C.border },
    btnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#ffffff' },
    btnCancelText: { color: C.text },

    monthCard: { marginBottom: 16 },
    monthTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
    eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
    eventTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    eventMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    eventNotes: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 4, fontStyle: 'italic' },

    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: C.primary },
    addBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.primary },
  });
}
