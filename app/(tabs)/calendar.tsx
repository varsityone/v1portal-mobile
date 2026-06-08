import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAthleteData } from '../../hooks/useAthleteData';
import { Colors, ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface Milestone {
  month: string;
  day: string | null;
  title: string;
  body: string;
  type: 'deadline' | 'action' | 'window';
  grade?: number;
}

function getMilestones(gradYear: number): Milestone[] {
  const grad = gradYear;
  const junior = grad - 1;
  const sophomore = grad - 2;

  return [
    {
      month: 'Jun ' + sophomore,
      day: '15',
      title: 'Recruiting Contact Window Opens',
      body: 'NCAA rules allow coaches to contact athletes starting June 15 after sophomore year.',
      type: 'window',
      grade: 10,
    },
    {
      month: 'Sep ' + junior,
      day: '1',
      title: 'Official Visits Begin (FBS)',
      body: 'Junior year begins official campus visits for FBS programs.',
      type: 'window',
      grade: 11,
    },
    {
      month: 'Nov ' + junior,
      day: null,
      title: 'Submit Recruiting Questionnaires',
      body: 'Fill out questionnaires at your target schools before signing day windows.',
      type: 'action',
      grade: 11,
    },
    {
      month: 'Dec ' + junior,
      day: '20',
      title: 'Early Signing Period',
      body: 'Three-day window for seniors to sign National Letters of Intent.',
      type: 'deadline',
      grade: 12,
    },
    {
      month: 'Feb ' + grad,
      day: '5',
      title: 'National Signing Day',
      body: 'Primary signing day for football. Commitments become official.',
      type: 'deadline',
      grade: 12,
    },
    {
      month: 'Apr ' + grad,
      day: null,
      title: 'Spring Evaluation Period',
      body: 'Coaches can evaluate athletes at school without contact.',
      type: 'window',
    },
  ];
}

const TYPE_CONFIG = {
  deadline: { color: '#E1306C', icon: 'flag' as const, label: 'Deadline' },
  action:   { color: Colors.primary, icon: 'checkmark-circle' as const, label: 'Action Item' },
  window:   { color: '#00b4ff', icon: 'time' as const, label: 'Window' },
};

export default function CalendarScreen() {
  const { athlete } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const gradYear = typeof athlete?.graduation_year === 'number'
    ? athlete.graduation_year
    : athlete?.graduation_year
    ? parseInt(String(athlete.graduation_year))
    : new Date().getFullYear() + 2;

  const milestones = getMilestones(gradYear);
  const now = new Date();
  const nowTime = now.getTime();

  const [showAll, setShowAll] = useState(false);

  const parseMilestoneDate = (m: Milestone): Date => {
    const parts = m.month.split(' ');
    const monthStr = parts[0];
    const year = parseInt(parts[1]);
    const day = m.day ? parseInt(m.day) : 1;
    const monthIndex = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthStr);
    return new Date(year, monthIndex, day);
  };

  const sorted = milestones
    .map(m => ({ ...m, date: parseMilestoneDate(m) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const upcoming = sorted.filter(m => m.date.getTime() >= nowTime);
  const past = sorted.filter(m => m.date.getTime() < nowTime);
  const displayed = showAll ? sorted : upcoming;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Recruiting Calendar</Text>
        <Text style={s.subtitle}>Key dates for the Class of {gradYear}</Text>
      </View>

      {/* Legend */}
      <View style={s.legend}>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <View key={key} style={s.legendItem}>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[s.legendText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        ))}
      </View>

      {/* Upcoming header */}
      {upcoming.length > 0 && (
        <Text style={s.sectionLabel}>UPCOMING</Text>
      )}

      {/* Timeline */}
      <View style={s.timeline}>
        {displayed.map((m, i) => {
          const isPast = m.date.getTime() < nowTime;
          const cfg = TYPE_CONFIG[m.type];
          const isLast = i === displayed.length - 1;
          return (
            <View key={i} style={s.row}>
              {/* Left: date */}
              <View style={s.dateCol}>
                <Text style={[s.dateMonth, isPast && s.textPast]}>
                  {m.month.split(' ')[0].toUpperCase()}
                </Text>
                {m.day && (
                  <Text style={[s.dateDay, isPast && s.textPast]}>{m.day}</Text>
                )}
                <Text style={[s.dateYear, isPast && s.textPast]}>
                  {m.month.split(' ')[1]}
                </Text>
              </View>

              {/* Center: dot + line */}
              <View style={s.lineCol}>
                <View style={[
                  s.dot,
                  { backgroundColor: isPast ? C.surfaceAlt : cfg.color },
                  isPast && s.dotPast,
                ]}>
                  <Ionicons
                    name={cfg.icon}
                    size={10}
                    color={isPast ? C.textDim : '#fff'}
                  />
                </View>
                {!isLast && (
                  <View style={[s.line, isPast && s.linePast]} />
                )}
              </View>

              {/* Right: content */}
              <View style={[s.card, isPast && s.cardPast, isLast && { marginBottom: 0 }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.cardTitle, isPast && s.textPast]}>{m.title}</Text>
                  <View style={[s.typeBadge, { backgroundColor: cfg.color + (isPast ? '15' : '22') }]}>
                    <Text style={[s.typeBadgeText, { color: isPast ? C.textDim : cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                </View>
                <Text style={[s.cardBody, isPast && s.textPast]}>{m.body}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Past toggle */}
      {past.length > 0 && (
        <Pressable style={s.pastToggle} onPress={() => setShowAll(v => !v)}>
          <Text style={s.pastToggleText}>
            {showAll ? 'Hide past dates' : `Show ${past.length} past date${past.length !== 1 ? 's' : ''}`}
          </Text>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={C.textMuted}
          />
        </Pressable>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 14 },

    header: { gap: 4 },
    title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: C.textMuted },

    legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendText: { fontSize: 11, fontWeight: '600' },

    sectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: C.textDim,
      letterSpacing: 1.2,
      marginBottom: -4,
    },

    timeline: { gap: 0 },
    row: { flexDirection: 'row', gap: 12, minHeight: 0 },

    dateCol: {
      width: 44,
      alignItems: 'center',
      paddingTop: 10,
    },
    dateMonth: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
    dateDay: { fontSize: 16, fontWeight: '800', color: C.text, lineHeight: 18 },
    dateYear: { fontSize: 9, color: C.textDim },
    textPast: { opacity: 0.4 },

    lineCol: { alignItems: 'center', width: 20 },
    dot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
      zIndex: 1,
    },
    dotPast: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
    line: { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 2 },
    linePast: { opacity: 0.4 },

    card: {
      flex: 1,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      gap: 6,
    },
    cardPast: { opacity: 0.55 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
    cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19 },
    typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
    typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
    cardBody: { fontSize: 12, color: C.textMuted, lineHeight: 17 },

    pastToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 14,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
    },
    pastToggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted },
  });
}
