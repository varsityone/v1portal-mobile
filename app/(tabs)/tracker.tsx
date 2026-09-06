import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAthleteData } from '../../hooks/useAthleteData';
import { supabase } from '../../lib/supabase';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

interface Milestone {
  label: string;
  completed: boolean;
  date?: string;
}

export default function TrackerScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { athlete, loading: athleteLoading } = useAthleteData();
  const [milestones, setMilestones] = useState<Milestone[]>([
    { label: 'Assessment Completed', completed: !!athlete?.assessment_completed_at },
    { label: 'Profile Created', completed: !!athlete?.full_name },
    { label: 'First Match', completed: false },
    { label: 'Coach Interest', completed: false },
  ]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadTracking = async () => {
        if (!athlete?.id) return;
        setLoading(true);
        try {
          const [matchRes, msgRes] = await Promise.all([
            supabase.from('swipes').select('id', { count: 'exact' }).eq('athlete_id', athlete.id).eq('mutual_match', true),
            supabase.from('coach_athlete_messages').select('id', { count: 'exact' }).eq('athlete_id', athlete.id),
          ]);
          setMilestones(m => [
            m[0],
            m[1],
            { ...m[2], completed: (matchRes.count ?? 0) > 0 },
            { ...m[3], completed: (msgRes.count ?? 0) > 0 },
          ]);
        } catch (e) {
          console.error('Load tracking error:', e);
        } finally {
          setLoading(false);
        }
      };
      loadTracking();
    }, [athlete?.id])
  );

  if (athleteLoading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  const completed = milestones.filter(m => m.completed).length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>RECRUITING</Text>
        <Text style={s.title}>Tracker</Text>
      </View>

      <Card>
        <Text style={s.label}>PROGRESS</Text>
        <Text style={s.value}>{completed}/{milestones.length}</Text>
        <View style={s.progressBar}>
          <View style={[s.progressFill, { width: `${(completed / milestones.length) * 100}%` }]} />
        </View>
      </Card>

      <View style={{ gap: 10, marginTop: 20 }}>
        {milestones.map((m, i) => (
          <Card key={i}>
            <View style={s.milestoneRow}>
              <View style={[s.checkBox, m.completed && s.checkBoxDone]}>
                {m.completed && <Text style={s.checkMark}>✓</Text>}
              </View>
              <Text style={[s.milestoneLabel, m.completed && s.milestoneDone]}>{m.label}</Text>
            </View>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    label: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, letterSpacing: 1, marginBottom: 8 },
    value: { fontFamily: FontFamily.headline, fontSize: 40, fontWeight: '900', color: C.text, marginBottom: 16 },
    progressBar: { height: 8, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 4 },
    milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkBox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    checkBoxDone: { backgroundColor: C.primary, borderColor: C.primary },
    checkMark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    milestoneLabel: { fontFamily: FontFamily.body, fontSize: 13, color: C.text, flex: 1 },
    milestoneDone: { color: C.textMuted },
  });
}
