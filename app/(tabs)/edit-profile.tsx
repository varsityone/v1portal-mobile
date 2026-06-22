import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useAthleteData } from '../../hooks/useAthleteData';
import { supabase } from '../../lib/supabase';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

const SECTIONS = [
  { title: 'Personal', rows: [
    { label: 'Full Name',  key: 'full_name'       as const },
    { label: 'Bio',        key: 'bio'             as const, multi: true },
  ]},
  { title: 'Athletic', rows: [
    { label: 'Position',        key: 'position'      as const },
    { label: "Height (e.g. 6'1\")", key: 'height'   as const },
    { label: 'Weight (lbs)',    key: 'weight'        as const },
    { label: '40-Yard (s)',     key: 'forty_yard'    as const },
    { label: 'Vertical (in)',   key: 'vertical_jump' as const },
  ]},
  { title: 'Academic', rows: [
    { label: 'GPA',         key: 'gpa'              as const },
    { label: 'Grad Year',   key: 'graduation_year'  as const },
    { label: 'High School', key: 'high_school'      as const },
  ]},
  { title: 'Location', rows: [
    { label: 'City',  key: 'city'  as const },
    { label: 'State', key: 'state' as const },
  ]},
  { title: 'Film & Social', rows: [
    { label: 'Hudl Video URL',    key: 'hudl_video_link'   as const },
    { label: 'YouTube URL',       key: 'youtube_link'      as const },
    { label: 'Twitter Handle',    key: 'twitter_handle'    as const },
    { label: 'Instagram Handle',  key: 'instagram_handle'  as const },
  ]},
];

type Fields = {
  full_name: string; bio: string; position: string; height: string;
  weight: string; forty_yard: string; vertical_jump: string; gpa: string;
  graduation_year: string; high_school: string; city: string; state: string;
  hudl_video_link: string; youtube_link: string; twitter_handle: string;
  instagram_handle: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { athlete, refresh } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [fields, setFields] = useState<Fields>({
    full_name: '', bio: '', position: '', height: '', weight: '',
    forty_yard: '', vertical_jump: '', gpa: '', graduation_year: '',
    high_school: '', city: '', state: '', hudl_video_link: '',
    youtube_link: '', twitter_handle: '', instagram_handle: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athlete) {
      setFields({
        full_name:        athlete.full_name        ?? '',
        bio:              athlete.bio              ?? '',
        position:         athlete.position         ?? '',
        height:           athlete.height           ?? '',
        weight:           athlete.weight           ?? '',
        forty_yard:       (athlete as any).forty_yard      ?? '',
        vertical_jump:    (athlete as any).vertical_jump   ?? '',
        gpa:              athlete.gpa              ?? '',
        graduation_year:  athlete.graduation_year  ?? '',
        high_school:      athlete.high_school      ?? '',
        city:             athlete.city             ?? '',
        state:            (athlete as any).state   ?? '',
        hudl_video_link:  (athlete as any).hudl_video_link ?? '',
        youtube_link:     (athlete as any).youtube_link    ?? '',
        twitter_handle:   (athlete as any).twitter_handle  ?? '',
        instagram_handle: (athlete as any).instagram_handle ?? '',
      });
      setLoading(false);
    }
  }, [athlete]);

  const set = (k: keyof Fields) => (v: string) => setFields(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!athlete?.id) return;
    setSaving(true);
    const updates: Record<string, string | null> = {};
    (Object.keys(fields) as (keyof Fields)[]).forEach(k => {
      updates[k] = fields[k] || null;
    });
    const { error } = await supabase.from('athletes').update(updates).eq('id', athlete.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await refresh();
    router.back();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Nav bar */}
      <View style={s.nav}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={s.cancel}>Cancel</Text>
        </Pressable>
        <Text style={s.navTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
          <Text style={[s.save, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map(section => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            {section.rows.map(row => (
              <View key={row.key} style={s.fieldWrap}>
                {row.key === 'bio' ? (
                  <>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={s.label}>{row.label}</Text>
                      <Pressable
                        onPress={() => {
                          const pos = fields.position || '[Position]';
                          const yr = fields.graduation_year ? `Class of ${fields.graduation_year}` : '[Class Year]';
                          const school = fields.high_school || '[High School]';
                          const loc = fields.city && fields.state
                            ? `${fields.city}, ${fields.state}`
                            : fields.city || fields.state || '[City, State]';
                          const ht = fields.height || '[Height]';
                          const wt = fields.weight ? `${fields.weight} lbs` : '[Weight] lbs';
                          const gpa = fields.gpa ? `${fields.gpa} GPA` : '[GPA] GPA';
                          set('bio')(`${pos} | ${yr} | ${school} | ${loc}\n${ht} / ${wt} | ${gpa}\nUncommitted | Earning my opportunity every day`);
                        }}
                        style={s.starterBioBtn}
                      >
                        <Text style={s.starterBioBtnText}>✦ Starter Bio</Text>
                      </Pressable>
                    </View>
                    <TextInput
                      style={[s.input, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                      value={fields.bio}
                      onChangeText={set('bio')}
                      placeholder={"QB | Class of 2026 | Lincoln HS | Dallas, TX\n6'2\" / 205 lbs | 3.8 GPA\nUncommitted | Earning my opportunity"}
                      placeholderTextColor={C.textDim}
                      multiline
                    />
                    <Text style={s.bioHint}>
                      Keep it short and keyword-rich — works for Twitter/X and Instagram too.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={s.label}>{row.label}</Text>
                    <TextInput
                      style={[s.input, (row as any).multi && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
                      value={fields[row.key]}
                      onChangeText={set(row.key)}
                      placeholder={row.label}
                      placeholderTextColor={C.textDim}
                      multiline={!!(row as any).multi}
                    />
                  </>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    nav: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: C.border,
    },
    navTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    cancel: { fontSize: 15, color: C.textMuted },
    save: { fontSize: 15, fontWeight: '700', color: C.primary },
    scroll: { flex: 1, paddingHorizontal: 20 },
    section: { marginTop: 28 },
    sectionTitle: {
      fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
      textTransform: 'uppercase', color: C.textDim, marginBottom: 10,
    },
    fieldWrap: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '500', color: C.textMuted, marginBottom: 6 },
    input: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
      fontSize: 14, color: C.text,
    },
    starterBioBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: `${C.primary}18`, borderRadius: 100,
      paddingHorizontal: 10, paddingVertical: 4,
    },
    starterBioBtnText: { fontSize: 11, fontWeight: '700', color: C.primary },
    bioHint: { fontSize: 11, color: C.textDim, marginTop: 5, lineHeight: 16 },
  });
}
