import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { GradientButton } from '../../components/GradientButton';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type OutreachStatus = 'sent' | 'opened' | 'replied' | 'bounced' | 'interested';

interface CoachContact {
  id: string;
  coach_name: string | null;
  school_name: string | null;
  status: OutreachStatus;
  sent_at: string | null;
  created_at: string;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OutreachScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const STAGES = useMemo(() => [
    { key: 'sent' as OutreachStatus,       label: 'Contacted',  color: C.textMuted },
    { key: 'opened' as OutreachStatus,     label: 'Opened',     color: C.primary },
    { key: 'replied' as OutreachStatus,    label: 'Replied',    color: '#71ff7e' },
    { key: 'interested' as OutreachStatus, label: 'Interested', color: '#F59E0B' },
  ], [C]);

  const STATUS_META = useMemo(() => ({
    sent:       { label: 'Sent',       color: C.textMuted },
    opened:     { label: 'Opened',     color: C.primary },
    replied:    { label: 'Replied',    color: '#71ff7e' },
    bounced:    { label: 'Bounced',    color: C.error },
    interested: { label: 'Interested', color: '#F59E0B' },
  }), [C]);

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<CoachContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const { data: ath } = await supabase
      .from('athletes')
      .select('id')
      .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
      .maybeSingle();

    if (ath) {
      setAthleteId(ath.id);
      const { data } = await supabase
        .from('coach_outreach')
        .select('id, coach_name, school_name, status, sent_at, created_at')
        .eq('athlete_id', ath.id)
        .order('created_at', { ascending: false });
      setContacts((data as CoachContact[]) ?? []);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stageCounts = STAGES.reduce<Record<string, number>>((acc, stage) => {
    acc[stage.key] = contacts.filter(c => c.status === stage.key).length;
    return acc;
  }, {});

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={C.primary} />
      }
    >
      {/* Header */}
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>Outreach</Text>
          <Text style={s.subtitle}>Coach recruiting pipeline</Text>
        </View>
        <GradientButton
          style={s.composeBtn}
          onPress={() => router.push('/outreach/compose')}
        >
          <Ionicons name="add" size={18} color={C.white} />
          <Text style={s.composeBtnText}>New</Text>
        </GradientButton>
      </View>

      {/* Pipeline */}
      <View style={s.pipeline}>
        {STAGES.map(stage => (
          <View key={stage.key} style={s.stageCard}>
            <View style={[s.stageDot, { backgroundColor: stage.color }]} />
            <Text style={s.stageCount}>{loading ? '—' : (stageCounts[stage.key] ?? 0)}</Text>
            <Text style={s.stageLabel}>{stage.label}</Text>
          </View>
        ))}
      </View>

      {/* Contact list */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={C.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="mail-outline" size={36} color={C.icon} />
          <Text style={s.emptyTitle}>No outreach yet</Text>
          <Text style={s.emptyBody}>
            Tap "New" to compose your first coach email and start building your pipeline.
          </Text>
          <GradientButton
            style={s.emptyBtn}
            onPress={() => router.push('/outreach/compose')}
          >
            <Ionicons name="add-circle-outline" size={17} color={C.white} />
            <Text style={s.emptyBtnText}>Compose First Email</Text>
          </GradientButton>
        </View>
      ) : (
        <View style={s.listCard}>
          <Text style={s.listHeader}>RECENT CONTACTS</Text>
          {contacts.map((c, i) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.sent;
            const initial = (c.coach_name ?? 'C')[0].toUpperCase();
            return (
              <View key={c.id} style={[s.contactRow, i < contacts.length - 1 && s.contactRowBorder]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{initial}</Text>
                </View>
                <View style={s.contactInfo}>
                  <Text style={s.contactName}>{c.coach_name ?? 'Unknown Coach'}</Text>
                  <Text style={s.contactSchool}>{c.school_name ?? '—'}</Text>
                </View>
                <View style={[s.statusBadge, { borderColor: meta.color }]}>
                  <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 14 },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
    subtitle: { fontSize: 15, color: C.textMuted },

    composeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      marginTop: 4,
    },
    composeBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

    pipeline: { flexDirection: 'row', gap: 8 },
    stageCard: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      gap: 4,
    },
    stageDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 2 },
    stageCount: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -1 },
    stageLabel: { fontSize: 10, fontWeight: '500', color: C.textMuted, textAlign: 'center' },

    loader: { paddingVertical: 40, alignItems: 'center' },

    emptyCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 36,
      alignItems: 'center',
      gap: 10,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.text },
    emptyBody: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 4 },
    emptyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

    listCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
    },
    listHeader: {
      fontSize: 10,
      fontWeight: '700',
      color: C.textDim,
      letterSpacing: 1.4,
      marginBottom: 10,
    },
    contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    contactRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: `${C.primary}22`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontSize: 15, fontWeight: '700', color: C.primary },
    contactInfo: { flex: 1 },
    contactName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
    contactSchool: { fontSize: 12, color: C.textMuted },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  });
}
