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
import { FLAME_GRADIENT, PINK_RED, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

// ─── Season-stats field definitions (mirrors web's app/profile/edit/page.tsx
// position groups and stat questions 1:1, so edits here write to the exact
// same assessments.responses keys the assessment itself uses) ───────────────

const POS_QB = ['QB']; const POS_RB = ['RB']; const POS_WR = ['WR']; const POS_TE = ['TE'];
const POS_OL = ['OL']; const POS_DL = ['DL']; const POS_LB = ['LB']; const POS_DB = ['CB', 'S'];
const POS_ATH = ['ATH'];
const OFF_PASS = [...POS_QB, ...POS_ATH];
const OFF_RUSH = [...POS_QB, ...POS_RB, ...POS_ATH];
const OFF_REC = [...POS_WR, ...POS_TE, ...POS_RB, ...POS_ATH];
const DEF_TACK = [...POS_DL, ...POS_LB, ...POS_DB];
const DEF_RUSH = [...POS_DL, ...POS_LB];
const DEF_COV = [...POS_DB, ...POS_LB];

const GRADE_LABELS: Record<number, string> = { 9: 'Freshman', 10: 'Sophomore', 11: 'Junior', 12: 'Senior' };
const GRADE_OPTIONS = [
  { label: '9th (Freshman)', value: '9th (Freshman)' },
  { label: '10th (Sophomore)', value: '10th (Sophomore)' },
  { label: '11th (Junior)', value: '11th (Junior)' },
  { label: '12th (Senior)', value: '12th (Senior)' },
  { label: 'Never played varsity', value: 'Never played varsity' },
];
const VARSITY_YEARS_OPTIONS = ['0 (JV only)', '1', '2', '3', '4+'];

function parseGradeOption(opt: string): number {
  if (opt?.startsWith('12')) return 12;
  if (opt?.startsWith('11')) return 11;
  if (opt?.startsWith('10')) return 10;
  if (opt?.startsWith('9')) return 9;
  return 0;
}

function deriveGradeFromGradYear(graduationYear: number): number {
  if (!graduationYear) return 0;
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const academicYear = month >= 8 ? year : year - 1;
  return Math.min(12, Math.max(9, 13 + academicYear - graduationYear));
}

type StatField = { id: string; label: string; keyboardType: 'numeric' | 'decimal-pad'; placeholder?: string };

function getCurrentSeasonStatFields(position: string): StatField[] {
  const f: StatField[] = [{ id: 'games_played_current', label: 'Games Played', keyboardType: 'numeric', placeholder: '11' }];
  if (OFF_PASS.includes(position)) f.push(
    { id: 'passing_yards', label: 'Passing Yards', keyboardType: 'numeric', placeholder: '2500' },
    { id: 'passing_tds', label: 'Passing TDs', keyboardType: 'numeric', placeholder: '24' },
  );
  if (POS_QB.includes(position)) f.push({ id: 'completion_pct', label: 'Completion %', keyboardType: 'numeric', placeholder: '62' });
  if (OFF_PASS.includes(position)) f.push({ id: 'interceptions_thrown', label: 'Interceptions Thrown', keyboardType: 'numeric', placeholder: '6' });
  if (OFF_RUSH.includes(position)) f.push(
    { id: 'rushing_yards', label: 'Rushing Yards', keyboardType: 'numeric', placeholder: '1200' },
    { id: 'rushing_tds', label: 'Rushing TDs', keyboardType: 'numeric', placeholder: '12' },
    { id: 'yards_per_carry', label: 'Yards Per Carry', keyboardType: 'decimal-pad', placeholder: '6.2' },
  );
  if (OFF_REC.includes(position)) f.push(
    { id: 'receiving_yards', label: 'Receiving Yards', keyboardType: 'numeric', placeholder: '800' },
    { id: 'receiving_tds', label: 'Receiving TDs', keyboardType: 'numeric', placeholder: '8' },
  );
  if ([...POS_WR, ...POS_TE, ...POS_ATH].includes(position)) f.push({ id: 'receptions', label: 'Receptions', keyboardType: 'numeric', placeholder: '45' });
  if (POS_OL.includes(position)) f.push({ id: 'pancake_blocks', label: 'Pancake Blocks', keyboardType: 'numeric', placeholder: '30' });
  if (DEF_TACK.includes(position)) f.push({ id: 'total_tackles', label: 'Total Tackles', keyboardType: 'numeric', placeholder: '75' });
  if (DEF_RUSH.includes(position)) f.push(
    { id: 'sacks', label: 'Sacks', keyboardType: 'decimal-pad', placeholder: '6.5' },
    { id: 'tackles_for_loss', label: 'Tackles For Loss', keyboardType: 'numeric', placeholder: '10' },
  );
  if (DEF_COV.includes(position)) f.push(
    { id: 'interceptions', label: 'Interceptions', keyboardType: 'numeric', placeholder: '3' },
    { id: 'passes_defended', label: 'Pass Breakups', keyboardType: 'numeric', placeholder: '8' },
  );
  if (position === 'K') f.push(
    { id: 'fg_long', label: 'Longest FG Made (yds)', keyboardType: 'numeric', placeholder: '45' },
    { id: 'fg_pct', label: 'FG % Inside 40', keyboardType: 'numeric', placeholder: '85' },
    { id: 'kickoff_distance', label: 'Avg Kickoff Distance (yds)', keyboardType: 'numeric', placeholder: '62' },
  );
  if (position === 'P') f.push(
    { id: 'punt_average', label: 'Punt Average (yds)', keyboardType: 'numeric', placeholder: '42' },
    { id: 'punt_inside_20', label: 'Punts Inside the 20', keyboardType: 'numeric', placeholder: '12' },
  );
  return f;
}

function getPriorSeasonStatFields(position: string, grade: number): StatField[] {
  const p = `s${grade}_`;
  const f: StatField[] = [
    { id: `${p}games_played`, label: 'Games Played', keyboardType: 'numeric', placeholder: '10' },
    { id: `${p}games_started`, label: 'Games Started', keyboardType: 'numeric', placeholder: '8' },
  ];
  if (OFF_PASS.includes(position)) f.push(
    { id: `${p}passing_yards`, label: 'Passing Yards', keyboardType: 'numeric', placeholder: '1800' },
    { id: `${p}passing_tds`, label: 'Passing TDs', keyboardType: 'numeric', placeholder: '16' },
  );
  if (OFF_RUSH.includes(position)) f.push(
    { id: `${p}rushing_yards`, label: 'Rushing Yards', keyboardType: 'numeric', placeholder: '900' },
    { id: `${p}rushing_tds`, label: 'Rushing TDs', keyboardType: 'numeric', placeholder: '10' },
  );
  if ([...POS_WR, ...POS_TE].includes(position)) f.push(
    { id: `${p}receiving_yards`, label: 'Receiving Yards', keyboardType: 'numeric', placeholder: '700' },
    { id: `${p}receiving_tds`, label: 'Receiving TDs', keyboardType: 'numeric', placeholder: '8' },
  );
  if (position === 'RB') f.push({ id: `${p}receiving_yards`, label: 'Receiving Yards', keyboardType: 'numeric', placeholder: '200' });
  if (DEF_TACK.includes(position)) f.push({ id: `${p}total_tackles`, label: 'Total Tackles', keyboardType: 'numeric', placeholder: '60' });
  if (DEF_RUSH.includes(position)) f.push(
    { id: `${p}sacks`, label: 'Sacks', keyboardType: 'decimal-pad', placeholder: '5' },
    { id: `${p}tackles_for_loss`, label: 'Tackles For Loss', keyboardType: 'numeric', placeholder: '8' },
  );
  if (DEF_COV.includes(position)) f.push(
    { id: `${p}interceptions`, label: 'Interceptions', keyboardType: 'numeric', placeholder: '2' },
    { id: `${p}passes_defended`, label: 'Pass Breakups', keyboardType: 'numeric', placeholder: '5' },
  );
  if (position === 'OL') f.push({ id: `${p}pancake_blocks`, label: 'Pancake Blocks', keyboardType: 'numeric', placeholder: '20' });
  if (position === 'K') f.push({ id: `${p}fg_pct`, label: 'FG % Inside 40', keyboardType: 'numeric', placeholder: '80' });
  if (position === 'P') f.push({ id: `${p}punt_average`, label: 'Punt Average (yds)', keyboardType: 'numeric', placeholder: '38' });
  return f;
}

const STATE_NAME_TO_CODE: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};
function normalizeStateCode(state: string | null | undefined): string | null {
  if (!state) return null;
  const s = state.trim();
  if (s.length === 2) return s.toUpperCase();
  return STATE_NAME_TO_CODE[s.toLowerCase()] || null;
}
const DEFAULT_CLASS_OPTIONS_LETTER = ['6A (largest)', '5A', '4A', '3A', '2A', '1A', '8-Man / 6-Man (smallest)'];
const DEFAULT_CLASS_OPTIONS_DIVISION = ['Division I (D1)', 'Division II (D2)', 'Division III (D3)', 'Division IV (D4)', 'Division V (D5)', 'Division VI (D6)', 'Division VII+ (D7+)'];

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
      { label: 'Hudl Profile Link', key: 'hudl_link',         keyboardType: 'url',
        hint: "Your full Hudl profile page. Shows as a 'View on Hudl' button on your profile." },
      { label: 'Hudl Video Link',   key: 'hudl_video_link',   keyboardType: 'url',
        hint: 'A specific highlight video to embed on your profile. On Hudl, open a video and copy the URL from your browser.' },
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
  hudl_link: string; hudl_video_link: string; youtube_link: string;
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
  hudl_link: '', hudl_video_link: '', youtube_link: '',
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
  'hudl_link', 'hudl_video_link', 'youtube_link', 'twitter_handle', 'instagram_handle',
]);

// Keys that live inside coach_info JSONB
const COACH_INFO_KEYS: (keyof Fields)[] = [
  'head_coach_name', 'head_coach_phone', 'head_coach_email',
  'positional_coach_name', 'positional_coach_phone', 'positional_coach_email',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const router = useRouter();
  const { athlete, assessment, refresh } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [isPublic, setIsPublic] = useState(true);
  const [testScoresNotTaken, setTestScoresNotTaken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const profileSlug = (athlete as any)?.profile_slug ?? null;

  const [statResponses, setStatResponses] = useState<Record<string, string>>({});
  const [schoolClassification, setSchoolClassification] = useState('');
  const [stateClassOptions, setStateClassOptions] = useState<string[]>([]);
  const assessmentId = assessment?.id ?? null;

  useEffect(() => {
    const r = assessment?.responses as Record<string, unknown> | null;
    if (!r) return;
    const strResponses: Record<string, string> = {};
    Object.entries(r).forEach(([k, v]) => { if (v != null) strResponses[k] = String(v); });
    setStatResponses(strResponses);
    setSchoolClassification((r.school_classification as string) ?? '');
  }, [assessment?.responses]);

  useEffect(() => {
    const stateCode = normalizeStateCode(fields.state);
    if (!stateCode) { setStateClassOptions([]); return; }
    let cancelled = false;
    supabase
      .from('state_classifications')
      .select('classification_label')
      .eq('state_code', stateCode)
      .order('multiplier', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setStateClassOptions((data ?? []).map((d: any) => d.classification_label));
      });
    return () => { cancelled = true; };
  }, [fields.state]);

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
      hudl_link:              a.hudl_link              ?? '',
      hudl_video_link:        a.hudl_video_link        ?? '',
      youtube_link:           a.youtube_link           ?? '',
      twitter_handle:         a.twitter_handle         ?? '',
      instagram_handle:       a.instagram_handle       ?? '',
    });
    setIsPublic(a.is_profile_public ?? true);
    setTestScoresNotTaken(a.test_scores_not_taken ?? false);
    setLoading(false);
  }, [athlete]);

  const set = (k: keyof Fields) => (v: string) => setFields(f => ({ ...f, [k]: v }));
  const setStat = (id: string) => (v: string) => setStatResponses(r => ({ ...r, [id]: v }));

  const currentGrade = deriveGradeFromGradYear(fields.graduation_year ? parseInt(fields.graduation_year) : 0);
  const firstVarsityGrade = parseGradeOption(statResponses.first_varsity_grade || '');
  const priorGrades = (firstVarsityGrade > 0 && currentGrade > 0 && firstVarsityGrade < currentGrade)
    ? Array.from({ length: currentGrade - firstVarsityGrade }, (_, i) => firstVarsityGrade + i)
    : [];
  const editableStatKeys = [
    'varsity_years', 'first_varsity_grade',
    ...getCurrentSeasonStatFields(fields.position).map(f => f.id),
    ...priorGrades.flatMap(g => getPriorSeasonStatFields(fields.position, g).map(f => f.id)),
  ];

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
    updates.test_scores_not_taken = testScoresNotTaken;
    if (testScoresNotTaken) { updates.sat_score = null; updates.act_score = null; }

    // Pack coach_info JSONB
    const coachInfo: Record<string, string | null> = {};
    COACH_INFO_KEYS.forEach(k => { coachInfo[k] = fields[k] || null; });
    updates.coach_info = coachInfo;

    const { error } = await supabase.from('athletes').update(updates).eq('id', athlete.id);

    if (!error && assessmentId) {
      const { data: existing } = await supabase.from('assessments').select('responses').eq('id', assessmentId).single();
      if (existing) {
        const r = typeof existing.responses === 'string' ? JSON.parse(existing.responses) : (existing.responses || {});
        const statUpdates: Record<string, string> = {};
        editableStatKeys.forEach(key => { if (statResponses[key] !== undefined) statUpdates[key] = statResponses[key]; });
        await supabase.from('assessments').update({
          responses: { ...r, ...statUpdates, school_classification: schoolClassification || r.school_classification },
        }).eq('id', assessmentId);
      }
    }

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
        <ActivityIndicator color={PINK_RED} size="large" />
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
      <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentBar} />

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
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: PINK_RED }}
              >
                <Text style={{ fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' }}>{copied ? 'Copied!' : 'Copy Link'}</Text>
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
              {section.rows
                .filter(row => !(testScoresNotTaken && (row.key === 'sat_score' || row.key === 'act_score')))
                .map((row, idx) => {
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
              {section.title === 'Academic' && (
                <View style={[s.fieldRow, s.fieldRowBorder, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text, marginBottom: 2 }}>Haven't taken SAT or ACT yet</Text>
                    <Text style={{ fontFamily: FontFamily.body, fontSize: 11, color: C.textDim }}>Many programs don't require test scores. Add them later.</Text>
                  </View>
                  <Pressable
                    onPress={() => setTestScoresNotTaken(v => !v)}
                    style={{
                      width: 44, height: 24, borderRadius: 100,
                      backgroundColor: testScoresNotTaken ? PINK_RED : C.surfaceAlt,
                      borderWidth: 1, borderColor: testScoresNotTaken ? PINK_RED : C.border,
                      justifyContent: 'center',
                    }}
                  >
                    <View style={{ position: 'absolute', top: 2, left: testScoresNotTaken ? 22 : 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' }} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* ── Playing Time ── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="time" size={14} color="#fff" />
            <Text style={s.sectionTitle}>PLAYING TIME</Text>
          </View>
          <Text style={s.sectionSub}>Made a mistake on your assessment? Update it here.</Text>
          <View style={s.card}>
            <View style={s.fieldRow}>
              <Text style={s.label}>Varsity Seasons Played</Text>
              <View style={s.chipWrap}>
                {VARSITY_YEARS_OPTIONS.map(opt => (
                  <Pressable
                    key={opt}
                    style={[s.chip, statResponses.varsity_years === opt && s.chipActive]}
                    onPress={() => setStat('varsity_years')(opt)}
                  >
                    <Text style={[s.chipText, statResponses.varsity_years === opt && s.chipTextActive]}>{opt}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Text style={s.label}>First Varsity Grade</Text>
              <View style={s.chipWrap}>
                {GRADE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[s.chip, statResponses.first_varsity_grade === opt.value && s.chipActive]}
                    onPress={() => setStat('first_varsity_grade')(opt.value)}
                  >
                    <Text style={[s.chipText, statResponses.first_varsity_grade === opt.value && s.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ── This Season's Stats ── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="stats-chart" size={14} color="#fff" />
            <Text style={s.sectionTitle}>THIS SEASON'S STATS</Text>
          </View>
          {assessmentId ? (
            <>
              <Text style={s.sectionSub}>Production from your most recent varsity season. Made a mistake during your assessment? Fix it here.</Text>
              <View style={s.card}>
                {getCurrentSeasonStatFields(fields.position).map((f, idx) => (
                  <View key={f.id} style={[s.fieldRow, idx > 0 && s.fieldRowBorder]}>
                    <Text style={s.label}>{f.label}</Text>
                    <TextInput
                      style={s.input}
                      value={statResponses[f.id] ?? ''}
                      onChangeText={setStat(f.id)}
                      placeholder={f.placeholder}
                      placeholderTextColor={C.textDim}
                      keyboardType={f.keyboardType}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={s.card}>
              <Text style={{ fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, padding: 16 }}>
                Complete your assessment first to add season stats.
              </Text>
            </View>
          )}
        </View>

        {/* ── Prior season stats, one section per grade between first varsity year and now ── */}
        {priorGrades.map(g => (
          <View key={g} style={s.sectionWrap}>
            <View style={s.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={14} color="#fff" />
              <Text style={s.sectionTitle}>{GRADE_LABELS[g].toUpperCase()} SEASON STATS</Text>
            </View>
            <View style={s.card}>
              {getPriorSeasonStatFields(fields.position, g).map((f, idx) => (
                <View key={f.id} style={[s.fieldRow, idx > 0 && s.fieldRowBorder]}>
                  <Text style={s.label}>{f.label}</Text>
                  <TextInput
                    style={s.input}
                    value={statResponses[f.id] ?? ''}
                    onChangeText={setStat(f.id)}
                    placeholder={f.placeholder}
                    placeholderTextColor={C.textDim}
                    keyboardType={f.keyboardType}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── School Classification ── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="school" size={14} color="#fff" />
            <Text style={s.sectionTitle}>SCHOOL CLASSIFICATION</Text>
          </View>
          <View style={s.card}>
            <View style={s.fieldRow}>
              <View style={s.chipWrap}>
                {(stateClassOptions.length > 0 ? stateClassOptions : [...DEFAULT_CLASS_OPTIONS_LETTER, ...DEFAULT_CLASS_OPTIONS_DIVISION])
                  .concat(['Private / Independent', 'Not sure'])
                  .map(opt => (
                    <Pressable
                      key={opt}
                      style={[s.chip, schoolClassification === opt && s.chipActive]}
                      onPress={() => setSchoolClassification(opt)}
                    >
                      <Text style={[s.chipText, schoolClassification === opt && s.chipTextActive]}>{opt}</Text>
                    </Pressable>
                  ))}
              </View>
              {!assessmentId && <Text style={s.hint}>Complete your assessment first to set your classification.</Text>}
            </View>
          </View>
        </View>

        {/* ── Public Profile Toggle ── */}
        <View style={[s.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, marginBottom: 20 }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text, marginBottom: 2 }}>Public Profile</Text>
            <Text style={{ fontFamily: FontFamily.body, fontSize: 11, color: C.textDim }}>Allow coaches to view your profile</Text>
          </View>
          <Pressable
            onPress={() => setIsPublic(v => !v)}
            style={{
              width: 44, height: 24, borderRadius: 100,
              backgroundColor: isPublic ? PINK_RED : C.surface,
              borderWidth: 1, borderColor: isPublic ? PINK_RED : C.border,
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
            colors={FLAME_GRADIENT}
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
    eyebrow: { fontFamily: FontFamily.bodyBold, fontSize: 10, letterSpacing: 1.4, color: PINK_RED, marginBottom: 2 },
    headerTitle: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text },

    accentBar: { height: 3, marginHorizontal: 20, borderRadius: 100, marginBottom: 20 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

    sectionWrap: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { fontFamily: FontFamily.mono, fontSize: 11, letterSpacing: 1.0, color: C.textMuted },
    sectionSub: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginBottom: 8, marginTop: -4 },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
    chipActive: { backgroundColor: PINK_RED, borderColor: PINK_RED },
    chipText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },
    chipTextActive: { color: '#fff' },

    card: { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden' },
    fieldRow: { paddingHorizontal: 16, paddingVertical: 12 },
    fieldRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    fieldLabelRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 6,
    },
    label: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },

    input: { fontFamily: FontFamily.body, fontSize: 15, color: C.text, paddingVertical: 0 },
    inputMulti: { height: 80, textAlignVertical: 'top' },

    hint: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 5, lineHeight: 16 },

    starterBioBtn: {
      backgroundColor: `${PINK_RED}22`, borderRadius: 100,
      paddingHorizontal: 10, paddingVertical: 3,
    },
    starterBioBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: PINK_RED },

    saveBtnWrap: { marginTop: 8 },
    saveBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 16, color: '#ffffff', letterSpacing: 0.3 },
  });
}
