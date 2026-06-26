'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { useColors } from '../../context/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const COACH_PINK        = 'rgb(199,0,156)';
const COACH_PINK_BG     = 'rgba(199,0,156,0.08)';
const COACH_PINK_BORDER = 'rgba(199,0,156,0.2)';
const ADVISOR_PHOTO_URL = 'https://v1portal.com/wes-starke-ceo.png';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorSlot {
  id: string;
  slot_datetime: string;
  duration_minutes: number;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function daysBetween(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CoachPlusScreen() {
  const C = useColors();
  const router = useRouter();
  const { athlete, loading: athleteLoading, refresh } = useAthleteData();

  const [slots, setSlots]       = useState<AdvisorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [refreshing, setRefreshing]     = useState(false);

  const isElite =
    athlete?.subscription_status === 'active' &&
    athlete?.subscription_tier === 'elite';

  const fetchSlots = useCallback(async () => {
    if (!athlete?.id) return;
    setSlotsLoading(true);
    const { data } = await supabase
      .from('advisor_slots')
      .select('id, slot_datetime, duration_minutes, status')
      .eq('athlete_id', athlete.id)
      .eq('status', 'booked')
      .order('slot_datetime', { ascending: false });
    setSlots(data || []);
    setSlotsLoading(false);
  }, [athlete?.id]);

  useEffect(() => {
    if (isElite) fetchSlots();
  }, [isElite, fetchSlots]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), fetchSlots()]);
    setRefreshing(false);
  }, [refresh, fetchSlots]);

  // ── Loading ──
  if (athleteLoading) {
    return (
      <View style={[s.center, { backgroundColor: C.background }]}>
        <ActivityIndicator color={COACH_PINK} size="large" />
      </View>
    );
  }

  // ── Not Coach+ ──
  if (!isElite) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: C.background }}
        contentContainerStyle={[s.center, { padding: 32 }]}
      >
        <View style={[s.lockIconWrap, { backgroundColor: COACH_PINK_BG, borderColor: COACH_PINK_BORDER }]}>
          <Ionicons name="person" size={28} color={COACH_PINK} />
        </View>
        <Text style={[s.lockTitle, { color: C.text }]}>Advisor Hub</Text>
        <Text style={[s.lockBody, { color: C.textMuted }]}>
          Biweekly 1-on-1 strategy calls with a dedicated V1 recruiting advisor are a Coach+ exclusive.
        </Text>
        <Pressable
          style={s.lockCta}
          onPress={() => Linking.openURL('https://v1portal.com/dashboard/upgrade')}
        >
          <LinearGradient colors={['#ff0000', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.lockCtaGrad}>
            <Text style={s.lockCtaText}>Apply for Coach+ — $697/mo</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Slot segmentation ──
  const now = new Date();
  const past     = slots.filter(s => new Date(s.slot_datetime) < now);
  const upcoming = slots.filter(s => new Date(s.slot_datetime) >= now);
  const nextCall = upcoming[upcoming.length - 1] ?? null; // slots sorted desc, so last is soonest
  const daysToNext = nextCall ? daysBetween(nextCall.slot_datetime) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.background }}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COACH_PINK} />}
    >
      {/* ── Advisor Header ── */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <View style={s.headerTop}>
          <Image
            source={{ uri: ADVISOR_PHOTO_URL }}
            style={s.advisorPhoto}
          />
          <View style={{ flex: 1 }}>
            <View style={s.statusRow}>
              <View style={s.statusDot} />
              <Text style={s.statusText}>COACH+ · ACTIVE</Text>
            </View>
            <Text style={[s.advisorName, { color: C.text }]}>Coach Wes</Text>
            <Text style={[s.advisorTitle, { color: C.textMuted }]}>V1 Recruiting Advisor</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={[s.statsRow, { borderTopColor: C.border }]}>
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: C.text }]}>{past.length}</Text>
            <Text style={[s.statLabel, { color: C.textMuted }]}>Sessions</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: C.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: C.text }]}>{daysToNext !== null ? daysToNext : '—'}</Text>
            <Text style={[s.statLabel, { color: C.textMuted }]}>Days to Call</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: C.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statNum, { color: COACH_PINK }]}>2x</Text>
            <Text style={[s.statLabel, { color: C.textMuted }]}>per Month</Text>
          </View>
        </View>
      </View>

      <View style={s.body}>

        {/* ── Next Session ── */}
        {nextCall && (
          <View style={[s.nextCard, { backgroundColor: COACH_PINK_BG, borderColor: COACH_PINK_BORDER }]}>
            <Text style={[s.sectionLabel, { color: COACH_PINK }]}>NEXT SESSION</Text>
            <Text style={[s.nextDate, { color: C.text }]}>{formatDate(nextCall.slot_datetime)}</Text>
            <Text style={[s.nextTime, { color: C.textMuted }]}>
              {formatTime(nextCall.slot_datetime)} · {nextCall.duration_minutes} min with Coach Wes
            </Text>
            <Pressable
              style={s.joinBtn}
              onPress={() => Linking.openURL('https://v1portal.com/dashboard/schedule-call')}
            >
              <Text style={s.joinBtnText}>Manage Call →</Text>
            </Pressable>
          </View>
        )}

        {/* ── Session Log ── */}
        <Text style={[s.sectionTitle, { color: C.text }]}>Session Log</Text>
        {slotsLoading ? (
          <ActivityIndicator color={COACH_PINK} style={{ marginTop: 12 }} />
        ) : past.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="calendar-outline" size={24} color={C.textDim} style={{ marginBottom: 8 }} />
            <Text style={[s.emptyText, { color: C.textMuted }]}>No sessions yet. Your first call will appear here after it's completed.</Text>
          </View>
        ) : (
          <View style={[s.logCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            {past.map((slot, idx) => (
              <View
                key={slot.id}
                style={[
                  s.logRow,
                  idx < past.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                ]}
              >
                <View style={[s.logCheck, { borderColor: COACH_PINK_BORDER, backgroundColor: COACH_PINK_BG }]}>
                  <Ionicons name="checkmark" size={12} color={COACH_PINK} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.logDate, { color: C.text }]}>{formatDate(slot.slot_datetime)}</Text>
                  <Text style={[s.logTime, { color: C.textMuted }]}>
                    {formatTime(slot.slot_datetime)} · {slot.duration_minutes} min
                  </Text>
                </View>
                <Text style={[s.logStatus, { color: COACH_PINK }]}>Completed</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Quick Actions ── */}
        <Text style={[s.sectionTitle, { color: C.text }]}>Quick Actions</Text>
        <View style={[s.actionsCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          {[
            {
              icon: 'calendar' as const,
              label: 'Schedule Call',
              sub: 'Book your next 1:1 session',
              onPress: () => Linking.openURL('https://v1portal.com/dashboard/schedule-call'),
            },
            {
              icon: 'mail' as const,
              label: 'Message Advisor',
              sub: 'support@v1portal.com',
              onPress: () => Linking.openURL('mailto:support@v1portal.com'),
            },
            {
              icon: 'bar-chart' as const,
              label: 'Recruiting Intelligence',
              sub: 'View your analytics',
              onPress: () => router.push('/(tabs)/analytics' as any),
            },
            {
              icon: 'school' as const,
              label: 'My Programs',
              sub: 'View matched programs',
              onPress: () => router.push('/(tabs)/programs' as any),
            },
          ].map((action, idx, arr) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                s.actionRow,
                idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                pressed && { opacity: 0.7 },
              ]}
              onPress={action.onPress}
            >
              <View style={[s.actionIconWrap, { backgroundColor: COACH_PINK_BG }]}>
                <Ionicons name={action.icon} size={16} color={COACH_PINK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.actionLabel, { color: C.text }]}>{action.label}</Text>
                <Text style={[s.actionSub, { color: C.textMuted }]}>{action.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={C.textDim} />
            </Pressable>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Lock screen
  lockIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 20 },
  lockTitle:    { fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  lockBody:     { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28, maxWidth: 300 },
  lockCta:      { borderRadius: 100, overflow: 'hidden' },
  lockCtaGrad:  { paddingVertical: 13, paddingHorizontal: 28 },
  lockCtaText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Header
  header:         { borderBottomWidth: 1, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 0 },
  headerTop:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  advisorPhoto:   { width: 56, height: 56, borderRadius: 28, flexShrink: 0 },
  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  statusDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: COACH_PINK },
  statusText:     { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: COACH_PINK },
  advisorName:    { fontSize: 17, fontWeight: '800' },
  advisorTitle:   { fontSize: 12, marginTop: 2 },
  statsRow:       { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 16 },
  statItem:       { flex: 1, alignItems: 'center' },
  statNum:        { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:      { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginTop: 2 },
  statDivider:    { width: 1, marginVertical: 4 },

  // Body
  body:           { padding: 16, gap: 20 },
  sectionLabel:   { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },

  // Next session card
  nextCard:       { borderRadius: 16, borderWidth: 1, padding: 18 },
  nextDate:       { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  nextTime:       { fontSize: 13, marginBottom: 14 },
  joinBtn:        { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 100, backgroundColor: COACH_PINK },
  joinBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Session log
  emptyCard:      { borderRadius: 14, borderWidth: 1, padding: 28, alignItems: 'center' },
  emptyText:      { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  logCard:        { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  logRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  logCheck:       { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logDate:        { fontSize: 13, fontWeight: '600' },
  logTime:        { fontSize: 11, marginTop: 1 },
  logStatus:      { fontSize: 11, fontWeight: '600' },

  // Quick actions
  actionsCard:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  actionRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  actionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionLabel:    { fontSize: 14, fontWeight: '600' },
  actionSub:      { fontSize: 11, marginTop: 1 },
});
