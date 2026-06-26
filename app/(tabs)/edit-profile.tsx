import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAthleteData } from '../../hooks/useAthleteData';
import { supabase } from '../../lib/supabase';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

// ─── Field definitions ────────────────────────────────────────────────────────

type Row = {
  label: string;
  key: string;
  multi?: boolean;
  placeholder?: string;
  hint?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'email-address' | 'url';
};

type Section = {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  rows: Row[];
};

const SECTIONS: Section[] = [
  {
    title: 'Personal',
    icon: 'person',
    rows: [
      { label: 'Full Name',           key: 'full_name' },
      { label: 'Phone',               key: 'phone',              keyboardType: 'phone-pad' },
      { label: 'Recruitment Status',  key: 'recruitment_status', placeholder: 'e.g. Uncommitted, Committed, Signed' },
      { label: 'Bio',                 key: 'bio',                multi: true,
        placeholder: "QB | Class of 2026 | Lincoln HS | Dallas, TX\n6'2\" / 205 lbs | 3.8 GPA\nUncommitted | Earning my opportunity",
        hint: 'Keep it short and keyword-rich — works for Twitter/X and Instagram too.' },
    ],
  },
  {
    title: 'Athletic',
    icon: 'football',
    rows: [
      { label: 'Position',        key: 'position' },
      { label: "Height (e.g. 6'2\")", key: 'height' },
      { label: 'Weight (lbs)',    key: 'weight',       keyboardType: 'numeric' },
      { label: '40-Yard (sec)',   key: 'forty_yard',   keyboardType: 'decimal-pad' },
      { label: 'Vertical (in)',   key: 'vertical_jump',keyboardType: 'decimal-pad' },
      { label: 'Pro Shuttle (sec)',key: 'pro_shuttle', keyboardType: 'decimal-pad' },
      { label: '3-Cone (sec)',    key: 'three_cone',   keyboardType: 'decimal-pad' },
      { label: 'Broad Jump (in)', key: 'broad_jump',   keyboardType: 'numeric' },
      { label: 'Bench Press (lbs)',key: 'bench_press', keyboardType: 'numeric' },
      { label: 'Squat (lbs)',     key: 'squat',        keyboardType: 'numeric' },
      { label: 'Power Clean (lbs)',key: 'power_clean', keyboardType: 'numeric' },
      { label: 'Deadlift (lbs)', key: 'deadlift',      keyboardType: 'numeric' },
    ],
  },
  {
    title: 'Academic',
    icon: 'school',
    rows: [
      { label: 'GPA',             key: 'gpa',             keyboardType: 'decimal-pad' },
      { label: 'SAT Score',       key: 'sat_score',       keyboardType: 'numeric' },
      { label: 'ACT Score',       key: 'act_score',       keyboardType: 'numeric' },
      { label: 'Grad Year',       key: 'graduation_year', keyboardType: 'numeric' },
      { label: 'High School',     key: 'high_school' },
      { label: 'NCAA ID',         key: 'ncaa_id',         hint: 'Register at eligibilitycenter.org' },
    ],
  },
  {
    title: 'Location',
    icon: 'location',
    rows: [
      { label: 'City',  key: 'city' },
      { label: 'State', key: 'state', placeholder: 'e.g. TX' },
    ],
  },
  {
    title: 'Coaching Staff',
    icon: 'people',
    rows: [
      { label: 'Head Coach Name',        key: 'head_coach_name' },
      { label: 'Head Coach Phone',       key: 'head_coach_phone',  keyboardType: 'phone-pad' },
      { label: 'Head Coach Email',       key: 'head_coach_email',  keyboardType: 'email-address' },
      { label: 'Positional Coach Name',  key: 'positional_coach_name' },
      { label: 'Positional Coach Phone', key: 'positional_coach_phone', keyboardType: 'phone-pad' },
      { label: 'Positional Coach Email', key: 'positional_coach_email', keyboardType: 'email-address' },
    ],
  },
  {
    title: 'Guardian',
    icon: 'shield',
    rows: [
      { label: 'Guardian Name',         key: 'guardian_name' },
      { label: 'Relationship',          key: 'guardian_relationship', placeholder: 'e.g. Parent, Grandparent' },
      { label: 'Guardian Phone',        key: 'guardian_phone', keyboardType: 'phone-pad' },
      { label: 'Guardian Email',        key: 'guardian_email', keyboardType: 'email-address' },
    ],
  },
  {
    title: 'Film & Social',
    icon: 'play-circle',
    rows: [
      { label: 'Hudl Video URL',    key: 'hudl_video_link',   keyboardType: 'url' },
      { label: 'YouTube URL',       key: 'youtube_link',      keyboardType: 'url' },
      { label: 'Twitter Handle',    key: 'twitter_handle',    placeholder: '@handle' },
      { label: 'Instagram Handle',  key: 'instagram_handle',  placeholder: '@handle' },
    ],
  },
];

// All editable keys as a flat type
type Fields = {
  full_name: string; phone: string; recruitment_status: string; bio: string;
  position: string; height: string; weight: string;
  forty_yard: string; vertical_jump: string; pro_shuttle: string;
  three_cone: string; broad_jump: string; bench_press: string;
  squat: string; power_clean: string; deadlift: string;
  gpa: string; sat_score: string; act_score: string;
  graduation_year: string; high_school: string; ncaa_id: string;
  city: string; state: string;
  head_coach_name: string; head_coach_phone: string; head_coach_email: string;
  positional_coach_name: string; positional_coach_phone: string; positional_coach_email: string;
  guardian_name: string; guardian_relationship: string;
  guardian_phone: string; guardian_email: string;
  hudl_video_link: string; youtube_link: string;
  twitter_handle: string; instagram_handle: string;
};

const EMPTY: Fields = {
  full_name: '', phone: '', recruitment_status: '', bio: '',
  position: '', height: '', weight: '',
  forty_yard: '', vertical_jump: '', pro_shuttle: '',
  three_cone: '', broad_jump: '', bench_press: '',
  squat: '', power_clean: '', deadlift: '',
  gpa: '', sat_score: '', act_score: '',
  graduation_year: '', high_school: '', ncaa_id: '',
  city: '', state: '',
  head_coach_name: '', head_coach_phone: '', head_coach_email: '',
  positional_coach_name: '', positional_coach_phone: '', positional_coach_email: '',
  guardian_name: '', guardian_relationship: '',
  guardian_phone: '', guardian_email: '',
  hudl_video_link: '', youtube_link: '',
  twitter_handle: '', instagram_handle: '',
};

// Columns that map 1-to-1 to athlete table columns
const DIRECT_COLS = new Set([
  'full_name', 'phone', 'recruitment_status', 'bio',
  'position', 'height', 'weight',
  'forty_yard', 'vertical_jump', 'pro_shuttle',
  'three_cone', 'broad_jump', 'bench_press',
  'squat', 'power_clean', 'deadlift',
  'gpa', 'sat_score', 'act_score',
  'graduation_year', 'high_school', 'ncaa_id',
  'city', 'state',
  'guardian_name', 'guardian_relationship', 'guardian_phone', 'guardian_email',
  'hudl_video_link', 'youtube_link', 'twitter_handle', 'instagram_handle',
]);

// Keys that live inside coach_info JSONB
const COACH_INFO_KEYS: (keyof Fields)[] = [
  'head_coach_name', 'head_coach_phone', 'head_coach_email',
  'positional_coach_name', 'positional_coach_phone', 'positional_coach_email',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const { athlete, refresh } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const profileSlug = (athlete as any)?.profile_slug ?? null;

  useEffect(() => {
    if (!athlete) return;
    const a = athlete as any;
    const ci = (typeof a.coach_info === 'object' && a.coach_info) ? a.coach_info : {};
    setFields({
      full_name:              a.full_name              ?? '',
      phone:                  a.phone                  ?? '',
      recruitment_status:     a.recruitment_status     ?? '',
      bio:                    a.bio                    ?? '',
      position:               a.position               ?? '',
      height:                 a.height                 ?? '',
      weight:                 a.weight != null          ? String(a.weight) : '',
      forty_yard:             a.forty_yard != null      ? String(a.forty_yard) : '',
      vertical_jump:          a.vertical_jump != null   ? String(a.vertical_jump) : '',
      pro_shuttle:            a.pro_shuttle != null     ? String(a.pro_shuttle) : '',
      three_cone:             a.three_cone != null      ? String(a.three_cone) : '',
      broad_jump:             a.broad_jump != null      ? String(a.broad_jump) : '',
      bench_press:            a.bench_press != null     ? String(a.bench_press) : '',
      squat:                  a.squat != null           ? String(a.squat) : '',
      power_clean:            a.power_clean != null     ? String(a.power_clean) : '',
      deadlift:               a.deadlift != null        ? String(a.deadlift) : '',
      gpa:                    a.gpa != null             ? String(a.gpa) : '',
      sat_score:              a.sat_score != null       ? String(a.sat_score) : '',
      act_score:              a.act_score != null       ? String(a.act_score) : '',
      graduation_year:        a.graduation_year != null ? String(a.graduation_year) : '',
      high_school:            a.high_school            ?? '',
      ncaa_id:                a.ncaa_id                ?? '',
      city:                   a.city                   ?? '',
      state:                  a.state                  ?? '',
      head_coach_name:        ci.head_coach_name        ?? '',
      head_coach_phone:       ci.head_coach_phone       ?? '',
      head_coach_email:       ci.head_coach_email       ?? '',
      positional_coach_name:  ci.positional_coach_name  ?? '',
      positional_coach_phone: ci.positional_coach_phone ?? '',
      positional_coach_email: ci.positional_coach_email ?? '',
      guardian_name:          a.guardian_name          ?? '',
      guardian_relationship:  a.guardian_relationship  ?? '',
      guardian_phone:         a.guardian_phone         ?? '',
      guardian_email:         a.guardian_email         ?? '',
      hudl_video_link:        a.hudl_video_link        ?? '',
      youtube_link:           a.youtube_link           ?? '',
      twitter_handle:         a.twitter_handle         ?? '',
      instagram_handle:       a.instagram_handle       ?? '',
    });
    setIsPublic(a.is_profile_public ?? true);
    setLoading(false);
  }, [athlete]);

  const set = (k: keyof Fields) => (v: string) => setFields(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!athlete?.id) return;
    setSaving(true);

    // Build direct-column updates
    const updates: Record<string, string | number | boolean | null | object> = {};
    (Object.keys(fields) as (keyof Fields)[]).forEach(k => {
      if (DIRECT_COLS.has(k)) {
        updates[k] = fields[k] || null;
      }
    });
    updates.is_profile_public = isPublic;

    // Pack coach_info JSONB
    const coachInfo: Record<string, string | null> = {};
    COACH_INFO_KEYS.forEach(k => { coachInfo[k] = fields[k] || null; });
    updates.coach_info = coachInfo;

    const { error } = await supabase.from('athletes').update(updates).eq('id', athlete.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await refresh();
    router.back();
  };

  const buildStarterBio = () => {
    const pos = fields.position || '[Position]';
    const yr  = fields.graduation_year ? `Class of ${fields.graduation_year}` : '[Class Year]';
    const sch = fields.high_school || '[High School]';
    const loc = fields.city && fields.state
      ? `${fields.city}, ${fields.state}`
      : fields.city || fields.state || '[City, State]';
    const ht  = fields.height || '[Height]';
    const wt  = fields.weight ? `${fields.weight} lbs` : '[Weight] lbs';
    const gpa = fields.gpa ? `${fields.gpa} GPA` : '[GPA] GPA';
    set('bio')(`${pos} | ${yr} | ${sch} | ${loc}\n${ht} / ${wt} | ${gpa}\nUncommitted | Earning my opportunity every day`);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.eyebrow}>ATHLETE PROFILE</Text>
          <Text style={s.headerTitle}>Edit Profile</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Gradient accent bar ── */}
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentBar} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Link ── */}
        {profileSlug ? (
          <View style={s.sectionWrap}>
            <View style={s.sectionHeader}>
              <Ionicons name="link" size={14} color="#fff" />
              <Text style={s.sectionTitle}>PUBLIC PROFILE</Text>
            </View>
            <View style={[s.card, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }]}>
              <Text style={{ flex: 1, fontSize: 13, color: C.textMuted }} numberOfLines={1}>
                v1portal.com/athlete/{profileSlug}
              </Text>
              <Pressable
                onPress={() => {
                  Clipboard.setString(`https://v1portal.com/athlete/${profileSlug}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: C.primary }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{copied ? 'Copied!' : 'Copy Link'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {SECTIONS.map(section => (
          <View key={section.title} style={s.sectionWrap}>
            <View style={s.sectionHeader}>
              <Ionicons name={section.icon} size={14} color="#fff" />
              <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
            </View>

            <View style={s.card}>
              {section.rows.map((row, idx) => {
                const isBio = row.key === 'bio';
                return (
                  <View key={row.key} style={[s.fieldRow, idx > 0 && s.fieldRowBorder]}>
                    <View style={s.fieldLabelRow}>
                      <Text style={s.label}>{row.label}</Text>
                      {isBio && (
                        <Pressable onPress={buildStarterBio} style={s.starterBioBtn}>
                          <Text style={s.starterBioBtnText}>✦ Starter Bio</Text>
                        </Pressable>
                      )}
                    </View>
                    <TextInput
                      style={[s.input, isBio && s.inputMulti]}
                      value={fields[row.key as keyof Fields]}
                      onChangeText={set(row.key as keyof Fields)}
                      placeholder={row.placeholder ?? row.label}
                      placeholderTextColor={C.textDim}
                      multiline={isBio}
                      textAlignVertical={isBio ? 'top' : 'auto'}
                      keyboardType={row.keyboardType ?? 'default'}
                      autoCapitalize={row.keyboardType === 'email-address' || row.keyboardType === 'url' ? 'none' : 'sentences'}
                    />
                    {row.hint && (
                      <Text style={s.hint}>{row.hint}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Public Profile Toggle ── */}
        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 }}>Public Profile</Text>
            <Text style={{ fontSize: 11, color: C.textDim }}>Allow coaches to view your profile</Text>
          </View>
          <Pressable
            onPress={() => setIsPublic(v => !v)}
            style={{
              width: 44, height: 24, borderRadius: 100,
              backgroundColor: isPublic ? C.primary : C.surface,
              borderWidth: 1, borderColor: isPublic ? C.primary : C.border,
              justifyContent: 'center', position: 'relative',
            }}
          >
            <View style={{
              position: 'absolute',
              top: 2,
              left: isPublic ? 22 : 2,
              width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
            }} />
          </Pressable>
        </View>

        {/* ── Save CTA ── */}
        <Pressable onPress={handleSave} disabled={saving} style={s.saveBtnWrap}>
          <LinearGradient
            colors={['#ff0000', '#aa00ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
          >
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    },
    backBtn: {
      width: 36, height: 36, backgroundColor: C.surface,
      borderRadius: 100, alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { alignItems: 'center' },
    eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: C.primary, marginBottom: 2 },
    headerTitle: { fontSize: 17, fontWeight: '800', color: C.text },

    accentBar: { height: 3, marginHorizontal: 20, borderRadius: 100, marginBottom: 20 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

    sectionWrap: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.0, color: C.textMuted },

    card: { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden' },
    fieldRow: { paddingHorizontal: 16, paddingVertical: 12 },
    fieldRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    fieldLabelRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 6,
    },
    label: { fontSize: 12, fontWeight: '500', color: C.textMuted },

    input: { fontSize: 15, color: C.text, paddingVertical: 0 },
    inputMulti: { height: 80, textAlignVertical: 'top' },

    hint: { fontSize: 11, color: C.textDim, marginTop: 5, lineHeight: 16 },

    starterBioBtn: {
      backgroundColor: `${C.primary}22`, borderRadius: 100,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    starterBioBtnText: { fontSize: 11, fontWeight: '700', color: C.primary },

    saveBtnWrap: { marginTop: 8 },
    saveBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 0.3 },
  });
}
