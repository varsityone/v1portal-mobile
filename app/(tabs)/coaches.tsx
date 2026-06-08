import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoachProgram { id?: string; name: string; division: string; }
interface Coach { id: string; name: string; title: string | null; email: string | null; programs: CoachProgram | null; }
interface TrackerEntry {
  id: string;
  coach_id: string;
  status: string;
  priority: string;
  notes: string | null;
  next_action: string | null;
  next_action_date: string | null;
  replied_at: string | null;
  updated_at: string;
  coach?: Coach | null;
  lastContact?: string | null;
  emailCount?: number;
}

// ── Status + Priority configs — matches web tracker exactly ───────────────────

const STATUSES = [
  { value: 'not_contacted', label: 'Not Contacted', color: '#5a5d63', bg: 'rgba(90,93,99,0.18)' },
  { value: 'contacted',     label: 'Contacted',     color: '#0ea5e9', bg: 'rgba(14,165,233,0.14)' },
  { value: 'responded',     label: 'Responded',     color: '#a78bfa', bg: 'rgba(167,139,250,0.14)' },
  { value: 'interested',    label: 'Interested',    color: '#71ff7e', bg: 'rgba(113,255,126,0.14)' },
  { value: 'camp_invite',   label: 'Camp Invite',   color: '#f1a10d', bg: 'rgba(241,161,13,0.14)' },
  { value: 'offer',         label: 'Offer',         color: '#a3ff47', bg: 'rgba(163,255,71,0.15)' },
  { value: 'not_interested',label: 'Not Interested',color: '#e63535', bg: 'rgba(230,53,53,0.12)' },
];

const PRIORITIES = [
  { value: 'high',   label: 'High',   color: '#e63535' },
  { value: 'normal', label: 'Normal', color: '#9a9da2' },
  { value: 'low',    label: 'Low',    color: '#5a5d63' },
];

const getStatus   = (v: string) => STATUSES.find(s => s.value === v) ?? STATUSES[0];
const getPriority = (v: string) => PRIORITIES.find(p => p.value === v) ?? PRIORITIES[1];

function timeAgo(d: string | null): string {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  if (days < 7)  return `${days}d ago`;
  const w = Math.floor(days / 7);
  return w === 1 ? '1w ago' : `${w}w ago`;
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ entry, onSave, onClose }: {
  entry: TrackerEntry;
  onSave: (id: string, updates: Partial<TrackerEntry>) => Promise<void>;
  onClose: () => void;
}) {
  const C = useColors();
  const em = useMemo(() => createEmStyles(C), [C]);

  const [status, setStatus]         = useState(entry.status);
  const [priority, setPriority]     = useState(entry.priority);
  const [notes, setNotes]           = useState(entry.notes ?? '');
  const [nextAction, setNextAction] = useState(entry.next_action ?? '');
  const [replied, setReplied]       = useState(!!entry.replied_at);
  const [saving, setSaving]         = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updates: Partial<TrackerEntry> = {
      status, priority,
      notes: notes || null,
      next_action: nextAction || null,
      ...(replied && !entry.replied_at ? { replied_at: new Date().toISOString() } : {}),
    };
    await onSave(entry.id, updates);
    setSaving(false);
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={em.backdrop} onPress={onClose} />
      <View style={em.sheet}>
        <View style={em.handle} />
        <View style={em.sheetHeader}>
          <View>
            <Text style={em.sheetTitle}>{entry.coach?.name ?? 'Coach'}</Text>
            {entry.coach?.programs?.name ? (
              <Text style={em.sheetSub}>{entry.coach.programs.name} · {entry.coach.programs.division}</Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={C.textMuted} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status */}
          <Text style={em.fieldLabel}>Relationship Status</Text>
          <View style={em.chipRow}>
            {STATUSES.map(s => (
              <Pressable
                key={s.value}
                style={[em.chip, status === s.value && { backgroundColor: s.bg, borderColor: s.color }]}
                onPress={() => setStatus(s.value)}
              >
                <Text style={[em.chipText, status === s.value && { color: s.color }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Priority */}
          <Text style={em.fieldLabel}>Priority</Text>
          <View style={em.priorityRow}>
            {PRIORITIES.map(p => (
              <Pressable
                key={p.value}
                style={[em.priorityBtn, priority === p.value && { backgroundColor: p.color + '20', borderColor: p.color }]}
                onPress={() => setPriority(p.value)}
              >
                <Text style={[em.priorityText, { color: priority === p.value ? p.color : C.textDim }]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Replied */}
          <Pressable
            style={[em.repliedRow, replied && { backgroundColor: 'rgba(113,255,126,0.08)', borderColor: '#71ff7e' }]}
            onPress={() => setReplied(v => !v)}
          >
            <View style={[em.checkbox, replied && { backgroundColor: '#71ff7e', borderColor: '#71ff7e' }]}>
              {replied && <Ionicons name="checkmark" size={11} color="#000" />}
            </View>
            <Text style={[em.repliedText, { color: replied ? '#71ff7e' : C.textMuted }]}>Coach replied</Text>
          </Pressable>

          {/* Next action */}
          <Text style={em.fieldLabel}>Next Action</Text>
          <TextInput
            style={em.input}
            value={nextAction}
            onChangeText={setNextAction}
            placeholder="e.g. Follow up email, Attend camp..."
            placeholderTextColor={C.textDim}
          />

          {/* Notes */}
          <Text style={em.fieldLabel}>Notes</Text>
          <TextInput
            style={[em.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything worth remembering..."
            placeholderTextColor={C.textDim}
            multiline
          />

          <View style={em.actions}>
            <Pressable style={em.cancelBtn} onPress={onClose}>
              <Text style={em.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[em.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={em.saveText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Add Coach Modal ───────────────────────────────────────────────────────────

function AddCoachModal({ athleteId, existing, onAdd, onClose }: {
  athleteId: string;
  existing: string[];
  onAdd: (coach: Coach) => void;
  onClose: () => void;
}) {
  const C = useColors();
  const em = useMemo(() => createEmStyles(C), [C]);
  const ac = useMemo(() => createAcStyles(C), [C]);

  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Coach[]>([]);
  const [busy, setBusy]       = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setBusy(true);
    const { data } = await supabase
      .from('coaches')
      .select('id, name, title, email, programs(id, name, division)')
      .ilike('name', `%${q}%`)
      .limit(10);
    setResults((data ?? []) as unknown as Coach[]);
    setBusy(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={em.backdrop} onPress={onClose} />
      <View style={[em.sheet, { maxHeight: '75%' }]}>
        <View style={em.handle} />
        <View style={em.sheetHeader}>
          <Text style={em.sheetTitle}>Add Coach to Tracker</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={C.textMuted} />
          </Pressable>
        </View>
        <TextInput
          style={[em.input, { marginBottom: 12 }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by coach name…"
          placeholderTextColor={C.textDim}
          autoFocus
        />
        {busy && <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />}
        <ScrollView showsVerticalScrollIndicator={false}>
          {results.map(c => {
            const already = existing.includes(c.id);
            return (
              <Pressable
                key={c.id}
                style={[ac.row, already && { opacity: 0.45 }]}
                onPress={() => { if (!already) { onAdd(c); onClose(); } }}
                disabled={already}
              >
                <View style={{ flex: 1 }}>
                  <Text style={ac.name}>{c.name}</Text>
                  <Text style={ac.sub}>{c.programs?.name ?? '—'} · {c.title ?? 'Coach'}</Text>
                </View>
                <Text style={[ac.addText, already && { color: C.textDim }]}>
                  {already ? 'Added' : '+ Add'}
                </Text>
              </Pressable>
            );
          })}
          {query.length > 0 && !busy && results.length === 0 && (
            <Text style={ac.empty}>No coaches found. Try a different name.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CoachesScreen() {
  const { athlete } = useAthleteData();
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [entries, setEntries]     = useState<TrackerEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editEntry, setEditEntry] = useState<TrackerEntry | null>(null);
  const [addingCoach, setAddingCoach] = useState(false);
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');

  const loadTracker = useCallback(async () => {
    if (!athlete?.id) return;
    setLoading(true);

    const { data } = await supabase
      .from('coach_tracker')
      .select('*, coach:coaches(id, name, title, email, programs(id, name, division))')
      .eq('athlete_id', athlete.id)
      .order('updated_at', { ascending: false });

    if (!data) { setLoading(false); return; }

    const enriched = await Promise.all(data.map(async (entry: any) => {
      const programId = entry.coach?.programs?.id;
      if (!programId) return { ...entry, lastContact: null, emailCount: 0 };
      const { data: emails, count } = await supabase
        .from('coach_outreach')
        .select('sent_at', { count: 'exact' })
        .eq('athlete_id', athlete.id)
        .eq('program_id', programId)
        .order('sent_at', { ascending: false })
        .limit(1);
      return { ...entry, lastContact: emails?.[0]?.sent_at ?? null, emailCount: count ?? 0 };
    }));

    setEntries(enriched as TrackerEntry[]);
    setLoading(false);
  }, [athlete?.id]);

  useEffect(() => { loadTracker(); }, [loadTracker]);

  const handleSave = async (id: string, updates: Partial<TrackerEntry>) => {
    await supabase
      .from('coach_tracker')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const handleAddCoach = async (coach: Coach) => {
    if (!athlete?.id) return;
    const { data, error } = await supabase
      .from('coach_tracker')
      .insert({ athlete_id: athlete.id, coach_id: coach.id, status: 'not_contacted', priority: 'normal' })
      .select('*, coach:coaches(id, name, title, email, programs(id, name, division))')
      .single();
    if (!error && data) {
      setEntries(prev => [{ ...(data as any), lastContact: null, emailCount: 0, replied_at: null }, ...prev]);
    }
  };

  const handleRemove = async (id: string) => {
    await supabase.from('coach_tracker').delete().eq('id', id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const filtered = entries.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (filterPriority !== 'all' && e.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = e.coach?.name?.toLowerCase() ?? '';
      const prog = e.coach?.programs?.name?.toLowerCase() ?? '';
      if (!name.includes(q) && !prog.includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total:      entries.length,
    interested: entries.filter(e => e.status === 'interested').length,
    campInvite: entries.filter(e => e.status === 'camp_invite').length,
    offer:      entries.filter(e => e.status === 'offer').length,
  };

  const existingCoachIds = entries.map(e => e.coach_id);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTracker} tintColor={C.primary} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Coach Tracker</Text>
          <Text style={s.subtitle}>Manage every coach relationship from first contact to offer.</Text>
        </View>
        <Pressable style={s.addBtn} onPress={() => setAddingCoach(true)}>
          <Ionicons name="add" size={14} color="#fff" />
          <Text style={s.addBtnText}>Add Coach</Text>
        </Pressable>
      </View>

      {/* ── Stats 2×2 ── */}
      <View style={s.statsGrid}>
        {[
          { label: 'Total Tracked', value: stats.total,      color: C.text    },
          { label: 'Interested',    value: stats.interested, color: '#71ff7e' },
          { label: 'Camp Invites',  value: stats.campInvite, color: '#f1a10d' },
          { label: 'Offers',        value: stats.offer,      color: '#a3ff47' },
        ].map((st, i) => (
          <View key={i} style={s.statCard}>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Filters ── */}
      <View style={s.filterRow}>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={14} color={C.textDim} />
          <TextInput
            style={s.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search coaches..."
            placeholderTextColor={C.textDim}
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterPills}>
        {['all', ...STATUSES.map(st => st.value)].map(val => {
          const cfg = val === 'all' ? null : getStatus(val);
          const active = filterStatus === val;
          const color = cfg ? cfg.color : C.primary;
          return (
            <Pressable
              key={val}
              style={[s.pill, active && { backgroundColor: color + '20', borderColor: color + '60' }]}
              onPress={() => setFilterStatus(val)}
            >
              <Text style={[s.pillText, active && { color }]}>
                {val === 'all' ? 'All Statuses' : (cfg?.label ?? val)}
              </Text>
            </Pressable>
          );
        })}
        <View style={s.pillDivider} />
        {['all', ...PRIORITIES.map(p => p.value)].map(val => {
          const cfg = val === 'all' ? null : getPriority(val);
          const active = filterPriority === val;
          const color = cfg ? cfg.color : C.primary;
          return (
            <Pressable
              key={`pri-${val}`}
              style={[s.pill, active && { backgroundColor: color + '20', borderColor: color + '60' }]}
              onPress={() => setFilterPriority(val)}
            >
              <Text style={[s.pillText, active && { color }]}>
                {val === 'all' ? 'All Priorities' : (cfg?.label ?? val)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyCard}>
          <Ionicons name="clipboard-outline" size={32} color={C.textDim} />
          <Text style={s.emptyTitle}>
            {entries.length === 0 ? 'No coaches tracked yet' : 'No coaches match your filters'}
          </Text>
          <Text style={s.emptySub}>
            {entries.length === 0
              ? 'Add coaches you\'re targeting and track every interaction in one place.'
              : 'Try adjusting your filters.'}
          </Text>
          {entries.length === 0 && (
            <Pressable style={s.emptyBtn} onPress={() => setAddingCoach(true)}>
              <Text style={s.emptyBtnText}>Add Your First Coach</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={s.list}>
          {filtered.map(entry => {
            const statusCfg   = getStatus(entry.status);
            const priorityCfg = getPriority(entry.priority);
            const hasReplied  = !!entry.replied_at;
            const isOverdue   = entry.next_action_date && new Date(entry.next_action_date) < new Date();

            return (
              <View
                key={entry.id}
                style={[s.entryCard, hasReplied && { backgroundColor: 'rgba(113,255,126,0.04)' }]}
              >
                <View style={[s.statusBar, { backgroundColor: statusCfg.color }]} />

                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <View style={s.entryNameRow}>
                    <Text style={s.entryName}>{entry.coach?.name ?? '—'}</Text>
                    {hasReplied && (
                      <View style={s.repliedBadge}>
                        <Text style={s.repliedBadgeText}>✓ Replied</Text>
                      </View>
                    )}
                  </View>

                  <Text style={s.entrySchool}>
                    {entry.coach?.programs?.name ?? '—'}
                    {entry.coach?.programs?.division ? ` · ${entry.coach.programs.division}` : ''}
                  </Text>

                  {!!entry.emailCount && entry.emailCount > 0 && (
                    <Text style={s.emailCount}>{entry.emailCount} email{entry.emailCount !== 1 ? 's' : ''} sent</Text>
                  )}

                  <View style={s.metaRow}>
                    <View style={[s.statusBadge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[s.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                    <Text style={[s.priorityText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
                  </View>

                  {entry.next_action && (
                    <Text style={[s.nextAction, isOverdue && { color: '#e63535' }]} numberOfLines={1}>
                      {isOverdue ? '⚑ ' : ''}{entry.next_action}
                    </Text>
                  )}
                </View>

                <View style={s.entryActions}>
                  {entry.coach?.email && (
                    <Pressable
                      style={s.actionBtn}
                      onPress={() => router.push('/(tabs)/outreach' as any)}
                    >
                      <Ionicons name="mail-outline" size={14} color={C.textMuted} />
                    </Pressable>
                  )}
                  <Pressable style={s.actionBtn} onPress={() => setEditEntry(entry)}>
                    <Ionicons name="create-outline" size={14} color={C.textMuted} />
                  </Pressable>
                  <Pressable style={s.actionBtn} onPress={() => handleRemove(entry.id)}>
                    <Ionicons name="trash-outline" size={14} color={C.error} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {editEntry && (
        <EditModal entry={editEntry} onSave={handleSave} onClose={() => setEditEntry(null)} />
      )}
      {addingCoach && (
        <AddCoachModal
          athleteId={athlete?.id ?? ''}
          existing={existingCoachIds}
          onAdd={handleAddCoach}
          onClose={() => setAddingCoach(false)}
        />
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createEmStyles(C: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 22, paddingBottom: 40, maxHeight: '88%' },
    handle: { width: 36, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 18 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    sheetTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    sheetSub: { fontSize: 12, color: C.textDim, marginTop: 3 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: C.textMuted, letterSpacing: 0.3, marginBottom: 8, marginTop: 16 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, borderColor: C.border },
    chipText: { fontSize: 11, fontWeight: '700', color: C.textDim },
    priorityRow: { flexDirection: 'row', gap: 8 },
    priorityBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    priorityText: { fontSize: 13, fontWeight: '700' },
    repliedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt, marginTop: 16 },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
    repliedText: { fontSize: 13, fontWeight: '600' },
    input: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 13, color: C.text },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 100, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '600', color: C.textMuted },
    saveBtn: { flex: 2, paddingVertical: 12, borderRadius: 100, backgroundColor: C.primary, alignItems: 'center' },
    saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}

function createAcStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
    name: { fontSize: 13, fontWeight: '600', color: C.text },
    sub: { fontSize: 11, color: C.textDim, marginTop: 2 },
    addText: { fontSize: 13, fontWeight: '700', color: C.primary },
    empty: { fontSize: 12, color: C.textDim, textAlign: 'center', paddingVertical: 20 },
  });
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 48, paddingHorizontal: 20, gap: 16 },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: C.textMuted, marginTop: 3, lineHeight: 18 },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 100, flexShrink: 0, marginTop: 4 },
    addBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: { width: '47.5%', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
    statLabel: { fontSize: 11, fontWeight: '500', color: C.textDim, letterSpacing: 0.2 },

    filterRow: { flexDirection: 'row', gap: 8 },
    searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
    searchInput: { flex: 1, fontSize: 13, color: C.text },
    filterPills: { gap: 8, paddingBottom: 2 },
    pill: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
    pillText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
    pillDivider: { width: 1, backgroundColor: C.border, marginHorizontal: 2 },

    emptyCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 32, alignItems: 'center', gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text, textAlign: 'center' },
    emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
    emptyBtn: { backgroundColor: C.primary + '20', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 10, marginTop: 4, borderWidth: 1, borderColor: C.primary + '40' },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

    list: { gap: 8 },
    entryCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden' },
    statusBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: -4 },
    entryNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
    entryName: { fontSize: 14, fontWeight: '700', color: C.text },
    repliedBadge: { backgroundColor: 'rgba(113,255,126,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    repliedBadgeText: { fontSize: 10, fontWeight: '700', color: '#71ff7e' },
    entrySchool: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    emailCount: { fontSize: 10, color: C.primary, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
    statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
    priorityText: { fontSize: 12, fontWeight: '700' },
    nextAction: { fontSize: 11, color: C.textDim, marginTop: 5 },
    entryActions: { gap: 6, alignItems: 'center', paddingTop: 2 },
    actionBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  });
}
