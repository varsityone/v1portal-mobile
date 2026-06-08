import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { useSubscription, Plan } from '../../../hooks/useSubscription';
import { PHASES, isPhaseUnlocked, Phase } from '../../../constants/Phases';
import { Colors, GRADIENT, TIER_BARS, scoreNumColor } from '../../../constants/Colors';

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

// ─── Shared sub-components ────────────────────────────────────────────────────

function PhaseHeader({ phase, onBack }: { phase: Phase; onBack: () => void }) {
  return (
    <View style={sh.root}>
      <Pressable style={sh.back} onPress={onBack}>
        <Ionicons name="arrow-back" size={20} color={Colors.textMuted} />
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
const sh = StyleSheet.create({
  root: { marginBottom: 20 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 15, color: Colors.textMuted },
  badge: { alignSelf: 'flex-start', backgroundColor: `${Colors.primary}22`, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: `${Colors.primary}44` },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.primary, letterSpacing: 0.4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textMuted, lineHeight: 23 },
});

function SLabel({ children }: { children: string }) {
  return <Text style={s.sLabel}>{children}</Text>;
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={32} color={Colors.textDim} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyBody}>{body}</Text>
      {cta && onCta && (
        <Pressable style={s.emptyBtn} onPress={onCta}>
          <Text style={s.emptyBtnText}>{cta}</Text>
        </Pressable>
      )}
    </View>
  );
}

function CenteredLoader() {
  return (
    <View style={s.center}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}

function LockedView({ phase }: { phase: Phase }) {
  const router = useRouter();
  const isElite = phase.upgradeTo === 'elite';
  return (
    <View style={[s.scroll, s.center]}>
      <View style={s.lockCircle}>
        <Ionicons name="lock-closed" size={28} color={Colors.textMuted} />
      </View>
      <Text style={s.lockTitle}>Phase {phase.number} Locked</Text>
      <Text style={s.lockDesc}>
        Requires a{' '}
        <Text style={{ color: isElite ? '#F59E0B' : Colors.primary, fontWeight: '700' }}>
          {isElite ? 'Elite' : 'Pro'}
        </Text>{' '}
        plan to access.
      </Text>
      <Pressable style={[s.upgradeBtn, isElite && { backgroundColor: '#F59E0B' }]} onPress={() => router.push('/upgrade')}>
        <Text style={s.upgradeBtnText}>
          Upgrade to {isElite ? 'Elite' : 'Pro'} →
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Phase 1: Know Your Value ─────────────────────────────────────────────────

function Phase1({
  data,
  phase,
  onBack,
}: {
  data: ReturnType<typeof useAthleteData>;
  phase: Phase;
  onBack: () => void;
}) {
  const { assessment } = data;
  const score = assessment?.v1_score ? Math.round(assessment.v1_score) : null;
  const tier = getTierInfo(score);

  const categories = [
    { label: 'Athletic',    val: safeNum(assessment?.score_breakdown?.physical),    max: 40 },
    { label: 'Academic',    val: safeNum(assessment?.score_breakdown?.academic),    max: 35 },
    { label: 'Production',  val: safeNum(assessment?.score_breakdown?.production),  max: 15 },
    { label: 'Intangibles', val: safeNum(assessment?.score_breakdown?.intangibles), max: 10 },
  ];
  const hasBreakdown = categories.some(c => c.val > 0);
  const showJuco = score !== null && score < 50;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />

      {/* Score — gradient-border card matching web ScoreAnimator */}
      {score !== null ? (() => {
        const activeTier = getActiveTierIndex(score);
        return (
          <LinearGradient
            colors={['#833AB4', '#E1306C', '#FCAF45']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.scoreGradientBorder}
          >
            <View style={s.scoreCardInner}>
              <Text style={s.scoreCardLabel}>V1 SCORE</Text>
              <Text style={[s.bigScore, { color: scoreNumColor(score) }]}>{score}</Text>
              <Text style={s.tierChip}>{tier.level}</Text>
              {/* Tier bars */}
              <View style={s.tierBarsRow}>
                {TIER_BARS.map((t, i) => (
                  <View key={t.label} style={s.tierBarCol}>
                    <View style={[
                      s.tierBar,
                      { backgroundColor: i <= activeTier ? t.color : 'rgba(255,255,255,0.1)' },
                    ]} />
                    <Text style={[
                      s.tierBarLabel,
                      { color: i === activeTier ? t.color : 'rgba(255,255,255,0.28)', fontWeight: i === activeTier ? '800' : '400' },
                    ]}>{t.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        );
      })() : (
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

      {/* Breakdown */}
      {score !== null && (
        <Card>
          <SLabel>SCORE BREAKDOWN</SLabel>
          {hasBreakdown ? (
            <View style={{ gap: 14 }}>
              {categories.map(cat => {
                const pct = Math.min((cat.val / cat.max) * 100, 100);
                return (
                  <View key={cat.label} style={s.breakRow}>
                    <Text style={s.breakLabel}>{cat.label}</Text>
                    <View style={s.breakTrack}>
                      <LinearGradient
                        colors={GRADIENT}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[s.breakFill, { width: `${pct}%` }]}
                      />
                    </View>
                    <Text style={s.breakScore}>
                      {cat.val}
                      <Text style={s.breakMax}>/{cat.max}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={s.dimText}>
              Detailed breakdown will appear after retaking your assessment.
            </Text>
          )}
        </Card>
      )}

      {/* Recruiting gap */}
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
              <Text style={s.gapHint}>
                Improve your athletic and production scores for the highest-leverage path to the next tier.
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* JUCO track */}
      {showJuco && (
        <Card style={s.jucoCard}>
          <View style={s.jucoHeader}>
            <Ionicons name="school-outline" size={20} color={Colors.warning} />
            <Text style={s.jucoTitle}>JUCO Development Track</Text>
          </View>
          <Text style={s.jucoBody}>
            At your current score, junior college programs are your strongest pathway. JUCOs allow you to improve measurables, production, and academics over 1–2 years before transferring to a 4-year program. This is a legitimate route to FBS.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Phase 2: Build Your Profile ──────────────────────────────────────────────

const PROFILE_FIELDS: {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'position',           label: 'Position',        icon: 'football-outline' },
  { key: 'graduation_year',    label: 'Graduation Year', icon: 'calendar-outline' },
  { key: 'height',             label: 'Height',          icon: 'resize-outline' },
  { key: 'weight',             label: 'Weight',          icon: 'barbell-outline' },
  { key: 'gpa',                label: 'GPA',             icon: 'school-outline' },
  { key: 'highlight_film_url', label: 'Highlight Film',  icon: 'videocam-outline' },
];

function Phase2({
  athlete,
  phase,
  onBack,
}: {
  athlete: Record<string, unknown> | null;
  phase: Phase;
  onBack: () => void;
}) {
  const router = useRouter();
  const completed = PROFILE_FIELDS.filter(f => {
    const v = athlete?.[f.key];
    return v !== null && v !== undefined && v !== '';
  }).length;
  const pct = Math.round((completed / PROFILE_FIELDS.length) * 100);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />

      <Card>
        <SLabel>PROFILE COMPLETION</SLabel>
        <View style={s.completionRow}>
          <Text style={s.completionPct}>{pct}%</Text>
          <Text style={s.completionDesc}>{completed} of {PROFILE_FIELDS.length} fields complete</Text>
        </View>
        <View style={s.completionTrack}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.completionFill, { width: `${pct}%` }]}
          />
        </View>
      </Card>

      <Card>
        <SLabel>PROFILE FIELDS</SLabel>
        {PROFILE_FIELDS.map((field, i) => {
          const val = athlete?.[field.key];
          const done = val !== null && val !== undefined && val !== '';
          return (
            <Pressable
              key={field.key}
              style={({ pressed }) => [
                s.checkRow,
                i < PROFILE_FIELDS.length - 1 && s.checkRowBorder,
                pressed && { backgroundColor: Colors.surfaceAlt },
              ]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={[s.checkCircle, done && s.checkCircleDone]}>
                <Ionicons
                  name={done ? 'checkmark' : 'ellipse-outline'}
                  size={15}
                  color={done ? Colors.white : Colors.textDim}
                />
              </View>
              <Ionicons name={field.icon} size={16} color={done ? Colors.textMuted : Colors.textDim} />
              <View style={{ flex: 1 }}>
                <Text style={[s.checkLabel, !done && { color: Colors.textMuted }]}>{field.label}</Text>
                {done ? (
                  <Text style={s.checkVal} numberOfLines={1}>
                    {field.key === 'highlight_film_url' ? 'Film added ✓' : String(val)}
                  </Text>
                ) : (
                  <Text style={s.checkEmpty}>Not set — tap to add</Text>
                )}
              </View>
              {!done && <Ionicons name="chevron-forward" size={14} color={Colors.textDim} />}
            </Pressable>
          );
        })}
      </Card>

      {pct === 100 && (
        <Card style={s.successCard}>
          <Ionicons name="trophy-outline" size={26} color={Colors.success} />
          <Text style={s.successTitle}>Profile Complete</Text>
          <Text style={s.successBody}>
            Coaches can now see your full measurables, academics, and film.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

// ─── Phase 3: Strategic Targeting ────────────────────────────────────────────

const DIV_COLORS: Record<string, string> = {
  FBS: '#006aff', FCS: '#00b4ff', D2: '#22C55E',
  D3: '#888888', NAIA: '#F59E0B', JUCO: '#EF4444',
};

function Phase3({
  athleteId,
  isElite,
  phase,
  onBack,
}: {
  athleteId: string | undefined;
  isElite: boolean;
  phase: Phase;
  onBack: () => void;
}) {
  const [programs, setPrograms] = useState<ProgramMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) { setLoading(false); return; }
    let q = supabase
      .from('program_matches')
      .select('school_name, division, match_score, position_fit')
      .eq('athlete_id', athleteId)
      .order('match_score', { ascending: false });
    if (!isElite) q = (q as any).limit(20);
    q.then(({ data }: { data: unknown }) => {
      setPrograms((data as ProgramMatch[]) ?? []);
      setLoading(false);
    });
  }, [athleteId, isElite]);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
      <PhaseHeader phase={phase} onBack={onBack} />

      <View style={s.rowBetween}>
        <Text style={s.countText}>{loading ? '—' : programs.length} Programs Found</Text>
        {!isElite && (
          <View style={s.planChip}>
            <Text style={s.planChipText}>PRO · MAX 20</Text>
          </View>
        )}
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
            const dc = DIV_COLORS[p.division] ?? Colors.textDim;
            return (
              <View key={i} style={[s.programRow, i < programs.length - 1 && s.programRowBorder]}>
                <View style={s.programTop}>
                  <Text style={s.programName}>{p.school_name}</Text>
                  <Text style={[s.matchNum, { color: getScoreColor(p.match_score) }]}>
                    {p.match_score}
                  </Text>
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
    </ScrollView>
  );
}

// ─── Phase 4: Intelligent Outreach ───────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  sent:       { label: 'Sent',       color: Colors.textDim },
  opened:     { label: 'Opened',     color: Colors.primary },
  replied:    { label: 'Replied',    color: Colors.success },
  bounced:    { label: 'Bounced',    color: Colors.error },
  interested: { label: 'Interested', color: Colors.warning },
};

function Phase4({
  athleteId,
  phase,
  onBack,
}: {
  athleteId: string | undefined;
  phase: Phase;
  onBack: () => void;
}) {
  const router = useRouter();
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

      <Pressable
        style={s.primaryBtn}
        onPress={() => router.push('/outreach/compose')}
      >
        <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
        <Text style={s.primaryBtnText}>New Outreach</Text>
      </Pressable>

      {loading ? (
        <CenteredLoader />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon="mail-outline"
          title="No outreach yet"
          body="Start contacting coaches at your matched programs. Each email you send is tracked here."
        />
      ) : (
        <Card>
          <SLabel>COACH CONTACTS</SLabel>
          {contacts.map((c, i) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.sent;
            return (
              <View key={c.id} style={[s.contactRow, i < contacts.length - 1 && s.contactRowBorder]}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(c.coach_name ?? 'C')[0].toUpperCase()}
                  </Text>
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

const PIPELINE = [
  { key: 'sent',       label: 'Contacted',  color: Colors.textDim },
  { key: 'opened',     label: 'Opened',     color: Colors.primary },
  { key: 'replied',    label: 'Replied',    color: Colors.success },
  { key: 'interested', label: 'Interested', color: Colors.warning },
];

function Phase5({
  athleteId,
  phase,
  onBack,
}: {
  athleteId: string | undefined;
  phase: Phase;
  onBack: () => void;
}) {
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

      {loading ? (
        <CenteredLoader />
      ) : (
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
                    {contacts
                      .filter(c => c.status === stage.key)
                      .slice(0, 3)
                      .map(c => (
                        <View key={c.id} style={s.pipelineItem}>
                          <Text style={s.pipelineItemText} numberOfLines={1}>
                            {c.school_name ?? '—'}
                          </Text>
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
            <EmptyState
              icon="people-outline"
              title="Pipeline empty"
              body="Use Phase 4 to start contacting coaches. Your pipeline data will appear here."
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Phase 6: Execute the Timeline ───────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  high: Colors.error,
  medium: Colors.warning,
  low: Colors.textDim,
};

const GROUP_ORDER = ['Today', 'This Week', 'Upcoming'] as const;

function Phase6({
  athleteId,
  phase,
  onBack,
}: {
  athleteId: string | undefined;
  phase: Phase;
  onBack: () => void;
}) {
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

      {loading ? (
        <CenteredLoader />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No tasks yet"
          body="Your recruiting tasks and deadlines will appear here once your timeline is set up."
        />
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
                    <Pressable
                      key={task.id}
                      style={[s.taskRow, i < items.length - 1 && s.taskRowBorder]}
                      onPress={() => toggleTask(task.id, task.is_complete)}
                    >
                      <Ionicons name="ellipse-outline" size={22} color={Colors.textDim} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.taskTitle}>{task.title}</Text>
                        {task.due_date && <Text style={s.taskDue}>{formatDueDate(task.due_date)}</Text>}
                      </View>
                      <View style={[s.priorityBadge, { borderColor: PRIORITY_COLORS[task.priority] ?? Colors.textDim }]}>
                        <Text style={[s.priorityText, { color: PRIORITY_COLORS[task.priority] ?? Colors.textDim }]}>
                          {task.priority}
                        </Text>
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
                  <Pressable
                    key={task.id}
                    style={[s.taskRow, s.taskRowDone, i < done.length - 1 && s.taskRowBorder]}
                    onPress={() => toggleTask(task.id, task.is_complete)}
                  >
                    <Ionicons name="checkmark-circle" size={22} color={Colors.textDim} />
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
  const phaseNumber = Number(phaseParam);
  const phase = PHASES.find(p => p.number === phaseNumber);

  const { plan, loading: subLoading } = useSubscription();
  const athleteData = useAthleteData();
  const isLoading = subLoading || athleteData.loading;
  const isUnlocked = phase ? isPhaseUnlocked(phase, plan) : false;
  const onBack = () => router.back();

  if (isLoading) return <CenteredLoader />;

  if (!phase) {
    return (
      <View style={s.center}>
        <Text style={{ color: Colors.textMuted }}>Phase not found.</Text>
      </View>
    );
  }

  if (!isUnlocked) return <LockedView phase={phase} />;

  switch (phaseNumber) {
    case 1:
      return <Phase1 data={athleteData} phase={phase} onBack={onBack} />;
    case 2:
      return <Phase2 athlete={athleteData.athlete as Record<string, unknown> | null} phase={phase} onBack={onBack} />;
    case 3:
      return <Phase3 athleteId={athleteData.athlete?.id} isElite={plan === 'elite'} phase={phase} onBack={onBack} />;
    case 4:
      return <Phase4 athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} />;
    case 5:
      return <Phase5 athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} />;
    case 6:
      return <Phase6 athleteId={athleteData.athlete?.id} phase={phase} onBack={onBack} />;
    default:
      return (
        <View style={s.center}>
          <Text style={{ color: Colors.textMuted }}>Phase not found.</Text>
        </View>
      );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { paddingTop: 20, paddingBottom: 48, paddingHorizontal: 20, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: 32 },

  sLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.4,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
  },
  dimText: { fontSize: 14, color: Colors.textDim, lineHeight: 21 },

  // Locked
  lockCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  lockTitle: { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  lockDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  upgradeBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  upgradeBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  // Score card — gradient border technique
  scoreGradientBorder: { borderRadius: 17, padding: 1.5 },
  scoreCardInner: {
    backgroundColor: Colors.scoreCard,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  scoreCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.6,
    marginBottom: 14,
  },
  bigScore: {
    fontSize: 96,
    fontWeight: '900',
    letterSpacing: -5,
    lineHeight: 88,
    marginBottom: 12,
  },
  tierChip: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  tierBarsRow: { flexDirection: 'row', gap: 6, width: '100%' },
  tierBarCol: { flex: 1, alignItems: 'center', gap: 5 },
  tierBar: { width: '100%', height: 3, borderRadius: 2 },
  tierBarLabel: { fontSize: 9, letterSpacing: 0.2 },

  // Breakdown bars
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakLabel: { width: 90, fontSize: 13, color: Colors.textMuted },
  breakTrack: { flex: 1, height: 5, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  breakFill: { height: '100%', borderRadius: 3 },
  breakScore: { width: 42, fontSize: 13, fontWeight: '700', color: Colors.text, textAlign: 'right' },
  breakMax: { fontSize: 11, fontWeight: '400', color: Colors.textDim },

  // Gap
  gapRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  gapLeft: { alignItems: 'center', minWidth: 68 },
  gapNum: { fontSize: 38, fontWeight: '900', color: Colors.text, letterSpacing: -2 },
  gapUnit: { fontSize: 11, color: Colors.textDim, fontWeight: '600', letterSpacing: 0.3 },
  gapDivider: { width: 1, height: 52, backgroundColor: Colors.border },
  gapNext: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  gapHint: { fontSize: 13, color: Colors.textDim, lineHeight: 19 },

  // JUCO
  jucoCard: { borderColor: `${Colors.warning}44`, backgroundColor: `${Colors.warning}0A` },
  jucoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  jucoTitle: { fontSize: 15, fontWeight: '700', color: Colors.warning },
  jucoBody: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },

  // Completion
  completionRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  completionPct: { fontSize: 38, fontWeight: '900', color: Colors.text, letterSpacing: -2 },
  completionDesc: { fontSize: 13, color: Colors.textMuted },
  completionTrack: { height: 5, backgroundColor: Colors.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
  completionFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  // Checklist
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  checkRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  checkCircleDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  checkVal: { fontSize: 12, color: Colors.textMuted },
  checkEmpty: { fontSize: 12, color: Colors.textDim },

  // Success
  successCard: { alignItems: 'center', gap: 8, borderColor: `${Colors.success}44`, backgroundColor: `${Colors.success}0A` },
  successTitle: { fontSize: 16, fontWeight: '700', color: Colors.success },
  successBody: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Programs
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  countText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  planChip: { backgroundColor: Colors.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  planChipText: { fontSize: 10, fontWeight: '700', color: Colors.textDim, letterSpacing: 0.5 },
  listCard: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, overflow: 'hidden' },
  programRow: { padding: 16 },
  programRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  programTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  programName: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  matchNum: { fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  programBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  divBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  posFit: { fontSize: 12, color: Colors.textDim },
  matchLabel: { fontSize: 12, color: Colors.textDim },

  // Outreach
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, marginBottom: 2 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  contactRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${Colors.primary}22`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  contactName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  contactSchool: { fontSize: 12, color: Colors.textMuted },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  // Pipeline
  pipelineCol: { width: 130, backgroundColor: Colors.surfaceAlt, borderRadius: 10, padding: 12 },
  pipelineStage: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  pipelineCount: { fontSize: 30, fontWeight: '900', color: Colors.text, letterSpacing: -1 },
  pipelineUnit: { fontSize: 11, color: Colors.textDim, marginBottom: 10 },
  pipelineItem: { backgroundColor: Colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  pipelineItemText: { fontSize: 11, color: Colors.textMuted },

  // Leaderboard
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  leaderRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  leaderRank: { fontSize: 13, fontWeight: '800', color: Colors.textDim, width: 28 },
  leaderSchool: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  leaderCount: { fontSize: 12, color: Colors.textMuted },

  // Tasks
  taskGroupLabel: { fontSize: 11, fontWeight: '700', color: Colors.textDim, letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  taskRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  taskRowDone: { opacity: 0.5 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textDim },
  taskDue: { fontSize: 12, color: Colors.textMuted },
  priorityBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'capitalize' },

  // Empty
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },
  emptyBody: { fontSize: 14, color: Colors.textDim, textAlign: 'center', lineHeight: 21 },
  emptyBtn: { marginTop: 8, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
});
