import { useCallback, useEffect, useState } from 'react';
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
import { Colors } from '../../constants/Colors';

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

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: {
  key: OutreachStatus | 'identified';
  label: string;
  color: string;
}[] = [
  { key: 'sent',       label: 'Contacted',  color: Colors.textMuted },
  { key: 'opened',     label: 'Opened',     color: Colors.primary },
  { key: 'replied',    label: 'Replied',    color: '#71ff7e' },
  { key: 'interested', label: 'Interested', color: '#F59E0B' },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  sent:       { label: 'Sent',       color: Colors.textMuted },
  opened:     { label: 'Opened',     color: Colors.primary },
  replied:    { label: 'Replied',    color: '#71ff7e' },
  bounced:    { label: 'Bounced',    color: Colors.error },
  interested: { label: 'Interested', color: '#F59E0B' },
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OutreachScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

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

  // Stage counts
  const stageCounts = STAGES.reduce<Record<string, number>>((acc, stage) => {
    acc[stage.key] = contacts.filter(c => c.status === stage.key).length;
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Outreach</Text>
          <Text style={styles.subtitle}>Coach recruiting pipeline</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.composeBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/outreach/compose')}
        >
          <Ionicons name="add" size={18} color={Colors.white} />
          <Text style={styles.composeBtnText}>New</Text>
        </Pressable>
      </View>

      {/* Pipeline */}
      <View style={styles.pipeline}>
        {STAGES.map(stage => (
          <View key={stage.key} style={styles.stageCard}>
            <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
            <Text style={styles.stageCount}>{loading ? '—' : (stageCounts[stage.key] ?? 0)}</Text>
            <Text style={styles.stageLabel}>{stage.label}</Text>
          </View>
        ))}
      </View>

      {/* Contact list */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="mail-outline" size={36} color={Colors.textDim} />
          <Text style={styles.emptyTitle}>No outreach yet</Text>
          <Text style={styles.emptyBody}>
            Tap "New" to compose your first coach email and start building your pipeline.
          </Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push('/outreach/compose')}
          >
            <Ionicons name="add-circle-outline" size={17} color={Colors.white} />
            <Text style={styles.emptyBtnText}>Compose First Email</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.listCard}>
          <Text style={styles.listHeader}>RECENT CONTACTS</Text>
          {contacts.map((c, i) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.sent;
            const initial = (c.coach_name ?? 'C')[0].toUpperCase();
            return (
              <View key={c.id} style={[styles.contactRow, i < contacts.length - 1 && styles.contactRowBorder]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{c.coach_name ?? 'Unknown Coach'}</Text>
                  <Text style={styles.contactSchool}>{c.school_name ?? '—'}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: meta.color }]}>
                  <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 14 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 15, color: Colors.textMuted },

  composeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  composeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  pipeline: { flexDirection: 'row', gap: 8 },
  stageCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  stageDot: { width: 7, height: 7, borderRadius: 4, marginBottom: 2 },
  stageCount: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -1 },
  stageLabel: { fontSize: 10, fontWeight: '500', color: Colors.textMuted, textAlign: 'center' },

  loader: { paddingVertical: 40, alignItems: 'center' },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 36,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 4 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },

  listCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  listHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  contactRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${Colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  contactSchool: { fontSize: 12, color: Colors.textMuted },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
