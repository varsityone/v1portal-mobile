import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { PHASES, Phase } from '../../../constants/Phases';
import { Colors, GRADIENT, TIER_BARS, scoreNumColor, ThemeColors } from '../../../constants/Colors';
import { useColors } from '../../../context/ThemeContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgramMatch {
  school_name: string;
  division: string;
  match_score: number;
  position_fit: string | null;
}

interface CoachContact {
  id: string;
  coach_name: string | null;
  school_name: string | null;
  status: 'sent' | 'opened' | 'replied' | 'bounced' | 'interested';
}

interface RecruitingTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  is_complete: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActiveTierIndex(score: number): number {
  if (score >= 80) return 4;
  if (score >= 75) return 3;
  if (score >= 60) return 2;
  if (score >= 50) return 1;
  return 0;
}

function getTierInfo(score: number | null) {
  if (score === null) return { level: '—', desc: '', nextScore: null as number | null, nextLevel: '' };
  if (score >= 80) return { level: 'FBS LEVEL', desc: 'Power Four & Group of Five programs', nextScore: null as number | null, nextLevel: '' };
  if (score >= 75) return { level: 'FCS LEVEL', desc: 'Division I FCS programs', nextScore: 80, nextLevel: 'FBS Level' };
  if (score >= 70) return { level: 'FCS / D2 LEVEL', desc: 'FCS and Division II programs', nextScore: 75, nextLevel: 'FCS Level' };
  if (score >= 60) return { level: 'D2 / D3 LEVEL', desc: 'Division II and III programs', nextScore: 70, nextLevel: 'FCS / D2 Level' };
  if (score >= 50) return { level: 'NAIA / JUCO LEVEL', desc: 'NAIA and Junior College programs', nextScore: 60, nextLevel: 'D2 / D3 Level' };
  return { level: 'JUCO / PREP LEVEL', desc: 'Junior College and prep programs', nextScore: 50, nextLevel: 'NAIA Level' };
}

const safeNum = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    const x = obj.current ?? obj.value ?? obj.score;
    if (typeof x === 'number') return x;
  }
  return 0;
};

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function taskGroup(task: RecruitingTask): 'Today' | 'This Week' | 'Upcoming' {
  if (!task.due_date) return 'Upcoming';
  const due = new Date(task.due_date);
  const now = new Date();
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return 'This Week';
  return 'Upcoming';
}

function getMatchScoreColor(score: number): string {
  const t = Math.min(score / 99.9, 1);
  if (t <= 0.5) return `rgb(0,${Math.round(106 + 74 * (t / 0.5))},255)`;
  const p = (t - 0.5) / 0.5;
  return `rgb(0,${Math.round(180 + 75 * p)},${Math.round(255 - 225 * p)})`;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function PhaseHeader({ phase, onBack }: { phase: Phase; onBack: () => void }) {
  const C = useColors();
  const sh = useMemo(() => StyleSheet.create({
    root: { marginBottom: 20 },
    back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start', paddingVertical: 4 },
    backText: { fontSize: 15, color: C.textMuted },
    badge: { alignSelf: 'flex-start', backgroundColor: `${C.primary}22`, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: `${C.primary}44` },
    badgeText: { fontSize: 12, fontWeight: '700', color: C.primary, letterSpacing: 0.4 },
    title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 15, color: C.textMuted, lineHeight: 23 },
  }), [C]);
  return (
    <View style={sh.root}>
      <Pressable style={sh.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={C.icon} />
        <Text style={sh.backText}>The Gameplan</Text>
      </Pressable>
      <View style={sh.badge}>
        <Text style={sh.badgeText}>Phase {phase.number}</Text>
      </View>
      <Text style={sh.title}>{phase.title}</Text>
      <Text style={sh.subtitle}>{phase.description}</Text>
    </View>
  );
}

function SLabel({ children }: { children: string }) {
  const C = useColors();
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.4, marginBottom: 14 }}>
      {children}
    </Text>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const C = useColors();
  return (
    <View style={[{
      backgroundColor: C.surface,
      borderRadius: 14, padding: 18,
    }, style]}>
      {children}
    </View>
  );
}

function EmptyState({
  icon, title, body, cta, onCta,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string; body: string; cta?: string; onCta?: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={32} color={C.icon} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {cta && onCta && (
        <Pressable onPress={onCta}>
          <LinearGradient
            colors={['#ff0000', '#aa00ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.5 }}
            style={s.emptyBtn}
          >
            <Text style={s.emptyBtnText}>{cta}</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>
  );
}

function CenteredLoader() {
  const C = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background }}>
      <ActivityIndicator color={C.primary} size="large" />
    </View>
  );
}

// ─── Phase 1: Know Your Value ─────────────────────────────────────────────────

function Phase1({ data, phase, onBack }: {
  data: ReturnType<typeof useAthleteData>; phase: Phase; onBack: () => void;
}) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { assessment } = data;
  const score = assessment?.v1_score ? Math.round(assessment.v1_score) : null;
  const tier = getTierInfo(score);

  const [displayScore, setDisplayScore] = useState(0);
  const [isScoreAnimating, setIsScoreAnimating] = useState(true);

  useEffect(() => {
    if (!score) { setDisplayScore(0); return; }
    setIsScoreAnimating(true);
    const duration = 1500;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayScore(Math.round(score * eased));
      if (progress >= 1) { clearInterval(timer); setIsScoreAnimating(false); }
    }, 16);
    return () => clearInterval(timer);
  }, [score]);

  const activeTier = getActiveTierIndex(displayScore);
  const numColor = score ? (isScoreAnimating ? scoreNumColor(displayScore) : C.text) : C.textDim;

  const categories = [
    { label: 'Athletic',    val: safeNum(assessment?.score_breakdown?.physical) ?? 0 },
    { label: 'Academic',    val: safeNum(assessment?.score_breakdown?.academic) ?? 0 },
    { label: 'Production',  val: safeNum(assessment?.score_breakdown?.production) ?? 0 },
    { label: 'Intangibles', val: safeNum(assessment?.score_breakdown?.intangibles) ?? 0 },
  ];
  const hasBreakdown = categories.some(c => c.val > 0);
  const showJuco = score !== null && score < 50;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />

      {score !== null ? (
          <LinearGradient
            colors={['#833AB4', '#E1306C', '#FCAF45']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.scoreGradientBorder}
          >
            <View style={s.scoreCardInner}>
              <Text style={s.scoreCardLabel}>V1 SCORE</Text>
              <Text style={[s.bigScore, { color: numColor }]}>{displayScore}</Text>
              <Text style={s.tierChip}>{tier.level}</Text>
              <View style={s.tierBarsRow}>
                {TIER_BARS.map((t, i) => (
                  <View key={t.label} style={s.tierBarCol}>
                    <View style={[s.tierBar, { backgroundColor: i <= activeTier ? C.text : C.surfaceAlt }]} />
                    <Text style={[s.tierBarLabel, { color: i === activeTier ? C.text : C.textDim, fontWeight: i === activeTier ? '800' : '400' }]}>
                      {t.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
      ) : (
        <Card>
          <EmptyState
            icon="analytics-outline"
            title="No score yet"
            body="Complete your V1 Assessment to calculate your recruiting score."
            cta="Take Assessment"
            onCta={() => router.push('/assessment' as any)}
          />
        </Card>
      )}

      {score !== null && (
        <Card>
          <SLabel>SCORE BREAKDOWN</SLabel>
          {hasBreakdown ? (
            <View style={{ gap: 14 }}>
              {categories.map(cat => (
                <View key={cat.label} style={s.breakRow}>
                  <Text style={s.breakLabel}>{cat.label}</Text>
                  <View style={s.breakTrack}>
                    <View style={[s.breakFill, { width: `${Math.min(cat.val, 100)}%` as any, backgroundColor: '#b2b2b2' }]} />
                  </View>
                  <Text style={s.breakScore}>{cat.val}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.dimText}>Detailed breakdown will appear after retaking your assessment.</Text>
          )}
        </Card>
      )}

      {score !== null && (() => {
        const strengthMap: Record<string, string> = {
          athletic: 'Athleticism', physical: 'Athleticism',
          production: 'Production', academic: 'Academics', intangibles: 'Intangibles',
        };
        const bd = assessment?.score_breakdown as Record<string, any> | null;
        const topEntry = bd
          ? Object.entries(bd)
              .filter(([k]) => ['athletic', 'physical', 'production', 'academic', 'intangibles'].includes(k))
              .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))[0]
          : null;
        const topLabel = topEntry ? strengthMap[topEntry[0]] : null;
        const topVal   = topEntry ? Math.round(Number(topEntry[1])) : null;
        const gateRes  = assessment?.gate_results as any;
        const failed   = (gateRes?.failedGates ?? []) as any[];
        const first    = failed[0];
        const flagText = first?.failures?.[0] ?? null;
        const flagCat  = first?.category ?? null;
        const devPot   = assessment?.development_potential as any;
        const devTraj  = devPot?.trajectory ?? null;
        const devReco  = devPot?.recommendation ?? null;
        const devPath  = assessment?.development_pathway as any;
        const topPri   = devPath?.priorities?.[0] ?? null;
        if (!topLabel && !flagText && !devTraj) return null;
        return (
          <Card>
            <SLabel>RECRUITING REALITY CHECK</SLabel>
            {topLabel && (
              <View style={s.rcRow}>
                <View style={[s.rcIcon, { backgroundColor: 'rgba(131,58,180,0.14)' }]}>
                  <Text style={[s.rcIconText, { color: '#a78bfa' }]}>↑</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rcTag, { color: '#a78bfa' }]}>TOP STRENGTH</Text>
                  <Text style={s.rcValue}>{topLabel}{topVal != null ? ` — ${topVal}%` : ''}</Text>
                  <Text style={s.rcDesc}>Your best recruiting leverage point. Lead with it.</Text>
                </View>
              </View>
            )}
            {flagText && (
              <View style={[s.rcRow, s.rcDivider]}>
                <View style={[s.rcIcon, { backgroundColor: 'rgba(225,48,108,0.12)' }]}>
                  <Text style={[s.rcIconText, { color: '#E1306C' }]}>!</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rcTag, { color: '#E1306C' }]}>KEY FLAG{flagCat ? ` — ${flagCat.toUpperCase()}` : ''}</Text>
                  <Text style={s.rcValue}>{flagText}</Text>
                  <Text style={s.rcDesc}>The biggest gap between you and coaches' requirements.</Text>
                </View>
              </View>
            )}
            {devTraj && (
              <View style={[s.rcRow, s.rcDivider]}>
                <View style={[s.rcIcon, { backgroundColor: 'rgba(252,175,69,0.12)' }]}>
                  <Text style={[s.rcIconText, { color: '#FCAF45' }]}>→</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rcTag, { color: '#d48a00' }]}>DEVELOPMENT PATH</Text>
                  <Text style={s.rcValue}>{devTraj}</Text>
                  {!!devReco && <Text style={s.rcDesc}>{devReco}</Text>}
                  {topPri && (
                    <View style={s.rcPriorityBox}>
                      <Text style={s.rcPriorityEyebrow}>TOP PRIORITY</Text>
                      <Text style={s.rcPriorityTitle}>{topPri.area}</Text>
                      <Text style={s.rcDesc}>{topPri.target}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </Card>
        );
      })()}

      {score !== null && tier.nextScore !== null && (
        <Card>
          <SLabel>RECRUITING GAP</SLabel>
          <View style={s.gapRow}>
            <View style={s.gapLeft}>
              <Text style={s.gapNum}>{tier.nextScore - score}</Text>
              <Text style={s.gapUnit}>pts needed</Text>
            </View>
            <View style={s.gapDivider} />
            <View style={{ flex: 1 }}>
              <Text style={s.gapNext}>→ {tier.nextLevel}</Text>
              <Text style={s.gapHint}>Improve your athletic and production scores for the highest-leverage path to the next tier.</Text>
            </View>
          </View>
        </Card>
      )}

      {showJuco && (
        <Card style={s.jucoCard}>
          <View style={s.jucoHeader}>
            <Ionicons name="school-outline" size={20} color={C.warning} />
            <Text style={s.jucoTitle}>JUCO Development Track</Text>
          </View>
          <Text style={s.jucoBody}>
            At your current score, junior college programs are your strongest pathway. JUCOs allow you to improve measurables, production, and academics over 1–2 years before transferring to a 4-year program. This is a legitimate route to FBS.
          </Text>
        </Card>
      )}

{score !== null && (
        <Card>
          <View style={s.retakeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.retakeTitle}>Retake Assessment</Text>
              <Text style={s.retakeBody}>Updated your stats, film, or academics? Retake to get a fresh V1 Score.</Text>
            </View>
            <Pressable
              style={({ pressed }) => [s.retakeBtn, pressed && { opacity: 0.8 }]}
              onPress={() => router.push('/assessment' as any)}
            >
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={s.retakeBtnTxt}>Retake</Text>
            </Pressable>
          </View>
        </Card>
      )}

      {score !== null && (
        <Pressable
          style={({ pressed }) => [s.primaryBtn, s.continueBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(tabs)/gameplan/2' as any)}
        >
          <LinearGradient colors={['#ff0000', '#ffbc00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={s.primaryBtnText}>Continue to Phase 2 →</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ─── Phase 2: Build Your Profile ──────────────────────────────────────────────

type P2Fields = {
  full_name: string; phone: string; bio: string;
  position: string; height: string; weight: string; graduation_year: string;
  gpa: string; sat_score: string; act_score: string; ncaa_id: string;
  high_school: string; city: string; state: string;
  hudl_video_link: string;
  guardian_name: string; guardian_relationship: string; guardian_phone: string; guardian_email: string;
};

const P2_EMPTY: P2Fields = {
  full_name: '', phone: '', bio: '',
  position: '', height: '', weight: '', graduation_year: '',
  gpa: '', sat_score: '', act_score: '', ncaa_id: '',
  high_school: '', city: '', state: '',
  hudl_video_link: '',
  guardian_name: '', guardian_relationship: '', guardian_phone: '', guardian_email: '',
};

type P2Row = {
  label: string; key: keyof P2Fields; multi?: boolean;
  placeholder?: string; hint?: string;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad' | 'phone-pad' | 'email-address' | 'url';
};

const P2_SECTIONS: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; rows: P2Row[] }[] = [
  { title: 'Personal', icon: 'person', rows: [
    { label: 'Full Name', key: 'full_name' },
    { label: 'Phone', key: 'phone', keyboardType: 'phone-pad' },
    { label: 'Bio', key: 'bio', multi: true,
      placeholder: "QB | Class of 2026 | Lincoln HS | Dallas, TX\n6'2\" / 205 lbs | 3.8 GPA\nUncommitted | Earning my opportunity",
      hint: 'Keep it short and keyword-rich — works for Twitter/X and Instagram.' },
  ]},
  { title: 'Athletic', icon: 'football', rows: [
    { label: 'Position', key: 'position' },
    { label: "Height (e.g. 6'2\")", key: 'height' },
    { label: 'Weight (lbs)', key: 'weight', keyboardType: 'numeric' },
    { label: 'Graduation Year', key: 'graduation_year', keyboardType: 'numeric' },
  ]},
  { title: 'Academic', icon: 'school', rows: [
    { label: 'GPA', key: 'gpa', keyboardType: 'decimal-pad' },
    { label: 'SAT Score', key: 'sat_score', keyboardType: 'numeric' },
    { label: 'ACT Score', key: 'act_score', keyboardType: 'numeric' },
    { label: 'NCAA Eligibility ID', key: 'ncaa_id', hint: 'Register at eligibilitycenter.org' },
  ]},
  { title: 'Location', icon: 'location', rows: [
    { label: 'High School', key: 'high_school' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state', placeholder: 'e.g. TX' },
  ]},
  { title: 'Film', icon: 'videocam', rows: [
    { label: 'Hudl Film Link', key: 'hudl_video_link', keyboardType: 'url',
      hint: 'Your highlight reel URL from hudl.com' },
  ]},
  { title: 'Guardian', icon: 'shield', rows: [
    { label: 'Guardian Name', key: 'guardian_name' },
    { label: 'Relationship', key: 'guardian_relationship', placeholder: 'e.g. Parent, Grandparent' },
    { label: 'Guardian Phone', key: 'guardian_phone', keyboardType: 'phone-pad' },
    { label: 'Guardian Email', key: 'guardian_email', keyboardType: 'email-address' },
  ]},
];

const P2_TRACKED: (keyof P2Fields)[] = [
  'full_name', 'phone', 'bio', 'position', 'graduation_year', 'height', 'weight',
  'high_school', 'city', 'gpa', 'ncaa_id', 'hudl_video_link',
  'guardian_name', 'guardian_relationship', 'guardian_phone', 'guardian_email',
];

function Phase2({ athlete, athleteId, phase, onBack, refresh }: {
  athlete: Record<string, unknown> | null;
  athleteId: string | undefined;
  phase: Phase;
  onBack: () => void;
  refresh: () => void;
}) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [fields, setFields] = useState<P2Fields>(P2_EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!athlete) return;
    const a = athlete;
    setFields({
      full_name:             String(a.full_name             ?? ''),
      phone:                 String(a.phone                 ?? ''),
      bio:                   String(a.bio                   ?? ''),
      position:              String(a.position              ?? ''),
      height:                String(a.height                ?? ''),
      weight:                a.weight          != null ? String(a.weight)          : '',
      graduation_year:       a.graduation_year != null ? String(a.graduation_year) : '',
      gpa:                   a.gpa             != null ? String(a.gpa)             : '',
      sat_score:             a.sat_score       != null ? String(a.sat_score)       : '',
      act_score:             a.act_score       != null ? String(a.act_score)       : '',
      ncaa_id:               String(a.ncaa_id               ?? ''),
      high_school:           String(a.high_school           ?? ''),
      city:                  String(a.city                  ?? ''),
      state:                 String(a.state                 ?? ''),
      hudl_video_link:       String(a.hudl_video_link       ?? ''),
      guardian_name:         String(a.guardian_name         ?? ''),
      guardian_relationship: String(a.guardian_relationship ?? ''),
      guardian_phone:        String(a.guardian_phone        ?? ''),
      guardian_email:        String(a.guardian_email        ?? ''),
    });
  }, [athlete]);

  const set = (k: keyof P2Fields) => (v: string) => {
    setFields(f => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const completed = P2_TRACKED.filter(k => { const v = fields[k]; return v !== null && v !== undefined && v !== ''; }).length;
  const pct = Math.round((completed / P2_TRACKED.length) * 100);

  const buildStarterBio = () => {
    const pos = fields.position || '[Position]';
    const yr  = fields.graduation_year ? `Class of ${fields.graduation_year}` : '[Class Year]';
    const sch = fields.high_school || '[High School]';
    const loc = fields.city && fields.state ? `${fields.city}, ${fields.state}` : fields.city || fields.state || '[City, State]';
    const ht  = fields.height || '[Height]';
    const wt  = fields.weight ? `${fields.weight} lbs` : '[Weight] lbs';
    const gpa = fields.gpa ? `${fields.gpa} GPA` : '[GPA] GPA';
    set('bio')(`${pos} | ${yr} | ${sch} | ${loc}\n${ht} / ${wt} | ${gpa}\nUncommitted | Earning my opportunity`);
  };

  const handleSave = async () => {
    if (!athleteId) return;
    setSaving(true);
    const updates: Record<string, string | number | null> = {};
    (Object.keys(fields) as (keyof P2Fields)[]).forEach(k => { updates[k] = fields[k] || null; });
    const { error } = await supabase.from('athletes').update(updates).eq('id', athleteId);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await refresh();
    setSaved(true);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <PhaseHeader phase={phase} onBack={onBack} />

        <Card>
          <SLabel>PROFILE COMPLETION</SLabel>
          <View style={s.completionRow}>
            <Text style={s.completionPct}>{pct}%</Text>
            <Text style={s.completionDesc}>{completed} of {P2_TRACKED.length} key fields complete</Text>
          </View>
          <View style={s.completionTrack}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.completionFill, { width: `${pct}%` as any }]} />
          </View>
        </Card>

        {P2_SECTIONS.map(section => (
          <View key={section.title} style={s.p2SectionWrap}>
            <View style={s.p2SectionHeader}>
              <Ionicons name={section.icon} size={13} color="#fff" />
              <Text style={s.p2SectionTitle}>{section.title.toUpperCase()}</Text>
            </View>
            <Card>
              {section.rows.map((row, idx) => {
                const isBio = row.key === 'bio';
                return (
                  <View key={row.key} style={[s.p2FieldRow, idx > 0 && s.p2FieldRowBorder]}>
                    <View style={s.p2FieldLabelRow}>
                      <Text style={s.p2Label}>{row.label}</Text>
                      {isBio && (
                        <Pressable onPress={buildStarterBio} style={s.p2StarterBtn}>
                          <Text style={s.p2StarterBtnText}>✦ Starter Bio</Text>
                        </Pressable>
                      )}
                    </View>
                    <TextInput
                      style={[s.p2Input, isBio && s.p2InputMulti]}
                      value={fields[row.key]}
                      onChangeText={set(row.key)}
                      placeholder={row.placeholder ?? row.label}
                      placeholderTextColor={C.textDim}
                      multiline={isBio}
                      textAlignVertical={isBio ? 'top' : 'auto'}
                      keyboardType={row.keyboardType ?? 'default'}
                      autoCapitalize={row.keyboardType === 'email-address' || row.keyboardType === 'url' ? 'none' : 'sentences'}
                    />
                    {row.hint ? <Text style={s.p2Hint}>{row.hint}</Text> : null}
                  </View>
                );
              })}
            </Card>
          </View>
        ))}

        <Pressable onPress={handleSave} disabled={saving} style={s.p2SaveWrap}>
          <LinearGradient
            colors={['#ff0000', '#aa00ff']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.p2SaveBtn, saving && { opacity: 0.6 }]}
          >
            <Text style={s.p2SaveBtnText}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Profile'}</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.primaryBtn, s.continueBtn, { marginTop: 10 }, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/(tabs)/gameplan/3' as any)}
        >
          <LinearGradient colors={['#ff0000', '#ffbc00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={s.primaryBtnText}>Continue to Phase 3 →</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Phase 3: Strategic Targeting ────────────────────────────────────────────

const DIV_COLORS: Record<string, string> = {
  FBS: '#006aff', FCS: '#00b4ff', D2: '#22C55E',
  D3: '#888888', NAIA: '#F59E0B', JUCO: '#EF4444',
};

function Phase3({ athleteId, targetListSaved: initialSaved, phase, onBack }: {
  athleteId: string | undefined; targetListSaved: boolean; phase: Phase; onBack: () => void;
}) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const [programs, setPrograms] = useState<ProgramMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSaved, setListSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    supabase
      .from('program_matches')
      .select('school_name, division, match_score, position_fit')
      .eq('athlete_id', athleteId)
      .order('match_score', { ascending: false })
      .limit(25)
      .then(({ data }: { data: unknown }) => {
        setPrograms((data as ProgramMatch[]) ?? []);
        setLoading(false);
      });
  }, [athleteId]);

  const handleConfirmList = async () => {
    if (!athleteId || listSaved) return;
    setSaving(true);
    await supabase.from('athletes').update({ target_list_saved_at: new Date().toISOString() }).eq('id', athleteId);
    setListSaved(true);
    setSaving(false);
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />

      <View style={s.rowBetween}>
        <Text style={s.countText}>{loading ? '—' : programs.length} Programs Found</Text>
      </View>

      {loading ? (
        <CenteredLoader />
      ) : programs.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="No matches yet"
          body="Program matches are generated from your V1 Score and position. Complete your assessment to get matched."
        />
      ) : (
        <View style={s.listCard}>
          {programs.map((p, i) => {
            const dc = DIV_COLORS[p.division] ?? C.textDim;
            return (
              <View key={i} style={[s.programRow, i < programs.length - 1 && s.programRowBorder]}>
                <View style={s.programTop}>
                  <Text style={s.programName}>{p.school_name}</Text>
                  <Text style={[s.matchNum, { color: C.text }]}>{p.match_score}</Text>
                </View>
                <View style={s.programBottom}>
                  <View style={[s.divBadge, { borderColor: dc }]}>
                    <Text style={[s.divBadgeText, { color: dc }]}>{p.division}</Text>
                  </View>
                  {p.position_fit ? <Text style={s.posFit}>{p.position_fit} fit</Text> : null}
                  <Text style={s.matchLabel}>match score</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {listSaved ? (
        <View style={[s.successCard, { alignItems: 'flex-start', gap: 10 }]}>
          <Ionicons name="checkmark-circle" size={24} color={C.success} />
          <Text style={s.successTitle}>Target List Locked In</Text>
          <Text style={s.successBody}>Phase 3 complete. Head to Phase 4 to start contacting coaches.</Text>
          <Pressable style={[s.primaryBtn, s.continueBtn]} onPress={() => router.push('/(tabs)/gameplan/4' as any)}>
            <LinearGradient colors={['#ff0000', '#ffbc00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={s.primaryBtnText}>Continue to Phase 4 →</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ backgroundColor: C.surface, borderRadius: 14, padding: 20, gap: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>Lock In Your Target List</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, lineHeight: 20 }}>
            Review your matched programs above, then confirm your list. This completes Phase 3 and unlocks Phase 4: Intelligent Outreach.
          </Text>
          <Pressable
            style={[s.primaryBtn, { opacity: saving || programs.length === 0 ? 0.6 : 1 }]}
            onPress={handleConfirmList}
            disabled={saving || programs.length === 0}
          >
            <Text style={s.primaryBtnText}>{saving ? 'Saving…' : 'Lock In My Target List →'}</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Phase 4: Intelligent Outreach ───────────────────────────────────────────

function Phase4({ athleteId, phase, onBack }: {
  athleteId: string | undefined; phase: Phase; onBack: () => void;
}) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const STATUS_META = useMemo(() => ({
    sent:       { label: 'Sent',       color: C.textDim },
    opened:     { label: 'Opened',     color: C.primary },
    replied:    { label: 'Replied',    color: C.success },
    bounced:    { label: 'Bounced',    color: C.error },
    interested: { label: 'Interested', color: C.warning },
  }), [C]);

  const [contacts, setContacts] = useState<CoachContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    supabase
      .from('coach_outreach')
      .select('id, coach_name, school_name, status')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: unknown }) => {
        setContacts((data as CoachContact[]) ?? []);
        setLoading(false);
      });
  }, [athleteId]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />
      <Pressable style={s.primaryBtn} onPress={() => router.push('/outreach/compose')}>
        <Ionicons name="add-circle-outline" size={18} color={C.white} />
        <Text style={s.primaryBtnText}>New Outreach</Text>
      </Pressable>
      {loading ? <CenteredLoader /> : contacts.length === 0 ? (
        <EmptyState icon="mail-outline" title="No outreach yet" body="Start contacting coaches at your matched programs. Each email you send is tracked here." />
      ) : (
        <Card>
          <SLabel>COACH CONTACTS</SLabel>
          {contacts.map((c, i) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.sent;
            return (
              <View key={c.id} style={[s.contactRow, i < contacts.length - 1 && s.contactRowBorder]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(c.coach_name ?? 'C')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.contactName}>{c.coach_name ?? 'Unknown Coach'}</Text>
                  <Text style={s.contactSchool}>{c.school_name ?? '—'}</Text>
                </View>
                <View style={[s.statusBadge, { borderColor: meta.color }]}>
                  <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Phase 5: Relationship Management ────────────────────────────────────────

function Phase5({ athleteId, phase, onBack }: {
  athleteId: string | undefined; phase: Phase; onBack: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const PIPELINE = useMemo(() => [
    { key: 'sent',       label: 'Contacted',  color: C.textDim },
    { key: 'opened',     label: 'Opened',     color: C.primary },
    { key: 'replied',    label: 'Replied',    color: C.success },
    { key: 'interested', label: 'Interested', color: C.warning },
  ], [C]);

  const [contacts, setContacts] = useState<CoachContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    supabase
      .from('coach_outreach')
      .select('id, coach_name, school_name, status')
      .eq('athlete_id', athleteId)
      .then(({ data }: { data: unknown }) => {
        setContacts((data as CoachContact[]) ?? []);
        setLoading(false);
      });
  }, [athleteId]);

  const counts = PIPELINE.reduce<Record<string, number>>((acc, stage) => {
    acc[stage.key] = contacts.filter(c => c.status === stage.key).length;
    return acc;
  }, {});

  const schoolMap = contacts.reduce<Record<string, number>>((acc, c) => {
    if (c.school_name) acc[c.school_name] = (acc[c.school_name] ?? 0) + 1;
    return acc;
  }, {});
  const leaderboard = Object.entries(schoolMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />
      {loading ? <CenteredLoader /> : (
        <>
          <Card>
            <SLabel>RECRUITING PIPELINE</SLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 4 }}>
                {PIPELINE.map(stage => (
                  <View key={stage.key} style={s.pipelineCol}>
                    <Text style={[s.pipelineStage, { color: stage.color }]}>{stage.label}</Text>
                    <Text style={s.pipelineCount}>{counts[stage.key] ?? 0}</Text>
                    <Text style={s.pipelineUnit}>schools</Text>
                    {contacts.filter(c => c.status === stage.key).slice(0, 3).map(c => (
                      <View key={c.id} style={s.pipelineItem}>
                        <Text style={s.pipelineItemText} numberOfLines={1}>{c.school_name ?? '—'}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </Card>

          <Card>
            <SLabel>MOMENTUM LEADERBOARD</SLabel>
            {leaderboard.length === 0 ? (
              <Text style={s.dimText}>No outreach data yet. Start contacting coaches to build momentum.</Text>
            ) : (
              leaderboard.map(([school, count], i) => (
                <View key={school} style={[s.leaderRow, i < leaderboard.length - 1 && s.leaderRowBorder]}>
                  <Text style={s.leaderRank}>#{i + 1}</Text>
                  <Text style={s.leaderSchool}>{school}</Text>
                  <Text style={s.leaderCount}>{count} contact{count !== 1 ? 's' : ''}</Text>
                </View>
              ))
            )}
          </Card>

          {contacts.length === 0 && (
            <EmptyState icon="people-outline" title="Pipeline empty" body="Use Phase 4 to start contacting coaches. Your pipeline data will appear here." />
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Phase 6: Execute the Timeline ───────────────────────────────────────────

const GROUP_ORDER = ['Today', 'This Week', 'Upcoming'] as const;

function Phase6({ athleteId, phase, onBack }: {
  athleteId: string | undefined; phase: Phase; onBack: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const PRIORITY_COLORS = useMemo(() => ({
    high:   C.error,
    medium: C.warning,
    low:    C.textDim,
  }), [C]);

  const [tasks, setTasks] = useState<RecruitingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    supabase
      .from('recruiting_tasks')
      .select('id, title, priority, due_date, is_complete')
      .eq('athlete_id', athleteId)
      .order('due_date', { ascending: true, nullsFirst: false } as any)
      .then(({ data }: { data: unknown }) => {
        setTasks((data as RecruitingTask[]) ?? []);
        setLoading(false);
      });
  }, [athleteId]);

  const toggleTask = async (id: string, current: boolean) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_complete: !current } : t));
    await supabase.from('recruiting_tasks').update({ is_complete: !current }).eq('id', id);
  };

  const pending = tasks.filter(t => !t.is_complete);
  const done = tasks.filter(t => t.is_complete);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />
      {loading ? <CenteredLoader /> : tasks.length === 0 ? (
        <EmptyState icon="calendar-outline" title="No tasks yet" body="Your recruiting tasks and deadlines will appear here once your timeline is set up." />
      ) : (
        <>
          {GROUP_ORDER.map(group => {
            const items = pending.filter(t => taskGroup(t) === group);
            if (items.length === 0) return null;
            return (
              <View key={group}>
                <Text style={s.taskGroupLabel}>{group}</Text>
                <Card>
                  {items.map((task, i) => (
                    <Pressable key={task.id} style={[s.taskRow, i < items.length - 1 && s.taskRowBorder]} onPress={() => toggleTask(task.id, task.is_complete)}>
                      <Ionicons name="ellipse-outline" size={22} color={C.icon} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.taskTitle}>{task.title}</Text>
                        {task.due_date && <Text style={s.taskDue}>{formatDueDate(task.due_date)}</Text>}
                      </View>
                      <View style={[s.priorityBadge, { borderColor: PRIORITY_COLORS[task.priority] ?? C.textDim }]}>
                        <Text style={[s.priorityText, { color: PRIORITY_COLORS[task.priority] ?? C.textDim }]}>{task.priority}</Text>
                      </View>
                    </Pressable>
                  ))}
                </Card>
              </View>
            );
          })}

          {done.length > 0 && (
            <View>
              <Text style={s.taskGroupLabel}>Completed ({done.length})</Text>
              <Card>
                {done.map((task, i) => (
                  <Pressable key={task.id} style={[s.taskRow, s.taskRowDone, i < done.length - 1 && s.taskRowBorder]} onPress={() => toggleTask(task.id, task.is_complete)}>
                    <Ionicons name="checkmark-circle" size={22} color={C.icon} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.taskTitle, s.taskTitleDone]}>{task.title}</Text>
                    </View>
                  </Pressable>
                ))}
              </Card>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export default function PhaseDetailScreen() {
  const { phase: phaseParam } = useLocalSearchParams<{ phase: string }>();
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const phaseNumber = Number(phaseParam);
  const phase = PHASES.find(p => p.number === phaseNumber);

  const athleteData = useAthleteData();
  const onBack = () => router.back();

  if (athleteData.loading) return <CenteredLoader />;

  if (!phase) {
    return (
      <View style={s.center}>
        <Text style={{ color: C.textMuted }}>Phase not found.</Text>
      </View>
    );
  }

  switch (phaseNumber) {
    case 1: return <Phase1 data={athleteData} phase={phase} onBack={onBack} />;
    case 2: return <Phase2 athlete={athleteData.athlete as Record<string, unknown> | null} athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} refresh={athleteData.refresh} />;
    case 3: return <Phase3 athleteId={athleteData.athlete?.id} targetListSaved={!!athleteData.athlete?.target_list_saved_at} phase={phase} onBack={onBack} />;
    case 4: return <Phase4 athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} />;
    case 5: return <Phase5 athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} />;
    case 6: return <Phase6 athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} />;
    default:
      return (
        <View style={s.center}>
          <Text style={{ color: C.textMuted }}>Phase not found.</Text>
        </View>
      );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 48, paddingHorizontal: 20, gap: 14 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background, padding: 32 },

    dimText: { fontSize: 14, color: C.textDim, lineHeight: 21 },

    // Score card
    scoreGradientBorder: { borderRadius: 17, padding: 1.5 },
    scoreCardInner: { backgroundColor: C.scoreCard, borderRadius: 16, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20, alignItems: 'center' },
    scoreCardLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.6, marginBottom: 14 },
    bigScore: { fontSize: 96, fontWeight: '900', letterSpacing: -5, lineHeight: 88, marginBottom: 12 },
    tierChip: { fontSize: 13, fontWeight: '700', color: C.textMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 20 },
    tierBarsRow: { flexDirection: 'row', gap: 6, width: '100%' },
    tierBarCol: { flex: 1, alignItems: 'center', gap: 5 },
    tierBar: { width: '100%', height: 3, borderRadius: 2 },
    tierBarLabel: { fontSize: 9, letterSpacing: 0.2 },

    // Breakdown bars
    breakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    breakLabel: { width: 90, fontSize: 13, color: C.textMuted },
    breakTrack: { flex: 1, height: 5, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
    breakFill: { height: '100%', borderRadius: 3 },
    breakScore: { width: 42, fontSize: 13, fontWeight: '700', color: C.text, textAlign: 'right' },
    breakMax: { fontSize: 11, fontWeight: '400', color: C.textDim },

    // Gap
    gapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
    gapLeft: { alignItems: 'center', minWidth: 68 },
    gapNum: { fontSize: 38, fontWeight: '900', color: C.text, letterSpacing: -2 },
    gapUnit: { fontSize: 11, color: C.textDim, fontWeight: '600', letterSpacing: 0.3 },
    gapDivider: { width: 1, height: 52, backgroundColor: C.border },
    gapNext: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 6 },
    gapHint: { fontSize: 13, color: C.textDim, lineHeight: 19 },

    // Recruiting Reality Check
    rcRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingBottom: 14 },
    rcDivider: { paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
    rcIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    rcIconText: { fontSize: 16, fontWeight: '800' },
    rcTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 3 },
    rcValue: { fontSize: 14, fontWeight: '800', color: C.text, lineHeight: 19, marginBottom: 4 },
    rcDesc: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
    rcPriorityBox: { marginTop: 10, backgroundColor: C.surfaceAlt, borderRadius: 8, padding: 10, gap: 3 },
    rcPriorityEyebrow: { fontSize: 9, fontWeight: '700', color: C.textDim, letterSpacing: 0.8, textTransform: 'uppercase' },
    rcPriorityTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },

    // JUCO
    jucoCard: { borderColor: `${C.warning}44`, backgroundColor: `${C.warning}0A` },
    jucoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    jucoTitle: { fontSize: 15, fontWeight: '700', color: C.warning },
    jucoBody: { fontSize: 13, color: C.textMuted, lineHeight: 20 },

    // Playbooks promo
    pbCard:      { borderRadius: 14, padding: 18, gap: 10 },
    pbEyebrow:   { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 },
    pbTitle:     { fontSize: 15, fontWeight: '800', color: '#fff', lineHeight: 21 },
    pbSub:       { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },
    pbRows:      { gap: 8 },
    pbRow:       { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 10 },
    pbIconBox:   { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' as const, justifyContent: 'center' as const },
    pbRowLabel:  { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 1 },
    pbRowSub:    { fontSize: 11, color: 'rgba(255,255,255,0.55)' },
    pbRowPrice:  { fontSize: 12, fontWeight: '800', color: '#fff', flexShrink: 0 },
    pbBtn:       { backgroundColor: '#fff', borderRadius: 100, paddingVertical: 12, alignItems: 'center' as const },
    pbBtnText:   { fontSize: 13, fontWeight: '800', color: '#833AB4' },

    // Retake assessment
    retakeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    retakeTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
    retakeBody: { fontSize: 12, color: C.textMuted, lineHeight: 17 },
    retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: `${C.primary}22` },
    retakeBtnTxt: { fontSize: 13, fontWeight: '700', color: C.primary },

    // Completion
    completionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
    completionPct: { fontSize: 38, fontWeight: '900', color: C.text, letterSpacing: -2 },
    completionDesc: { fontSize: 13, color: C.textMuted },
    completionTrack: { height: 5, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
    completionFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },

    // Phase 2 inline form
    p2SectionWrap: { marginBottom: 18 },
    p2SectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    p2SectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.0, color: C.textMuted },
    p2FieldRow: { paddingHorizontal: 16, paddingVertical: 12 },
    p2FieldRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    p2FieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    p2Label: { fontSize: 12, fontWeight: '500', color: C.textMuted },
    p2Input: { fontSize: 15, color: C.text, paddingVertical: 0 },
    p2InputMulti: { height: 80, textAlignVertical: 'top' as const },
    p2Hint: { fontSize: 11, color: C.textDim, marginTop: 4, lineHeight: 16 },
    p2StarterBtn: { backgroundColor: `${C.primary}22`, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
    p2StarterBtnText: { fontSize: 11, fontWeight: '700', color: C.primary },
    p2SaveWrap: { marginBottom: 12 },
    p2SaveBtn: { height: 52, borderRadius: 14, alignItems: 'center' as const, justifyContent: 'center' as const },
    p2SaveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

    // Checklist
    checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    checkRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
    checkCircleDone: { backgroundColor: C.primary, borderColor: C.primary },
    checkLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
    checkVal: { fontSize: 12, color: C.textMuted },
    checkEmpty: { fontSize: 12, color: C.textDim },

    // Success
    successCard: { alignItems: 'center', gap: 8, borderColor: `${C.success}44`, backgroundColor: `${C.success}0A` },
    successTitle: { fontSize: 16, fontWeight: '700', color: C.success },
    successBody: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

    // Programs
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    countText: { fontSize: 15, fontWeight: '700', color: C.text },
    listCard: { backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden' },
    programRow: { padding: 16 },
    programRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    programTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    programName: { fontSize: 15, fontWeight: '700', color: C.text, flex: 1 },
    matchNum: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
    programBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    divBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
    divBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
    posFit: { fontSize: 12, color: C.textDim },
    matchLabel: { fontSize: 12, color: C.textDim },

    // Outreach
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 2 },
    continueBtn: { backgroundColor: 'transparent', overflow: 'hidden' },
    primaryBtnText: { fontSize: 15, fontWeight: '700', color: C.white },
    contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    contactRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${C.primary}22`, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 15, fontWeight: '700', color: C.primary },
    contactName: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
    contactSchool: { fontSize: 12, color: C.textMuted },
    statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

    // Pipeline
    pipelineCol: { width: 130, backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 12 },
    pipelineStage: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
    pipelineCount: { fontSize: 30, fontWeight: '900', color: C.text, letterSpacing: -1 },
    pipelineUnit: { fontSize: 11, color: C.textDim, marginBottom: 10 },
    pipelineItem: { backgroundColor: C.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
    pipelineItemText: { fontSize: 11, color: C.textMuted },

    // Leaderboard
    leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    leaderRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    leaderRank: { fontSize: 13, fontWeight: '800', color: C.textDim, width: 28 },
    leaderSchool: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    leaderCount: { fontSize: 12, color: C.textMuted },

    // Tasks
    taskGroupLabel: { fontSize: 11, fontWeight: '700', color: C.textDim, letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
    taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
    taskRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
    taskRowDone: { opacity: 0.5 },
    taskTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
    taskTitleDone: { textDecorationLine: 'line-through', color: C.textDim },
    taskDue: { fontSize: 12, color: C.textMuted },
    priorityBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
    priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'capitalize' },

    // Empty
    empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: C.textMuted, textAlign: 'center' },
    emptyBody: { fontSize: 14, color: C.textDim, textAlign: 'center', lineHeight: 21 },
    emptyBtn: { marginTop: 8, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
    emptyBtnText: { fontSize: 14, fontWeight: '700', color: C.white },
  });
}
