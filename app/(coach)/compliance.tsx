import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useCoachData } from '../../hooks/useCoachData';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

interface CalendarPeriod {
  id: string;
  division: string;
  region: string | null;
  period_type: string;
  start_date: string;
  end_date: string;
  communication_allowed: string[];
  description: string;
}

const PERIOD_CONFIG: Record<string, { label: string; color: string }> = {
  dead:       { label: 'Dead Period',       color: '#ef4444' },
  quiet:      { label: 'Quiet Period',      color: '#f59e0b' },
  evaluation: { label: 'Evaluation Period', color: '#3b82f6' },
  contact:    { label: 'Contact Period',    color: '#22c55e' },
  signing:    { label: 'Signing Period',    color: '#8b5cf6' },
  open:       { label: 'Open Recruiting',   color: '#22c55e' },
  unknown:    { label: 'Unknown',           color: '#6b7280' },
};

const COMM_LABELS: Record<string, string> = {
  phone: 'Phone Calls', email: 'Email', text: 'Text / DM',
  visit_oncampus: 'On-Campus Visits', visit_offcampus: 'Off-Campus Visits',
  evaluation: 'Film Evaluation', evaluation_oncampus: 'On-Campus Evaluation',
};
const ALL_COMMS = ['phone', 'email', 'text', 'visit_oncampus', 'visit_offcampus', 'evaluation', 'evaluation_oncampus'];

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function CoachComplianceScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();

  const [periods, setPeriods] = useState<CalendarPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (coachLoading) return;
    if (!coach) { router.replace('/(coach)' as any); return; }
    if (!coach.position_coached) { router.replace('/coach-setup' as any); return; }

    supabase
      .from('recruiting_calendars')
      .select('id, division, region, period_type, start_date, end_date, communication_allowed, description')
      .eq('division', coach.division)
      .is('region', null)
      .order('start_date', { ascending: true })
      .then(({ data }) => {
        setPeriods(data ?? []);
        setLoading(false);
      });
  }, [coachLoading, coach?.id]);

  if (coachLoading || loading) {
    return (
      <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>
    );
  }
  if (!coach) return null;

  const today = new Date().toISOString().split('T')[0];
  const currentPeriod = periods.find(p => p.start_date <= today && p.end_date >= today) ?? null;
  const nextPeriod = currentPeriod
    ? periods.find(p => p.start_date > currentPeriod.end_date) ?? null
    : periods.find(p => p.start_date > today) ?? null;

  const cfg = PERIOD_CONFIG[currentPeriod?.period_type ?? 'unknown'];
  const daysLeft = currentPeriod ? daysBetween(today, currentPeriod.end_date) : null;
  const nextCfg = nextPeriod ? (PERIOD_CONFIG[nextPeriod.period_type] ?? PERIOD_CONFIG.unknown) : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>COACH DASHBOARD</Text>
        <Text style={s.title}>Compliance</Text>
        <Text style={s.sub}>{coach.division} recruiting calendar</Text>
      </View>

      {/* Current period hero */}
      <View style={[s.heroCard, { borderColor: `${cfg.color}40` }]}>
        <View style={s.heroTop}>
          <View style={{ flex: 1 }}>
            <View style={s.statusRow}>
              <View style={[s.dot, { backgroundColor: cfg.color, width: 10, height: 10, borderRadius: 5 }]} />
              <Text style={s.statusLabel}>CURRENT STATUS</Text>
            </View>
            <Text style={[s.heroPeriod, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={s.heroDesc}>{currentPeriod?.description ?? "No active recruiting period found for today's date."}</Text>
          </View>
          {daysLeft !== null && (
            <View style={[s.daysBox, { backgroundColor: `${cfg.color}14` }]}>
              <Text style={[s.daysValue, { color: cfg.color }]}>{daysLeft}</Text>
              <Text style={s.daysLabel}>days left</Text>
            </View>
          )}
        </View>
        {currentPeriod && (
          <View style={[s.heroFooter, { borderTopColor: C.border }]}>
            <Text style={s.heroFooterText}>{formatDate(currentPeriod.start_date)} — {formatDate(currentPeriod.end_date)}</Text>
          </View>
        )}
      </View>

      {/* What's allowed */}
      {currentPeriod && (
        <View style={s.allowedCard}>
          <Text style={s.allowedTitle}>WHAT'S ALLOWED RIGHT NOW</Text>
          {ALL_COMMS.map(comm => {
            const allowed = currentPeriod.communication_allowed.includes(comm);
            return (
              <View key={comm} style={s.allowedRow}>
                <View style={[s.allowedIcon, { backgroundColor: allowed ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)' }]}>
                  <Ionicons name={allowed ? 'checkmark' : 'close'} size={12} color={allowed ? '#22c55e' : '#ef4444'} />
                </View>
                <Text style={[s.allowedLabel, { color: allowed ? C.text : C.textDim, fontFamily: allowed ? FontFamily.bodySemi : FontFamily.body }]}>
                  {COMM_LABELS[comm]}
                </Text>
                {!allowed && <Text style={s.notAllowed}>NOT ALLOWED</Text>}
              </View>
            );
          })}
        </View>
      )}

      {/* Next period callout */}
      {nextPeriod && nextCfg && (
        <View style={[s.nextCard, { backgroundColor: `${nextCfg.color}0d`, borderColor: `${nextCfg.color}30` }]}>
          <Ionicons name="alert-circle-outline" size={16} color={nextCfg.color} />
          <Text style={s.nextText}>
            Next: <Text style={{ fontFamily: FontFamily.bodyBold, color: nextCfg.color }}>{nextCfg.label}</Text> starts{' '}
            <Text style={{ fontFamily: FontFamily.bodySemi, color: C.text }}>{formatDate(nextPeriod.start_date)}</Text>
            {' '}· {daysBetween(today, nextPeriod.start_date)} days away
          </Text>
        </View>
      )}

      {/* Full calendar */}
      <Text style={s.calendarTitle}>Full Year Calendar</Text>
      <View style={{ gap: 8 }}>
        {periods.map(p => {
          const c = PERIOD_CONFIG[p.period_type] ?? PERIOD_CONFIG.unknown;
          const isNow = p.start_date <= today && p.end_date >= today;
          const isPast = p.end_date < today;
          const isExpanded = expandedId === p.id;
          return (
            <View
              key={p.id}
              style={[
                s.periodCard,
                { borderColor: isNow ? `${c.color}40` : C.border, opacity: isPast ? 0.6 : 1 },
              ]}
            >
              <Pressable style={s.periodRow} onPress={() => setExpandedId(isExpanded ? null : p.id)}>
                <View style={[s.dot, { backgroundColor: c.color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[s.periodLabel, { color: isNow ? c.color : C.text }]}>{c.label}</Text>
                    {isNow && (
                      <View style={[s.nowBadge, { backgroundColor: c.color }]}><Text style={s.nowBadgeText}>NOW</Text></View>
                    )}
                  </View>
                  <Text style={s.periodDates}>
                    {formatDate(p.start_date)} — {formatDate(p.end_date)} · {daysBetween(p.start_date, p.end_date)} days
                  </Text>
                </View>
                <Text style={[s.allowedCount, { color: p.communication_allowed.length > 3 ? '#22c55e' : p.communication_allowed.length > 1 ? '#f59e0b' : '#ef4444' }]}>
                  {p.communication_allowed.length}
                </Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={C.textDim} />
              </Pressable>
              {isExpanded && (
                <View style={[s.periodDetail, { borderTopColor: C.border }]}>
                  <Text style={s.periodDescText}>{p.description}</Text>
                  <View style={s.detailChips}>
                    {ALL_COMMS.map(comm => {
                      const ok = p.communication_allowed.includes(comm);
                      return (
                        <View key={comm} style={[s.detailChip, { backgroundColor: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.06)' }]}>
                          <Text style={[s.detailChipText, { color: ok ? '#22c55e' : '#ef4444', textDecorationLine: ok ? 'none' : 'line-through' }]}>
                            {COMM_LABELS[comm]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {coach.division === 'NJCAA' && (
        <View style={[s.disclaimer, { backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }]}>
          <Ionicons name="alert-circle-outline" size={15} color="#f59e0b" />
          <Text style={s.disclaimerText}>
            <Text style={{ fontFamily: FontFamily.bodyBold, color: C.text }}>NJCAA Regional Rules. </Text>
            National rules shown above. Your region{coach.region ? ` (${coach.region})` : ''} may have additional restrictions. Always verify with your regional director before making contact with prospects.
          </Text>
        </View>
      )}

      {(coach.division === 'D1_FBS' || coach.division === 'D1_FCS') && (
        <View style={[s.disclaimer, { backgroundColor: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }]}>
          <Ionicons name="shield-outline" size={15} color="#3b82f6" />
          <Text style={s.disclaimerText}>
            <Text style={{ fontFamily: FontFamily.bodyBold, color: C.text }}>D1 dates are approximate. </Text>
            Official NCAA recruiting calendars are released each August. These dates are estimates and will be updated when released. Always confirm key dates at ncaa.org before acting.
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={s.legendRow}>
        {Object.entries(PERIOD_CONFIG).filter(([k]) => k !== 'unknown').map(([type, c]) => (
          <View key={type} style={s.legendItem}>
            <View style={[s.dot, { backgroundColor: c.color, width: 8, height: 8, borderRadius: 4 }]} />
            <Text style={s.legendText}>{c.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { marginBottom: 22 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 26, color: C.text },
    sub: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginTop: 2 },

    heroCard: { backgroundColor: C.surface, borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
    heroTop: { flexDirection: 'row', gap: 12 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    statusLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, letterSpacing: 0.8 },
    heroPeriod: { fontFamily: FontFamily.headlineBold, fontSize: 20, marginBottom: 6 },
    heroDesc: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19 },
    daysBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
    daysValue: { fontFamily: FontFamily.headline, fontSize: 24 },
    daysLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5, marginTop: 2 },
    heroFooter: { marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
    heroFooterText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },

    allowedCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 18, marginBottom: 16, gap: 9 },
    allowedTitle: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.8, marginBottom: 6 },
    allowedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    allowedIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    allowedLabel: { fontSize: 13, flex: 1 },
    notAllowed: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#ef4444' },

    nextCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 24 },
    nextText: { flex: 1, fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19 },

    calendarTitle: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.text, marginBottom: 14 },
    periodCard: { backgroundColor: C.surface, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
    periodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    periodLabel: { fontFamily: FontFamily.bodyBold, fontSize: 13 },
    nowBadge: { borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
    nowBadgeText: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#fff' },
    periodDates: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    allowedCount: { fontFamily: FontFamily.bodyBold, fontSize: 13 },
    periodDetail: { padding: 16, paddingTop: 12, borderTopWidth: 1 },
    periodDescText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 19, marginBottom: 12 },
    detailChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    detailChip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
    detailChipText: { fontFamily: FontFamily.bodySemi, fontSize: 11 },

    disclaimer: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
    disclaimerText: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 18 },

    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendText: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim },
  });
}
