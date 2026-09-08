import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';

interface RecruitAthlete {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
  position: string | null;
  graduation_year: number | string | null;
  height: string | null;
  weight: string | number | null;
  state: string | null;
  city: string | null;
  high_school: string | null;
  v1_score: number | null;
  phone: string | null;
  bio: string | null;
  hudl_link: string | null;
  gpa: string | number | null;
  sat_score: number | null;
  act_score: number | null;
}

interface ScoreBreakdown {
  physical?: number;
  production?: number;
  intangibles?: number;
  academic?: number;
}

interface ProspectNote {
  id: string;
  content: string;
  created_at: string;
}

const SCORE_CATEGORIES: { key: keyof ScoreBreakdown; label: string; color: string }[] = [
  { key: 'physical', label: 'Physical', color: '#ff6b35' },
  { key: 'production', label: 'Production', color: '#f7931e' },
  { key: 'intangibles', label: 'Intangibles', color: '#a78bfa' },
  { key: 'academic', label: 'Academic', color: '#3b82f6' },
];

export default function RecruitDetailScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { coach, loading: coachLoading } = useCoachData();

  const [loading, setLoading] = useState(true);
  const [athlete, setAthlete] = useState<RecruitAthlete | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<ProspectNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (coachLoading || !coach?.id || !id) return;

    async function load() {
      setLoading(true);
      try {
        const coachId = coach!.id;
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('id, full_name, profile_photo_url, position, graduation_year, height, weight, state, city, high_school, v1_score, phone, bio, hudl_link, gpa, sat_score, act_score')
          .eq('id', id as string)
          .single();

        if (!athleteData) { router.back(); return; }
        setAthlete(athleteData);

        const { data: assessment } = await supabase
          .from('assessments')
          .select('score_breakdown')
          .eq('athlete_id', id as string)
          .not('v1_score', 'is', null)
          .order('completed_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (assessment?.score_breakdown) {
          setScoreBreakdown(assessment.score_breakdown as ScoreBreakdown);
        } else if (athleteData.v1_score) {
          const score = athleteData.v1_score;
          setScoreBreakdown({
            physical: Math.round(score * 0.25),
            production: Math.round(score * 0.45),
            intangibles: Math.round(score * 0.15),
            academic: Math.round(score * 0.15),
          });
        }

        const { data: savedData } = await supabase
          .from('coach_saved_prospects')
          .select('id')
          .eq('coach_id', coachId)
          .eq('athlete_id', id as string)
          .maybeSingle();

        if (savedData) {
          setIsSaved(true);
          setSavedId(savedData.id);
        } else {
          setIsSaved(false);
          setSavedId(null);
        }

        const { data: notesData } = await supabase
          .from('coach_prospect_notes')
          .select('id, content, created_at')
          .eq('coach_id', coachId)
          .eq('athlete_id', id as string)
          .order('created_at', { ascending: false });

        setNotes((notesData as ProspectNote[]) ?? []);
      } catch (e) {
        console.error('Recruit detail load error:', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [coachLoading, coach?.id, id]);

  const toggleSave = async () => {
    if (!coach?.id || !athlete) return;
    if (isSaved && savedId) {
      await supabase.from('coach_saved_prospects').delete().eq('id', savedId);
      setIsSaved(false);
      setSavedId(null);
    } else {
      const { data } = await supabase
        .from('coach_saved_prospects')
        .insert({ coach_id: coach.id, athlete_id: athlete.id })
        .select()
        .single();
      if (data) {
        setIsSaved(true);
        setSavedId(data.id);
      }
    }
  };

  const startConversation = async () => {
    if (!coach?.id || !athlete) return;
    const { data: existing } = await supabase
      .from('coach_athlete_conversations')
      .select('id')
      .eq('coach_id', coach.id)
      .eq('athlete_id', athlete.id)
      .single();

    if (existing) {
      router.push(`/(coach)/messages/${existing.id}` as any);
      return;
    }

    const { data: created } = await supabase
      .from('coach_athlete_conversations')
      .insert({ coach_id: coach.id, athlete_id: athlete.id })
      .select()
      .single();

    if (created) router.push(`/(coach)/messages/${created.id}` as any);
  };

  const saveNote = async () => {
    if (!coach?.id || !athlete || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const { data } = await supabase
        .from('coach_prospect_notes')
        .insert({ coach_id: coach.id, athlete_id: athlete.id, content: newNote.trim() })
        .select()
        .single();

      if (data) {
        setNotes(n => [data as ProspectNote, ...n]);
        setNewNote('');
      }
    } catch (e) {
      console.error('Save note error:', e);
    } finally {
      setSavingNote(false);
    }
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!athlete) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Pressable style={s.backLink} onPress={() => router.push('/(coach)/recruiting' as any)}>
        <Ionicons name="arrow-back" size={14} color="#fff" />
        <Text style={s.backLinkText}>Back to Recruiting</Text>
      </Pressable>

      <View style={s.actionsRow}>
        <Pressable style={s.actionBtn} onPress={startConversation}>
          <Ionicons name="chatbubble-outline" size={16} color={C.text} />
          <Text style={s.actionBtnText}>Message</Text>
        </Pressable>
        <Pressable style={[s.actionBtn, isSaved && s.actionBtnActive]} onPress={toggleSave}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={isSaved ? '#fff' : C.text} />
          <Text style={[s.actionBtnText, isSaved && s.actionBtnTextActive]}>{isSaved ? 'Saved' : 'Save'}</Text>
        </Pressable>
      </View>

      <View style={s.header}>
        <Avatar uri={athlete.profile_photo_url} name={athlete.full_name} size={88} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name}>{athlete.full_name ?? 'Unknown'}</Text>
          <Text style={s.position}>{athlete.position ?? '—'}</Text>
        </View>
      </View>

      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>HEIGHT</Text>
          <Text style={s.statValue}>{athlete.height ?? '—'}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>WEIGHT</Text>
          <Text style={s.statValue}>{athlete.weight ? `${athlete.weight} lbs` : '—'}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>GRAD</Text>
          <Text style={s.statValue}>{athlete.graduation_year ?? '—'}</Text>
        </View>
      </View>

      {athlete.v1_score != null && (
        <Card style={s.scoreCard}>
          <Text style={s.sectionLabel}>V1 SCORE</Text>
          <Text style={s.scoreValue}>{athlete.v1_score}</Text>
          {scoreBreakdown && (
            <View style={{ gap: 10, marginTop: 12 }}>
              {SCORE_CATEGORIES.map(cat => {
                const value = scoreBreakdown[cat.key] ?? 0;
                const pct = Math.min(100, (value / (athlete.v1_score || 100)) * 100);
                return (
                  <View key={cat.key}>
                    <View style={s.breakdownRow}>
                      <Text style={s.breakdownLabel}>{cat.label}</Text>
                      <Text style={s.breakdownValue}>{value}</Text>
                    </View>
                    <View style={s.breakdownTrack}>
                      <View style={[s.breakdownFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}

      <Card>
        <Text style={s.sectionTitle}>Personal Info</Text>
        {athlete.high_school && <InfoRow C={C} label="High School" value={athlete.high_school} />}
        {athlete.city && <InfoRow C={C} label="Location" value={`${athlete.city}, ${athlete.state ?? ''}`} />}
        {athlete.phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${athlete.phone}`)}>
            <InfoRow C={C} label="Phone" value={athlete.phone} valueStyle={s.linkText} />
          </Pressable>
        )}
        {!athlete.high_school && !athlete.city && !athlete.phone && <Text style={s.emptyText}>No details on file.</Text>}
      </Card>

      <Card>
        <Text style={s.sectionTitle}>Academics</Text>
        {athlete.gpa && <InfoRow C={C} label="GPA" value={String(athlete.gpa)} />}
        {athlete.sat_score && <InfoRow C={C} label="SAT" value={String(athlete.sat_score)} />}
        {athlete.act_score && <InfoRow C={C} label="ACT" value={String(athlete.act_score)} />}
        {!athlete.gpa && !athlete.sat_score && !athlete.act_score && <Text style={s.emptyText}>No academic info on file.</Text>}
      </Card>

      {athlete.bio && (
        <Card>
          <Text style={s.sectionTitle}>About</Text>
          <Text style={s.bioText}>{athlete.bio}</Text>
        </Card>
      )}

      {athlete.hudl_link && (
        <Pressable style={s.filmCard} onPress={() => Linking.openURL(athlete.hudl_link!)}>
          <View>
            <Text style={s.filmTitle}>Film (Hudl)</Text>
            <Text style={s.filmSub}>Watch game film →</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
      )}

      <Card>
        <Text style={s.sectionTitle}>Notes</Text>
        <TextInput
          style={s.noteInput}
          placeholder="Add a personal note about this prospect..."
          placeholderTextColor={C.textDim}
          value={newNote}
          onChangeText={setNewNote}
          multiline
        />
        <Pressable
          style={[s.noteSaveBtn, (!newNote.trim() || savingNote) && { opacity: 0.5 }]}
          onPress={saveNote}
          disabled={!newNote.trim() || savingNote}
        >
          <Text style={s.noteSaveBtnText}>{savingNote ? 'Saving...' : 'Save Note'}</Text>
        </Pressable>

        {notes.length > 0 ? (
          <View style={{ gap: 10, marginTop: 16 }}>
            {notes.map(note => (
              <View key={note.id} style={s.noteRow}>
                <Text style={s.noteContent}>{note.content}</Text>
                <Text style={s.noteDate}>
                  {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[s.emptyText, { textAlign: 'center', marginTop: 12 }]}>No notes yet. Add one to track your thoughts on this prospect.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

function InfoRow({ C, label, value, valueStyle }: { C: ThemeColors; label: string; value: string; valueStyle?: object }) {
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, gap: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -4 },
    backLinkText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: '#fff' },

    actionsRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border },
    actionBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    actionBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    actionBtnTextActive: { color: '#fff' },

    header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    name: { fontFamily: FontFamily.headline, fontSize: 22, color: C.text },
    position: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.primary, marginTop: 2 },

    statsRow: { flexDirection: 'row', gap: 10 },
    statBox: { flex: 1, backgroundColor: C.surface, borderRadius: 10, padding: 12, alignItems: 'center' },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5, marginBottom: 4 },
    statValue: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    scoreCard: {},
    sectionLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, letterSpacing: 1, marginBottom: 8 },
    scoreValue: { fontFamily: FontFamily.headline, fontSize: 44, color: C.primary },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    breakdownLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
    breakdownValue: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    breakdownTrack: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
    breakdownFill: { height: '100%', borderRadius: 3 },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 14 },
    infoRow: { marginBottom: 14 },
    infoLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5, marginBottom: 4 },
    infoValue: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },
    linkText: { color: '#fff' },
    emptyText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    bioText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 20 },

    filmCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary, borderRadius: 12, padding: 18 },
    filmTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, color: '#fff', marginBottom: 2 },
    filmSub: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.8)' },

    noteInput: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, minHeight: 90, textAlignVertical: 'top', color: C.text, backgroundColor: C.surfaceAlt, fontFamily: FontFamily.body, fontSize: 13, marginBottom: 10 },
    noteSaveBtn: { backgroundColor: C.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    noteSaveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    noteRow: { backgroundColor: C.surfaceAlt, borderRadius: 8, padding: 12 },
    noteContent: { fontFamily: FontFamily.body, fontSize: 13, color: C.text, lineHeight: 19, marginBottom: 6 },
    noteDate: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim },
  });
}
