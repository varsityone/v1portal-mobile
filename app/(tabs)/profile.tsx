import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { GRADIENT, SCORE_GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

const API_BASE = 'https://v1portal.com';

const BREAKDOWN_BARS = [
  { label: 'Athletic / Physical', key: 'athletic',    fallback: 'physical' },
  { label: 'Football Production', key: 'production',  fallback: null },
  { label: 'Academic',            key: 'academic',    fallback: null },
  { label: 'Intangibles',         key: 'intangibles', fallback: null },
];

const TABS = ['Overview', 'Film', 'Stats'] as const;
type Tab = typeof TABS[number];

function getRecruitingLevel(score: number | null): string {
  if (!score) return '';
  if (score >= 80) return 'FBS Prospect';
  if (score >= 75) return 'FCS Prospect';
  if (score >= 70) return 'D2 Prospect';
  if (score >= 60) return 'D3/NAIA Prospect';
  if (score >= 50) return 'NAIA/JUCO Prospect';
  return 'JUCO/Prep School Prospect';
}

// ── Data types ────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  full_name: string | null;
  position: string | null;
  height: string | null;
  weight: string | null;
  gpa: string | null;
  graduation_year: string | null;
  high_school: string | null;
  city: string | null;
  state: string | null;
  forty_yard: string | null;
  vertical_jump: string | null;
  pro_shuttle: string | null;
  three_cone: string | null;
  broad_jump: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  hudl_video_link: string | null;
  youtube_link: string | null;
  twitter_handle: string | null;
  instagram_handle: string | null;
  v1_score: number | null;
  profile_slug: string | null;
}

interface TopFitProgram {
  id: string;
  name: string;
  division: string;
  logoUrl: string | null;
  fitPct: number;
  tag: string;
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ data, onSave, onClose }: {
  data: ProfileData;
  onSave: (updates: Partial<ProfileData>) => Promise<void>;
  onClose: () => void;
}) {
  const C = useColors();
  const em = useMemo(() => createEmStyles(C), [C]);

  const [fields, setFields] = useState({
    full_name:       data.full_name       ?? '',
    position:        data.position        ?? '',
    height:          data.height          ?? '',
    weight:          data.weight          ?? '',
    gpa:             data.gpa             ?? '',
    graduation_year: data.graduation_year ?? '',
    high_school:     data.high_school     ?? '',
    city:            data.city            ?? '',
    state:           data.state           ?? '',
    forty_yard:      data.forty_yard      ?? '',
    vertical_jump:   data.vertical_jump   ?? '',
    bio:             data.bio             ?? '',
    hudl_video_link: data.hudl_video_link ?? '',
    youtube_link:    data.youtube_link    ?? '',
    twitter_handle:  data.twitter_handle  ?? '',
    instagram_handle:data.instagram_handle ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof fields) => (v: string) => setFields(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const updates: Partial<ProfileData> = {};
    (Object.keys(fields) as (keyof typeof fields)[]).forEach(k => {
      (updates as any)[k] = (fields[k] as string) || null;
    });
    await onSave(updates);
    setSaving(false);
    onClose();
  };

  const SECTIONS = [
    { title: 'Personal', rows: [
      { label: 'Full Name', key: 'full_name' as const },
      { label: 'Bio', key: 'bio' as const, multi: true },
    ]},
    { title: 'Athletic', rows: [
      { label: 'Position', key: 'position' as const },
      { label: "Height (e.g. 6'1\")", key: 'height' as const },
      { label: 'Weight (lbs)', key: 'weight' as const },
      { label: '40-Yard (s)', key: 'forty_yard' as const },
      { label: 'Vertical (in)', key: 'vertical_jump' as const },
    ]},
    { title: 'Academic', rows: [
      { label: 'GPA', key: 'gpa' as const },
      { label: 'Grad Year', key: 'graduation_year' as const },
      { label: 'High School', key: 'high_school' as const },
    ]},
    { title: 'Location', rows: [
      { label: 'City', key: 'city' as const },
      { label: 'State', key: 'state' as const },
    ]},
    { title: 'Film & Social', rows: [
      { label: 'Hudl Video URL', key: 'hudl_video_link' as const },
      { label: 'YouTube URL', key: 'youtube_link' as const },
      { label: 'Twitter Handle', key: 'twitter_handle' as const },
      { label: 'Instagram Handle', key: 'instagram_handle' as const },
    ]},
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={em.root}>
        <View style={em.nav}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={em.cancel}>Cancel</Text></Pressable>
          <Text style={em.navTitle}>Edit Profile</Text>
          <Pressable onPress={handleSave} disabled={saving} hitSlop={8}>
            <Text style={[em.save, saving && { opacity: 0.5 }]}>{saving ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
        <ScrollView style={em.scroll} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {SECTIONS.map(section => (
            <View key={section.title} style={em.section}>
              <Text style={em.sectionTitle}>{section.title}</Text>
              {section.rows.map(row => (
                <View key={row.key} style={em.fieldWrap}>
                  {row.key === 'bio' ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={em.label}>{row.label}</Text>
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
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${C.primary}18`, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: `${C.primary}35` }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: C.primary }}>✦ Starter Bio</Text>
                        </Pressable>
                      </View>
                      <TextInput
                        style={[em.input, { height: 90, textAlignVertical: 'top', paddingTop: 10 }]}
                        value={fields.bio}
                        onChangeText={set('bio')}
                        placeholder={"QB | Class of 2026 | Lincoln HS | Dallas, TX\n6'2\" / 205 lbs | 3.8 GPA\nUncommitted | Earning my opportunity"}
                        placeholderTextColor={C.textDim}
                        multiline
                      />
                      <Text style={{ fontSize: 11, color: C.textDim, marginTop: 5, lineHeight: 16 }}>
                        Keep it short and keyword-rich — works for Twitter/X and Instagram too.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={em.label}>{row.label}</Text>
                      <TextInput
                        style={[em.input, (row as any).multi && { height: 72, textAlignVertical: 'top', paddingTop: 10 }]}
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
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { session } = useAuth();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [profile,    setProfile]    = useState<ProfileData | null>(null);
  const [breakdown,  setBreakdown]  = useState<Record<string, any>>({});
  const [seasonStats,setSeasonStats]= useState<Record<string, any>>({});
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<Tab>('Overview');
  const [editing,    setEditing]    = useState(false);
  const [assessRes,  setAssessRes]  = useState<Record<string, any>>({});

  // Computed display-only fields (star rating, completeness badge, fit list) —
  // sourced from the same API web's own public profile uses, rather than
  // reimplementing the fit-score/star-rating logic a second time here.
  const [starRatingNum, setStarRatingNum] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [topFitPrograms, setTopFitPrograms] = useState<TopFitProgram[]>([]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    async function load() {
      setLoading(true);

      let athleteRow: ProfileData | null = null;
      const { data: byUser } = await supabase
        .from('athletes')
        .select('id, full_name, position, height, weight, gpa, graduation_year, high_school, city, state, forty_yard, vertical_jump, pro_shuttle, three_cone, broad_jump, bio, profile_photo_url, hudl_video_link, youtube_link, twitter_handle, instagram_handle, v1_score, profile_slug')
        .eq('user_id', userId)
        .maybeSingle();
      athleteRow = byUser as ProfileData | null;

      if (!athleteRow) {
        const { data: byLinked } = await supabase
          .from('athletes')
          .select('id, full_name, position, height, weight, gpa, graduation_year, high_school, city, state, forty_yard, vertical_jump, pro_shuttle, three_cone, broad_jump, bio, profile_photo_url, hudl_video_link, youtube_link, twitter_handle, instagram_handle, v1_score, profile_slug')
          .eq('linked_user_id', userId)
          .maybeSingle();
        athleteRow = byLinked as ProfileData | null;
      }

      if (!athleteRow) { setLoading(false); return; }
      setProfile(athleteRow);

      const { data: assessRow } = await supabase
        .from('assessments')
        .select('v1_score, score_breakdown, responses')
        .eq('athlete_id', athleteRow.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessRow) {
        const rawBd = (assessRow as any).score_breakdown;
        const bd = typeof rawBd === 'string' ? (() => { try { return JSON.parse(rawBd); } catch { return {}; } })() : (rawBd ?? {});
        setBreakdown(bd);

        const rawR = (assessRow as any).responses;
        const r: Record<string, any> = typeof rawR === 'string'
          ? (() => { try { return JSON.parse(rawR); } catch { return {}; } })()
          : (rawR ?? {});

        const ss: Record<string, any> = {};
        const STAT_KEYS: [string, string][] = [
          ['passing_yards','Passing Yards'], ['passing_tds','Passing TDs'],
          ['rushing_yards','Rushing Yards'], ['rushing_tds','Rushing TDs'],
          ['receptions','Receptions'], ['receiving_yards','Receiving Yards'], ['receiving_tds','Receiving TDs'],
          ['total_tackles','Tackles'], ['sacks','Sacks'], ['interceptions','Interceptions'],
          ['passes_defended','Passes Defended'], ['games_started','Games Started'],
        ];
        STAT_KEYS.forEach(([key, label]) => {
          const v = r[key];
          if (v !== null && v !== undefined && v !== '') ss[label] = v;
        });
        setSeasonStats(ss);
        setAssessRes(r);
      }

      if (athleteRow.profile_slug) {
        try {
          const res = await fetch(`${API_BASE}/api/profile/${athleteRow.profile_slug}`);
          if (res.ok) {
            const data = await res.json();
            setStarRatingNum(data.starRatingNum ?? 0);
            setProfileComplete(!!data.profileComplete);
            setTopFitPrograms(data.topFitPrograms ?? []);
          }
        } catch {
          // Falls back to no star rating / no fit list — the core profile still works.
        }
      }

      setLoading(false);
    }

    load();
  }, [session?.user?.id]);

  const handleSave = async (updates: Partial<ProfileData>) => {
    if (!profile?.id) return;
    const { error } = await supabase.from('athletes').update(updates).eq('id', profile.id);
    if (error) { Alert.alert('Error', error.message); return; }
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const score = profile?.v1_score ? Math.round(Number(profile.v1_score)) : null;
  const level = getRecruitingLevel(score);
  const name  = profile?.full_name || 'Athlete';
  const nameParts = name.trim().split(' ').filter(Boolean);
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : nameParts.length === 1 ? nameParts[0][0].toUpperCase() : '??';

  const hasHudl = !!profile?.hudl_video_link;
  const hudlHref = profile?.hudl_video_link ?? null;
  const ytId = profile?.youtube_link
    ? (profile.youtube_link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1] ?? null)
    : null;

  const fortyYard   = profile?.forty_yard   || assessRes.forty_time   || null;
  const vertical    = profile?.vertical_jump || assessRes.vertical     || null;
  const proShuttle  = profile?.pro_shuttle   || assessRes.shuttle      || null;
  const threeCone   = profile?.three_cone    || assessRes.three_cone   || null;
  const broadJump   = profile?.broad_jump    || assessRes.broad_jump   || null;

  const metaParts = [profile?.position, profile?.height, profile?.weight ? `${profile.weight} lbs` : null, profile?.graduation_year ? `Class of ${profile.graduation_year}` : null].filter(Boolean);
  const locationText = [profile?.city, profile?.state].filter(Boolean).join(', ');

  const combineStats = [
    { label: '40 YD', value: fortyYard, suffix: 's' },
    { label: 'Shuttle', value: proShuttle, suffix: 's' },
    { label: 'Vert', value: vertical, suffix: '"' },
  ].filter(st => st.value);

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={s.hero}>
          {profile?.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={StyleSheet.absoluteFill} />
          ) : (
            <LinearGradient colors={['#1a1a2e', '#0a0a0c']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={s.initialsWrap}><Text style={s.initials}>{initials}</Text></View>
            </LinearGradient>
          )}
          <View style={s.heroScrim} />

          {score !== null && (
            <View style={s.scoreRing}>
              <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreRingGradient}>
                <View style={s.scoreRingInner}>
                  <Text style={s.scoreNum}>{score}</Text>
                  <Text style={s.scoreLabel}>V1 SCORE</Text>
                </View>
              </LinearGradient>
            </View>
          )}

          <View style={s.heroInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={s.heroName}>{name}</Text>
              {profileComplete && (
                <Image source={require('../../assets/logo-mark.png')} style={{ width: 16, height: 20 }} resizeMode="contain" />
              )}
            </View>
            {metaParts.length > 0 && <Text style={s.heroMeta}>{metaParts.join(' · ')}</Text>}
            {(locationText || starRatingNum > 0) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                {locationText ? <Text style={s.heroLocation}>{locationText}</Text> : null}
                {starRatingNum > 0 && (
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <Ionicons key={i} name="star" size={11} color={i < starRatingNum ? '#F6BA00' : 'rgba(255,255,255,0.25)'} />
                    ))}
                  </View>
                )}
              </View>
            )}
            <Pressable style={s.editBtn} onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={13} color="#fff" />
              <Text style={s.editBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Combine stats ── */}
        {combineStats.length > 0 && (
          <View style={s.statsRow}>
            {combineStats.map(st => (
              <View key={st.label} style={s.statCard}>
                <Text style={s.statCardLabel}>{st.label.toUpperCase()}</Text>
                <Text style={s.statCardValue}>{st.value}{st.suffix}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Tab Bar ── */}
        <View style={s.tabBar}>
          {TABS.map(t => (
            <Pressable key={t} style={s.tabBtn} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabActive]}>{t.toUpperCase()}</Text>
              {tab === t && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {/* ── Overview ── */}
        {tab === 'Overview' && (
          <View style={s.section}>
            {profile?.bio ? (
              <View style={s.card}>
                <Text style={s.cardTitle}>About</Text>
                <Text style={s.bio}>{profile.bio}</Text>
              </View>
            ) : null}

            {Object.keys(breakdown).length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>V1 Score Breakdown</Text>
                <View style={{ gap: 14 }}>
                  {BREAKDOWN_BARS.map(bar => {
                    const raw = breakdown[bar.key] ?? (bar.fallback ? breakdown[bar.fallback] : null);
                    if (!raw) return null;
                    const val = typeof raw === 'object' ? raw.score : raw;
                    if (!val) return null;
                    return (
                      <View key={bar.key}>
                        <View style={s.barLabelRow}>
                          <Text style={s.barLabel}>{bar.label}</Text>
                          <Text style={s.barValue}>{val}</Text>
                        </View>
                        <View style={s.barTrack}>
                          <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.barFill, { width: `${val}%` as any }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {topFitPrograms.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Top Fit Programs</Text>
                <View style={{ gap: 2 }}>
                  {topFitPrograms.map(p => (
                    <View key={p.id} style={s.fitRow}>
                      {p.logoUrl ? (
                        <Image source={{ uri: p.logoUrl }} style={s.fitLogo} resizeMode="contain" />
                      ) : (
                        <View style={[s.fitLogo, { backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: C.textMuted }}>{p.name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.fitName}>{p.name}</Text>
                        <Text style={s.fitMeta}>{p.fitPct}% Fit · {p.tag}</Text>
                      </View>
                      <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fitBadge}>
                        <Text style={s.fitBadgeText}>{p.fitPct}</Text>
                      </LinearGradient>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={s.card}>
              <Text style={s.cardTitle}>Quick Info</Text>
              {[
                { label: 'Position',    value: profile?.position },
                { label: 'Height',      value: profile?.height },
                { label: 'Weight',      value: profile?.weight ? `${profile.weight} lbs` : null },
                { label: '40-Yard',     value: fortyYard ? `${fortyYard}s` : null },
                { label: 'Vertical',    value: vertical  ? `${vertical}"` : null },
                { label: 'GPA',         value: profile?.gpa },
                { label: 'Grad Year',   value: profile?.graduation_year },
                { label: 'High School', value: profile?.high_school },
                { label: 'Location',    value: locationText || null },
              ].filter(r => r.value).map((row, i, arr) => (
                <View key={row.label} style={[s.infoRow, i < arr.length - 1 && s.infoRowBorder]}>
                  <Text style={s.infoLabel}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Film ── */}
        {tab === 'Film' && (
          <View style={s.section}>
            {hasHudl && (
              <Pressable style={s.filmCard} onPress={() => hudlHref && Linking.openURL(hudlHref)}>
                <View style={s.filmPlayCircle}>
                  <Ionicons name="play" size={24} color="rgba(255,255,255,0.7)" />
                </View>
                <Text style={s.filmCardTitle}>Watch Highlights on Hudl</Text>
                <Text style={s.filmCardSub}>Tap to view film</Text>
                <View style={s.filmLinkBtn}>
                  <Ionicons name="open-outline" size={13} color="#fff" />
                  <Text style={s.filmLinkText}>View on Hudl</Text>
                </View>
              </Pressable>
            )}
            {ytId ? (
              <View style={s.card}>
                <Text style={s.cardTitle}>YouTube Highlights</Text>
                <Pressable style={s.ytCard} onPress={() => Linking.openURL(`https://youtube.com/watch?v=${ytId}`)}>
                  <Ionicons name="logo-youtube" size={36} color="#FF0000" />
                  <Text style={s.ytText}>Open on YouTube</Text>
                </Pressable>
              </View>
            ) : null}
            {!hasHudl && !ytId && (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Ionicons name="film-outline" size={32} color={C.icon} />
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 12, textAlign: 'center' }}>
                  No film links added yet.
                </Text>
                <Pressable style={s.addFilmBtn} onPress={() => setEditing(true)}>
                  <Text style={s.addFilmText}>Add Film Links</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ── Stats ── */}
        {tab === 'Stats' && (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Season Stats</Text>
            {Object.keys(seasonStats).length > 0 ? (
              <View style={s.statsGrid}>
                {Object.entries(seasonStats).map(([label, val]) => (
                  <View key={label} style={s.miniStatBox}>
                    <Text style={s.miniStatLabel}>{label}</Text>
                    <Text style={s.miniStatValue}>{String(val)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
                <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center' }}>
                  No season stats available.{'\n'}Complete your assessment to unlock stats.
                </Text>
              </View>
            )}

            {(fortyYard || vertical || proShuttle || threeCone || broadJump) && (
              <>
                <Text style={[s.sectionHeading, { marginTop: 8 }]}>Athletic Testing</Text>
                <View style={s.statsGrid}>
                  {[
                    { label: '40-Yard',     value: fortyYard,   unit: 's' },
                    { label: 'Vertical',    value: vertical,    unit: '"' },
                    { label: 'Pro Shuttle', value: proShuttle,  unit: 's' },
                    { label: '3-Cone',      value: threeCone,   unit: 's' },
                    { label: 'Broad Jump',  value: broadJump,   unit: '"' },
                  ].filter(r => r.value).map(r => (
                    <View key={r.label} style={s.miniStatBox}>
                      <Text style={s.miniStatLabel}>{r.label}</Text>
                      <Text style={s.miniStatValue}>{r.value}{r.unit}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {editing && profile ? (
        <EditModal data={profile} onSave={handleSave} onClose={() => setEditing(false)} />
      ) : null}
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createEmStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.border },
    navTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    cancel: { fontSize: 15, color: C.textMuted },
    save: { fontSize: 15, fontWeight: '700', color: C.primary },
    scroll: { flex: 1, paddingHorizontal: 20 },
    section: { marginTop: 28 },
    sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: C.textDim, marginBottom: 10 },
    fieldWrap: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '500', color: C.textMuted, marginBottom: 6 },
    input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.text },
  });
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingBottom: 60 },

    hero: { height: 340, position: 'relative', overflow: 'hidden' },
    heroScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', borderBottomWidth: 0 },
    initialsWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    initials: { fontFamily: FontFamily.headline, fontSize: 72, color: 'rgba(255,255,255,0.15)' },

    scoreRing: { position: 'absolute', top: 56, right: 18, width: 76, height: 76, borderRadius: 38 },
    scoreRingGradient: { flex: 1, borderRadius: 38, padding: 3 },
    scoreRingInner: { flex: 1, borderRadius: 35, backgroundColor: '#0c0d0e', alignItems: 'center', justifyContent: 'center' },
    scoreNum: { fontFamily: FontFamily.headline, fontSize: 26, color: '#fff' },
    scoreLabel: { fontFamily: FontFamily.mono, fontSize: 7, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

    heroInfo: { position: 'absolute', left: 18, right: 18, bottom: 18 },
    heroName: { fontFamily: FontFamily.headline, fontSize: 26, color: '#fff' },
    heroMeta: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
    heroLocation: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7, marginTop: 12, alignSelf: 'flex-start' },
    editBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },

    statsRow: { flexDirection: 'row', gap: 10, marginTop: -24, marginHorizontal: 16, position: 'relative', zIndex: 2 },
    statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
    statCardLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, marginBottom: 6 },
    statCardValue: { fontFamily: FontFamily.headline, fontSize: 20, color: C.text },

    tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 24, gap: 22 },
    tabBtn: { paddingBottom: 10, position: 'relative' },
    tabText: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 0.5 },
    tabActive: { color: C.text },
    tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: '#F6BA00', borderRadius: 1 },

    section: { paddingHorizontal: 20, paddingTop: 20, gap: 16, paddingBottom: 8 },
    sectionHeading: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text },
    card: { backgroundColor: C.surface, borderRadius: 16, padding: 18, gap: 12 },
    cardTitle: { fontFamily: FontFamily.headline, fontSize: 17, color: C.text },
    bio: { fontFamily: FontFamily.body, fontSize: 14, lineHeight: 21, color: C.textMuted },

    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    barLabel: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    barValue: { fontFamily: FontFamily.headline, fontSize: 14, color: C.text },
    barTrack: { height: 6, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },

    fitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
    fitLogo: { width: 32, height: 32, borderRadius: 8 },
    fitName: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    fitMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, marginTop: 2 },
    fitBadge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
    fitBadgeText: { fontFamily: FontFamily.headline, fontSize: 12, color: '#fff' },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    infoLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    infoValue: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    filmCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 28, alignItems: 'center', gap: 12, minHeight: 200, justifyContent: 'center' },
    filmPlayCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    filmCardTitle: { fontFamily: FontFamily.bodySemi, fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    filmCardSub: { fontFamily: FontFamily.body, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
    filmLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100, marginTop: 4 },
    filmLinkText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    ytCard: { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 24, alignItems: 'center', gap: 10 },
    ytText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text },
    addFilmBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 100, backgroundColor: C.primary + '20' },
    addFilmText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.primary },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    miniStatBox: { width: '47%', backgroundColor: C.surface, borderRadius: 12, padding: 16, alignItems: 'center' },
    miniStatLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textMuted, textAlign: 'center', marginBottom: 8 },
    miniStatValue: { fontFamily: FontFamily.headline, fontSize: 26, color: C.text },
  });
}
