import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const IG_GRADIENT: [string, string, string, string] = ['#833AB4', '#C13584', '#E1306C', '#FCAF45'];
const SCORE_GRADIENT: [string, string] = ['#ff0000', '#aa00ff'];

const BREAKDOWN_BARS = [
  { label: 'Athletic / Physical', key: 'athletic',    fallback: 'physical',   color: '#0067ff' },
  { label: 'Football Production', key: 'production',  fallback: null,         color: '#00ffbe' },
  { label: 'Academic',            key: 'academic',    fallback: null,         color: '#3eff00' },
  { label: 'Intangibles',         key: 'intangibles', fallback: null,         color: '#FCAF45' },
];

const TABS = ['Overview', 'Film', 'Stats', 'Schools'] as const;
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
  const [matches,    setMatches]    = useState<{ match_score: number | null; programs: { name: string; division: string } | null }[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<Tab>('Overview');
  const [editing,    setEditing]    = useState(false);
  const [assessRes,  setAssessRes]  = useState<Record<string, any>>({});

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    async function load() {
      setLoading(true);

      let athleteRow: ProfileData | null = null;
      const { data: byUser } = await supabase
        .from('athletes')
        .select('id, full_name, position, height, weight, gpa, graduation_year, high_school, city, state, forty_yard, vertical_jump, pro_shuttle, three_cone, broad_jump, bio, profile_photo_url, hudl_video_link, youtube_link, twitter_handle, instagram_handle, v1_score')
        .eq('user_id', userId)
        .maybeSingle();
      athleteRow = byUser as ProfileData | null;

      if (!athleteRow) {
        const { data: byLinked } = await supabase
          .from('athletes')
          .select('id, full_name, position, height, weight, gpa, graduation_year, high_school, city, state, forty_yard, vertical_jump, pro_shuttle, three_cone, broad_jump, bio, profile_photo_url, hudl_video_link, youtube_link, twitter_handle, instagram_handle, v1_score')
          .eq('linked_user_id', userId)
          .maybeSingle();
        athleteRow = byLinked as ProfileData | null;
      }

      if (!athleteRow) { setLoading(false); return; }
      setProfile(athleteRow);

      const [{ data: assessRow }, { data: matchRows }] = await Promise.all([
        supabase
          .from('assessments')
          .select('v1_score, score_breakdown, responses')
          .eq('athlete_id', athleteRow.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('matches')
          .select('match_score, programs(name, division)')
          .eq('athlete_id', athleteRow.id)
          .order('match_score', { ascending: false })
          .limit(20),
      ]);

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

      if (matchRows) setMatches(matchRows as any);
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

  const metrics = [
    profile?.height ? { label: 'HEIGHT',  value: profile.height,        sub: ''    }            : null,
    profile?.weight ? { label: 'WEIGHT',  value: String(profile.weight), sub: 'lbs' }            : null,
    fortyYard       ? { label: '40-YARD', value: String(fortyYard),      sub: 's',  green: true } : null,
    profile?.gpa    ? { label: 'GPA',     value: String(profile.gpa),    sub: '',   green: true } : null,
  ].filter(Boolean) as { label: string; value: string; sub: string; green?: boolean }[];

  return (
    <>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={s.heroSection}>
          {profile?.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={s.photo} />
          ) : (
            <LinearGradient colors={IG_GRADIENT} style={s.photo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.initials}>{initials}</Text>
            </LinearGradient>
          )}

          <Text style={s.heroName}>{name}</Text>
          {!!(profile?.position || level) && (
            <Text style={s.heroSub}>{[profile?.position, level].filter(Boolean).join(' · ')}</Text>
          )}
          {!!(profile?.high_school || profile?.city || profile?.state) && (
            <Text style={s.heroLocation}>
              {[profile?.high_school, profile?.city, profile?.state].filter(Boolean).join(' · ')}
            </Text>
          )}
          {!!profile?.graduation_year && (
            <Text style={s.heroClass}>Class of {profile.graduation_year}</Text>
          )}

          <Pressable style={s.editBtn} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={14} color={C.primary} />
            <Text style={s.editBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* ── Metric Boxes ── */}
        {metrics.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.metricsRow}>
            {metrics.map(m => (
              <View key={m.label} style={s.metricBox}>
                <Text style={s.metricLabel}>{m.label}</Text>
                <Text style={[s.metricValue, m.green && { color: '#10b981' }]}>
                  {m.value}
                  {m.sub ? <Text style={s.metricSub}>{' '}{m.sub}</Text> : null}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── V1 Score Card ── */}
        {score !== null && (
          <LinearGradient colors={SCORE_GRADIENT} style={s.scoreCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.scoreLabel}>V1 Score</Text>
            <Text style={s.scoreNum}>{score}</Text>
            {level ? <Text style={s.scoreLevel}>{level}</Text> : null}
            <Text style={s.scoreDesc}>Realistic assessment of where you fit in college football recruiting.</Text>
          </LinearGradient>
        )}

        {/* ── Tab Bar ── */}
        <View style={s.tabBar}>
          {TABS.map(t => (
            <Pressable key={t} style={s.tabBtn} onPress={() => setTab(t)}>
              <Text style={[s.tabText, tab === t && s.tabActive]}>{t}</Text>
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
                          <Text style={[s.barValue, { color: bar.color }]}>{val}</Text>
                        </View>
                        <View style={s.barTrack}>
                          <View style={[s.barFill, { width: `${val}%` as any, backgroundColor: bar.color }]} />
                        </View>
                      </View>
                    );
                  })}
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
                { label: 'Location',    value: [profile?.city, profile?.state].filter(Boolean).join(', ') || null },
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
            <Text style={s.sectionHeading}>Film</Text>
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
                  <View key={label} style={s.statBox}>
                    <Text style={s.statLabel}>{label}</Text>
                    <Text style={s.statValue}>{String(val)}</Text>
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
                    <View key={r.label} style={s.statBox}>
                      <Text style={s.statLabel}>{r.label}</Text>
                      <Text style={s.statValue}>{r.value}{r.unit}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Schools ── */}
        {tab === 'Schools' && (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Top Program Matches</Text>
            {matches.length > 0 ? (
              <View style={{ gap: 10 }}>
                {matches.map((m, i) => (
                  <View key={i} style={s.matchRow}>
                    <View style={s.matchRank}>
                      <Text style={s.matchRankText}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.matchName}>{m.programs?.name ?? '—'}</Text>
                      <Text style={s.matchDiv}>{m.programs?.division ?? ''}</Text>
                    </View>
                    {m.match_score !== null && (
                      <Text style={s.matchScore}>{Math.round(m.match_score)}%</Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={[s.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <Ionicons name="school-outline" size={32} color={C.icon} />
                <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 12, textAlign: 'center' }}>
                  No program matches yet.{'\n'}Complete your profile and assessment.
                </Text>
              </View>
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

    heroSection: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
    photo: { width: 120, height: 120, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    initials: { fontSize: 40, fontWeight: '900', color: '#fff' },
    heroName: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -0.5, textAlign: 'center' },
    heroSub: { fontSize: 14, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
    heroLocation: { fontSize: 13, color: C.textMuted, textAlign: 'center' },
    heroClass: { fontSize: 12, color: C.textDim, textAlign: 'center' },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, backgroundColor: C.primary + '18', marginTop: 4 },
    editBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },

    metricsRow: { paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
    metricBox: { backgroundColor: C.surface, borderRadius: 12, padding: 16, minWidth: 100 },
    metricLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
    metricValue: { fontSize: 26, fontWeight: '900', color: C.text },
    metricSub: { fontSize: 13, color: C.textDim, fontWeight: '400' },

    scoreCard: { marginHorizontal: 20, borderRadius: 16, padding: 24, marginBottom: 4 },
    scoreLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: 12 },
    scoreNum: { fontSize: 64, fontWeight: '900', color: '#fff', lineHeight: 68, letterSpacing: -2 },
    scoreLevel: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
    scoreDesc: { fontSize: 12, lineHeight: 18, color: 'rgba(255,255,255,0.85)' },

    tabBar: { flexDirection: 'row', marginHorizontal: 20, marginTop: 20, gap: 24, borderBottomWidth: 1, borderBottomColor: C.border },
    tabBtn: { paddingBottom: 12, position: 'relative' },
    tabText: { fontSize: 13, fontWeight: '500', color: C.textMuted },
    tabActive: { color: C.text, fontWeight: '700' },
    tabUnderline: { position: 'absolute', bottom: -1, left: 0, right: 0, height: 2, backgroundColor: C.primary, borderRadius: 1 },

    section: { paddingHorizontal: 20, paddingTop: 20, gap: 16, paddingBottom: 8 },
    sectionHeading: { fontSize: 18, fontWeight: '800', color: C.text },
    card: { backgroundColor: C.surface, borderRadius: 14, padding: 18, gap: 12 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    bio: { fontSize: 14, lineHeight: 21, color: C.textMuted },

    barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    barLabel: { fontSize: 13, fontWeight: '600', color: C.text },
    barValue: { fontSize: 13, fontWeight: '800' },
    barTrack: { height: 6, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    infoRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    infoLabel: { fontSize: 12, color: C.textDim, fontWeight: '500' },
    infoValue: { fontSize: 13, color: C.text, fontWeight: '700' },

    filmCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 28, alignItems: 'center', gap: 12, minHeight: 200, justifyContent: 'center' },
    filmPlayCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    filmCardTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
    filmCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
    filmLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 100, marginTop: 4 },
    filmLinkText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    ytCard: { backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 24, alignItems: 'center', gap: 10 },
    ytText: { fontSize: 13, fontWeight: '600', color: C.text },
    addFilmBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 100, backgroundColor: C.primary + '20' },
    addFilmText: { fontSize: 13, fontWeight: '700', color: C.primary },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statBox: { width: '47%', backgroundColor: C.surface, borderRadius: 12, padding: 16, alignItems: 'center' },
    statLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.3, textAlign: 'center', marginBottom: 8 },
    statValue: { fontSize: 28, fontWeight: '900', color: C.textMuted },

    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 12, padding: 16 },
    matchRank: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    matchRankText: { fontSize: 15, fontWeight: '700', color: C.text },
    matchName: { fontSize: 14, fontWeight: '700', color: C.text },
    matchDiv: { fontSize: 12, color: C.textMuted, marginTop: 2 },
    matchScore: { fontSize: 22, fontWeight: '900', color: '#10b981' },

  });
}
