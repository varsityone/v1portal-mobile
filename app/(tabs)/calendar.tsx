import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { Colors, ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone {
  month: string;
  day: string | null;
  title: string;
  body: string;
  type: 'deadline' | 'action' | 'window';
}

interface EventRow {
  id: string;
  title: string;
  event_type: string;
  event_date: string; // YYYY-MM-DD
}

type MilestoneItem = Milestone & { date: Date; isCustom: false };
type CustomItem    = EventRow  & { date: Date; isCustom: true };
type TimelineItem  = MilestoneItem | CustomItem;

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TYPE_CONFIG = {
  deadline: { color: '#E1306C',    icon: 'flag'            as const, label: 'Deadline'    },
  action:   { color: Colors.primary, icon: 'checkmark-circle' as const, label: 'Action Item' },
  window:   { color: '#00b4ff',    icon: 'time'            as const, label: 'Window'      },
};

const CUSTOM_TYPE_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  camp:     { color: '#00b4ff', icon: 'football-outline', label: 'Camp'     },
  visit:    { color: '#8B5CF6', icon: 'navigate',         label: 'Visit'    },
  deadline: { color: '#E1306C', icon: 'alert-circle',     label: 'Deadline' },
  signing:  { color: '#10b981', icon: 'create',           label: 'Signing'  },
  showcase: { color: '#f59e0b', icon: 'ribbon',           label: 'Showcase' },
  other:    { color: '#6b7280', icon: 'calendar',         label: 'Event'    },
};

const CUSTOM_EVENT_TYPES = Object.entries(CUSTOM_TYPE_CONFIG).map(([value, cfg]) => ({ value, ...cfg }));

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getMilestones(gradYear: number): Milestone[] {
  const junior    = gradYear - 1;
  const sophomore = gradYear - 2;
  return [
    { month: `Jun ${sophomore}`, day: '15',  title: 'Recruiting Contact Window Opens', body: 'NCAA rules allow coaches to contact athletes starting June 15 after sophomore year.', type: 'window' },
    { month: `Sep ${junior}`,    day: '1',   title: 'Official Visits Begin (FBS)',      body: 'Junior year begins official campus visits for FBS programs.',                          type: 'window' },
    { month: `Nov ${junior}`,    day: null,  title: 'Submit Recruiting Questionnaires', body: 'Fill out questionnaires at your target schools before signing day windows.',           type: 'action' },
    { month: `Dec ${junior}`,    day: '20',  title: 'Early Signing Period',             body: 'Three-day window for seniors to sign National Letters of Intent.',                     type: 'deadline' },
    { month: `Feb ${gradYear}`,  day: '5',   title: 'National Signing Day',             body: 'Primary signing day for football. Commitments become official.',                       type: 'deadline' },
    { month: `Apr ${gradYear}`,  day: null,  title: 'Spring Evaluation Period',         body: 'Coaches can evaluate athletes at school without contact.',                             type: 'window' },
  ];
}

function parseMilestoneDate(m: Milestone): Date {
  const [monthStr, yearStr] = m.month.split(' ');
  return new Date(parseInt(yearStr), MONTHS_SHORT.indexOf(monthStr), m.day ? parseInt(m.day) : 1);
}

function parseEventDate(dateStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function stepDate(d: Date, field: 'month' | 'day' | 'year', delta: number): Date {
  const n = new Date(d);
  if (field === 'month') {
    n.setMonth(n.getMonth() + delta);
    const max = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    if (n.getDate() > max) n.setDate(max);
  } else if (field === 'day') {
    n.setDate(n.getDate() + delta);
  } else {
    n.setFullYear(n.getFullYear() + delta);
  }
  return n;
}

// ─── DateStepper ──────────────────────────────────────────────────────────────

function DateStepper({ date, onChange, C }: { date: Date; onChange: (d: Date) => void; C: ThemeColors }) {
  const fields: Array<{ key: 'month' | 'day' | 'year'; label: string }> = [
    { key: 'month', label: MONTHS_SHORT[date.getMonth()] },
    { key: 'day',   label: String(date.getDate()).padStart(2, '0') },
    { key: 'year',  label: String(date.getFullYear()) },
  ];

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
      {fields.map(({ key, label }) => (
        <View key={key} style={{ alignItems: 'center', gap: 2 }}>
          <Pressable onPress={() => onChange(stepDate(date, key, 1))} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="chevron-up" size={18} color={C.icon} />
          </Pressable>
          <View style={{
            backgroundColor: C.surfaceAlt,
            borderRadius: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            minWidth: key === 'year' ? 68 : 52,
            alignItems: 'center',
          }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '700' }}>{label}</Text>
          </View>
          <Pressable onPress={() => onChange(stepDate(date, key, -1))} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="chevron-down" size={18} color={C.icon} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { athlete } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const gradYear = typeof athlete?.graduation_year === 'number'
    ? athlete.graduation_year
    : athlete?.graduation_year
    ? parseInt(String(athlete.graduation_year))
    : new Date().getFullYear() + 2;

  const milestones = useMemo(() => getMilestones(gradYear), [gradYear]);
  const now        = new Date();
  const nowTime    = now.getTime();

  const [showAll,      setShowAll]      = useState(false);
  const [customEvents, setCustomEvents] = useState<EventRow[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [formTitle,    setFormTitle]    = useState('');
  const [formType,     setFormType]     = useState('camp');
  const [formDate,     setFormDate]     = useState(new Date());
  const [saving,       setSaving]       = useState(false);

  const fetchCustomEvents = useCallback(async () => {
    if (!athlete?.id) return;
    const { data } = await supabase
      .from('events')
      .select('id, title, event_type, event_date')
      .eq('athlete_id', athlete.id)
      .order('event_date', { ascending: true });
    setCustomEvents(data ?? []);
  }, [athlete?.id]);

  useEffect(() => { fetchCustomEvents(); }, [fetchCustomEvents]);

  const openAdd = () => {
    setEditingId(null);
    setFormTitle('');
    setFormType('camp');
    setFormDate(new Date());
    setModalVisible(true);
  };

  const openEdit = (event: EventRow) => {
    setEditingId(event.id);
    setFormTitle(event.title);
    setFormType(event.event_type);
    setFormDate(parseEventDate(event.event_date));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !athlete?.id) return;
    setSaving(true);
    const dateStr = toDateStr(formDate);
    if (editingId) {
      await supabase.from('events').update({ title: formTitle.trim(), event_type: formType, event_date: dateStr }).eq('id', editingId);
    } else {
      await supabase.from('events').insert({ athlete_id: athlete.id, title: formTitle.trim(), event_type: formType, event_date: dateStr });
    }
    await fetchCustomEvents();
    setModalVisible(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!editingId) return;
    setSaving(true);
    await supabase.from('events').delete().eq('id', editingId);
    await fetchCustomEvents();
    setModalVisible(false);
    setSaving(false);
  };

  const allItems: TimelineItem[] = useMemo(() => [
    ...milestones.map(m => ({ ...m, date: parseMilestoneDate(m), isCustom: false as const })),
    ...customEvents.map(e => ({ ...e, date: parseEventDate(e.event_date), isCustom: true as const })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()), [milestones, customEvents]);

  const upcomingItems = useMemo(() => allItems.filter(m => m.date.getTime() >= nowTime), [allItems]);
  const pastItems     = useMemo(() => allItems.filter(m => m.date.getTime() < nowTime),  [allItems]);
  const displayedItems = showAll ? allItems : upcomingItems;

  const renderItem = (item: TimelineItem, i: number, arr: TimelineItem[]) => {
    const isPast = item.date.getTime() < nowTime;
    const isLast = i === arr.length - 1;

    if (item.isCustom) {
      const cfg = CUSTOM_TYPE_CONFIG[item.event_type] ?? CUSTOM_TYPE_CONFIG.other;
      return (
        <View key={`c-${item.id}`} style={s.row}>
          <View style={s.dateCol}>
            <Text style={[s.dateMonth, isPast && s.textPast]}>{MONTHS_SHORT[item.date.getMonth()].toUpperCase()}</Text>
            <Text style={[s.dateDay,   isPast && s.textPast]}>{String(item.date.getDate()).padStart(2, '0')}</Text>
            <Text style={[s.dateYear,  isPast && s.textPast]}>{item.date.getFullYear()}</Text>
          </View>
          <View style={s.lineCol}>
            <View style={[s.dot, { backgroundColor: isPast ? C.surfaceAlt : cfg.color }, isPast && s.dotPast]}>
              <Ionicons name={cfg.icon} size={10} color={isPast ? C.textDim : '#fff'} />
            </View>
            {!isLast && <View style={[s.line, isPast && s.linePast]} />}
          </View>
          <Pressable
            style={[s.card, s.customCard, isPast && s.cardPast, isLast && { marginBottom: 0 }]}
            onPress={() => openEdit(item)}
          >
            <View style={s.cardHeader}>
              <Text style={[s.cardTitle, isPast && s.textPast]}>{item.title}</Text>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                <View style={[s.typeBadge, { backgroundColor: cfg.color + (isPast ? '15' : '22') }]}>
                  <Text style={[s.typeBadgeText, { color: isPast ? C.textDim : cfg.color }]}>{cfg.label}</Text>
                </View>
                <Ionicons name="pencil-outline" size={11} color={C.icon} />
              </View>
            </View>
          </Pressable>
        </View>
      );
    }

    const cfg = TYPE_CONFIG[item.type];
    return (
      <View key={`m-${i}-${item.title}`} style={s.row}>
        <View style={s.dateCol}>
          <Text style={[s.dateMonth, isPast && s.textPast]}>{item.month.split(' ')[0].toUpperCase()}</Text>
          {item.day && <Text style={[s.dateDay, isPast && s.textPast]}>{item.day}</Text>}
          <Text style={[s.dateYear, isPast && s.textPast]}>{item.month.split(' ')[1]}</Text>
        </View>
        <View style={s.lineCol}>
          <View style={[s.dot, { backgroundColor: isPast ? C.surfaceAlt : cfg.color }, isPast && s.dotPast]}>
            <Ionicons name={cfg.icon} size={10} color={isPast ? C.textDim : '#fff'} />
          </View>
          {!isLast && <View style={[s.line, isPast && s.linePast]} />}
        </View>
        <View style={[s.card, isPast && s.cardPast, isLast && { marginBottom: 0 }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardTitle, isPast && s.textPast]}>{item.title}</Text>
            <View style={[s.typeBadge, { backgroundColor: cfg.color + (isPast ? '15' : '22') }]}>
              <Text style={[s.typeBadgeText, { color: isPast ? C.textDim : cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={[s.cardBody, isPast && s.textPast]}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.title}>Recruiting Calendar</Text>
            <Text style={s.subtitle}>Class of {gradYear}</Text>
          </View>
          <Pressable style={s.addBtn} onPress={openAdd} hitSlop={4}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <View key={key} style={s.legendItem}>
              <Ionicons name={cfg.icon} size={12} color={cfg.color} />
              <Text style={[s.legendText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          ))}
          <View style={s.legendItem}>
            <Ionicons name="pencil-outline" size={12} color="#6b7280" />
            <Text style={[s.legendText, { color: '#6b7280' }]}>My Event</Text>
          </View>
        </View>

        {/* Upcoming label */}
        {upcomingItems.length > 0 && <Text style={s.sectionLabel}>UPCOMING</Text>}

        {/* Timeline */}
        <View style={s.timeline}>
          {displayedItems.map((item, i) => renderItem(item, i, displayedItems))}
        </View>

        {/* Empty state */}
        {upcomingItems.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="calendar-outline" size={36} color={C.icon} />
            <Text style={s.emptyText}>No upcoming dates</Text>
            <Text style={s.emptySubtext}>Tap + to add your own events</Text>
          </View>
        )}

        {/* Past toggle */}
        {pastItems.length > 0 && (
          <Pressable style={s.pastToggle} onPress={() => setShowAll(v => !v)}>
            <Text style={s.pastToggleText}>
              {showAll ? 'Hide past dates' : `Show ${pastItems.length} past date${pastItems.length !== 1 ? 's' : ''}`}
            </Text>
            <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={14} color={C.icon} />
          </Pressable>
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <Pressable style={s.modalSheet} onPress={e => e.stopPropagation()}>
              {/* Handle */}
              <View style={s.sheetHandle} />

              {/* Modal header */}
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{editingId ? 'Edit Event' : 'Add Event'}</Text>
                <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
                  <Ionicons name="close" size={22} color={C.icon} />
                </Pressable>
              </View>

              {/* Title */}
              <Text style={s.inputLabel}>TITLE</Text>
              <TextInput
                style={s.textInput}
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="Event title"
                placeholderTextColor={C.textDim}
                returnKeyType="done"
                autoFocus={!editingId}
              />

              {/* Date */}
              <Text style={[s.inputLabel, { marginTop: 20 }]}>DATE</Text>
              <DateStepper date={formDate} onChange={setFormDate} C={C} />

              {/* Type */}
              <Text style={[s.inputLabel, { marginTop: 20 }]}>TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
                {CUSTOM_EVENT_TYPES.map(t => (
                  <Pressable
                    key={t.value}
                    style={[s.typeChip, formType === t.value && { backgroundColor: t.color + '28', borderColor: t.color }]}
                    onPress={() => setFormType(t.value)}
                  >
                    <Ionicons name={t.icon} size={12} color={formType === t.value ? t.color : C.textDim} />
                    <Text style={[s.typeChipText, formType === t.value && { color: t.color }]}>{t.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Actions */}
              <View style={s.modalActions}>
                <Pressable
                  style={[s.saveBtn, (!formTitle.trim() || saving) && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!formTitle.trim() || saving}
                >
                  <Text style={s.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Event'}</Text>
                </Pressable>
                {editingId && (
                  <Pressable style={s.deleteBtn} onPress={handleDelete} disabled={saving}>
                    <Text style={s.deleteBtnText}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll:    { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 14 },

    header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title:    { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: C.textMuted },

    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    legend:     { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendText: { fontSize: 11, fontWeight: '600' },

    sectionLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.2, marginBottom: -4 },

    timeline: { gap: 0 },
    row:      { flexDirection: 'row', gap: 12, minHeight: 0 },

    dateCol:   { width: 44, alignItems: 'center', paddingTop: 10 },
    dateMonth: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
    dateDay:   { fontSize: 16, fontWeight: '800', color: C.text, lineHeight: 18 },
    dateYear:  { fontSize: 9, color: C.textDim },
    textPast:  { opacity: 0.4 },

    lineCol: { alignItems: 'center', width: 20 },
    dot: {
      width: 20, height: 20, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
      marginTop: 8, zIndex: 1,
    },
    dotPast:  { backgroundColor: C.surfaceAlt },
    line:     { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 2 },
    linePast: { opacity: 0.4 },

    card: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      gap: 6,
    },
    customCard: { gap: 0 },
    cardPast:   { opacity: 0.55 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
    cardTitle:  { flex: 1, fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19 },
    typeBadge:  { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
    typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
    cardBody:   { fontSize: 12, color: C.textMuted, lineHeight: 17 },

    emptyState:   { alignItems: 'center', paddingVertical: 48, gap: 8 },
    emptyText:    { fontSize: 16, fontWeight: '700', color: C.textMuted },
    emptySubtext: { fontSize: 13, color: C.textDim },

    pastToggle: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: 14, backgroundColor: C.surface,
      borderRadius: 12,
    },
    pastToggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: C.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle:  { fontSize: 18, fontWeight: '800', color: C.text },

    inputLabel: {
      fontSize: 10, fontWeight: '700', color: C.textDim,
      letterSpacing: 1.2, marginBottom: 8,
    },
    textInput: {
      backgroundColor: C.surfaceAlt,
      borderRadius: 10,
      padding: 14,
      color: C.text,
      fontSize: 15,
    },

    typeRow:      { marginHorizontal: -2 },
    typeChip: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 12, paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: C.surfaceAlt,
    },
    typeChipText: { fontSize: 12, fontWeight: '600', color: C.textMuted },

    modalActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
    saveBtn: {
      flex: 1, height: 48, borderRadius: 100,
      backgroundColor: Colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
    deleteBtn: {
      height: 48, paddingHorizontal: 18, borderRadius: 100,
      backgroundColor: 'rgba(225,48,108,0.1)',
      alignItems: 'center', justifyContent: 'center',
    },
    deleteBtnText: { fontSize: 14, fontWeight: '600', color: '#E1306C' },
  });
}
