import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';
import { DIVISION_ORDER, DIVISION_LABELS, Division } from '../../constants/RecruitingLevels';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartPoint { date: string; views: number; }

interface ProfileViewStats {
  total: number;
  unique: number;
  last7Days: number;
  last30Days: number;
  chartData: ChartPoint[];
}

interface MatchActivity {
  reviewed: number;
  liked: number;
  matched: number;
  messagesSent: number;
  coachesWhoReplied: number;
}

interface DivStat { liked: number; matched: number; messaged: number; }

interface CoachMomentum {
  name: string;
  school: string;
  division: string;
  messagesSent: number;
  messagesReceived: number;
}

interface RecruitingData {
  divStats: Record<Division, DivStat>;
  avgResponseTime: Partial<Record<Division, number>>;
  coachMomentum: CoachMomentum[];
}

// ── Bezier path ───────────────────────────────────────────────────────────────

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

// ── Line chart ────────────────────────────────────────────────────────────────

function ProfileViewsChart({ data, width, C }: { data: ChartPoint[]; width: number; C: ThemeColors }) {
  const H = 140;
  const PX = 4;
  const PY = 10;
  const maxViews = Math.max(...data.map(d => d.views), 1);

  const pts = data.map((d, i) => ({
    x: PX + (i / Math.max(data.length - 1, 1)) * (width - PX * 2),
    y: PY + (1 - d.views / maxViews) * (H - PY * 2),
  }));

  const line = smoothPath(pts);
  const area = line ? line + ` L ${pts[pts.length - 1].x.toFixed(2)},${H} L ${pts[0].x.toFixed(2)},${H} Z` : '';

  return (
    <Svg width={width} height={H}>
      <Defs>
        <SvgGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#EA0C5F" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#EA0C5F" stopOpacity="0" />
        </SvgGradient>
        <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#EA0C5F" />
          <Stop offset="55%" stopColor="#FF5341" />
          <Stop offset="100%" stopColor="#F6BA00" />
        </SvgGradient>
      </Defs>
      {[0.25, 0.5, 0.75].map(t => (
        <Path
          key={t}
          d={`M ${PX} ${(PY + t * (H - PY * 2)).toFixed(2)} L ${width - PX} ${(PY + t * (H - PY * 2)).toFixed(2)}`}
          stroke={C.border}
          strokeWidth="1"
        />
      ))}
      {area ? <Path d={area} fill="url(#areaGrad)" /> : null}
      {line ? <Path d={line} fill="none" stroke="#EA0C5F" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" /> : null}
      {line ? <Path d={line} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </Svg>
  );
}

// ── Bar row ───────────────────────────────────────────────────────────────────

function BarRow({
  label, value, pct, color, sub, s,
}: {
  label: string; value: string; pct: number; color: string; sub?: string;
  s: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={s.barRowWrap}>
      <View style={s.barRowHeader}>
        <Text style={s.barRowLabel}>{label}</Text>
        <Text style={[s.barRowValue, { color }]}>{value}</Text>
      </View>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      {sub ? <Text style={s.barRowSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { athlete, loading: dataLoading } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { width: deviceWidth } = useWindowDimensions();
  const chartWidth = deviceWidth - 40 - 32;

  const [profileViews, setProfileViews] = useState<ProfileViewStats | null>(null);
  const [matchActivity, setMatchActivity] = useState<MatchActivity | null>(null);
  const [recruiting, setRecruiting] = useState<RecruitingData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!athlete?.id) return;
    setLoading(true);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // ── Profile views ──────────────────────────────────────────────────────────
    const [
      { data: recentViews },
      { count: totalViews },
      { data: allIpData },
    ] = await Promise.all([
      supabase
        .from('profile_views')
        .select('viewed_at')
        .eq('athlete_id', athlete.id)
        .gte('viewed_at', thirtyDaysAgo.toISOString())
        .order('viewed_at', { ascending: true }),
      supabase
        .from('profile_views')
        .select('*', { count: 'exact', head: true })
        .eq('athlete_id', athlete.id),
      supabase
        .from('profile_views')
        .select('viewer_ip')
        .eq('athlete_id', athlete.id),
    ]);

    const uniqueViews = new Set(
      (allIpData ?? []).map((v: any) => v.viewer_ip).filter(Boolean)
    ).size;

    const viewsByDate: Record<string, number> = {};
    (recentViews ?? []).forEach((v: any) => {
      const date = v.viewed_at.split('T')[0];
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    const chartData: ChartPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      chartData.push({ date: dateStr, views: viewsByDate[dateStr] || 0 });
    }

    const last30Days = chartData.reduce((sum, d) => sum + d.views, 0);
    const last7Days = chartData.slice(-7).reduce((sum, d) => sum + d.views, 0);

    setProfileViews({ total: totalViews ?? 0, unique: uniqueViews, last7Days, last30Days, chartData });

    // ── Match activity — mirrors web's /api/analytics matchActivity block ──────
    const { data: swipeData } = await supabase
      .from('swipes')
      .select('coach_id, direction')
      .eq('athlete_id', athlete.id)
      .eq('swiped_by', 'athlete');

    const { data: matchRows } = await supabase
      .from('mutual_matches')
      .select('id, coach_id, matched_at, coach:coach_accounts(full_name, school_name, division)')
      .eq('athlete_id', athlete.id);

    const mr = matchRows ?? [];
    const matchIds = mr.map((m: any) => m.id);

    let messages: { match_id: string; sender_type: string; created_at: string }[] = [];
    if (matchIds.length > 0) {
      const { data: msgRows } = await supabase
        .from('match_messages')
        .select('match_id, sender_type, created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true });
      messages = msgRows ?? [];
    }

    setMatchActivity({
      reviewed: swipeData?.length ?? 0,
      liked: swipeData?.filter((sw: any) => sw.direction === 'like').length ?? 0,
      matched: matchIds.length,
      messagesSent: messages.filter(m => m.sender_type === 'athlete').length,
      coachesWhoReplied: new Set(messages.filter(m => m.sender_type === 'coach').map(m => m.match_id)).size,
    });

    // ── Recruiting Intelligence — mirrors web's recruiting-analytics-section ───
    {
      const likedCoachIds = (swipeData ?? []).filter((sw: any) => sw.direction === 'like').map((sw: any) => sw.coach_id);
      let likedCoachDivisions: Record<string, string> = {};
      if (likedCoachIds.length > 0) {
        const { data: coachRows } = await supabase
          .from('coach_accounts')
          .select('id, division')
          .in('id', likedCoachIds);
        likedCoachDivisions = Object.fromEntries((coachRows ?? []).map((c: any) => [c.id, c.division]));
      }

      const divStats = Object.fromEntries(DIVISION_ORDER.map(d => [d, { liked: 0, matched: 0, messaged: 0 }])) as Record<Division, DivStat>;
      Object.values(likedCoachDivisions).forEach((division: any) => {
        if (divStats[division as Division]) divStats[division as Division].liked++;
      });

      const messagedMatchIds = new Set(messages.filter(m => m.sender_type === 'athlete').map(m => m.match_id));
      mr.forEach((m: any) => {
        const division = (Array.isArray(m.coach) ? m.coach[0]?.division : m.coach?.division) as Division | undefined;
        if (!division || !divStats[division]) return;
        divStats[division].matched++;
        divStats[division].liked++; // a matched coach was necessarily liked first
        if (messagedMatchIds.has(m.id)) divStats[division].messaged++;
      });

      const firstCoachReplyByMatch: Record<string, string> = {};
      messages.forEach(m => {
        if (m.sender_type === 'coach' && !firstCoachReplyByMatch[m.match_id]) {
          firstCoachReplyByMatch[m.match_id] = m.created_at;
        }
      });
      const responseTimeByDivision: Partial<Record<Division, number[]>> = {};
      mr.forEach((m: any) => {
        const division = (Array.isArray(m.coach) ? m.coach[0]?.division : m.coach?.division) as Division | undefined;
        const replyAt = firstCoachReplyByMatch[m.id];
        if (!division || !replyAt) return;
        const days = Math.max(0, Math.ceil((new Date(replyAt).getTime() - new Date(m.matched_at).getTime()) / 86400000));
        (responseTimeByDivision[division] ??= []).push(days);
      });
      const avgResponseTime: Partial<Record<Division, number>> = {};
      (Object.entries(responseTimeByDivision) as [Division, number[]][]).forEach(([division, days]) => {
        avgResponseTime[division] = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
      });

      const messagesByMatch: Record<string, { sent: number; received: number }> = {};
      messages.forEach(m => {
        const bucket = (messagesByMatch[m.match_id] ??= { sent: 0, received: 0 });
        if (m.sender_type === 'athlete') bucket.sent++; else bucket.received++;
      });
      const coachMomentum: CoachMomentum[] = mr
        .map((m: any) => {
          const coach = Array.isArray(m.coach) ? m.coach[0] : m.coach;
          const counts = messagesByMatch[m.id] || { sent: 0, received: 0 };
          return {
            name: coach?.full_name || 'Coach',
            school: coach?.school_name || '',
            division: DIVISION_LABELS[coach?.division as Division] || coach?.division || '',
            messagesSent: counts.sent,
            messagesReceived: counts.received,
          };
        })
        .filter((c: CoachMomentum) => c.messagesReceived > 0)
        .sort((a: CoachMomentum, b: CoachMomentum) => b.messagesReceived - a.messagesReceived)
        .slice(0, 5);

      setRecruiting({ divStats, avgResponseTime, coachMomentum });
    }

    setLoading(false);
  }, [athlete?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (dataLoading) {
    return (
      <View style={[s.center, { flex: 1 }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const divisionsWithActivity = recruiting ? DIVISION_ORDER.filter(d => recruiting.divStats[d].liked > 0) : [];

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={C.primary} />}
    >
      {/* ── Header ── */}
      <View>
        <Text style={s.title}>Analytics</Text>
        <Text style={s.subtitle}>Track your profile views and match activity.</Text>
      </View>

      {/* ── Profile View Stats ── */}
      <View style={s.statGrid}>
        {([
          { label: 'Total Profile Views', value: profileViews?.total ?? 0, highlight: false },
          { label: 'Unique Visitors',      value: profileViews?.unique ?? 0, highlight: false },
          { label: 'Last 7 Days',          value: profileViews?.last7Days ?? 0, highlight: true },
          { label: 'Last 30 Days',         value: profileViews?.last30Days ?? 0, highlight: false },
        ] as const).map((stat, i) => (
          <View key={i} style={s.statCard}>
            <Text style={s.statCardLabel}>{stat.label}</Text>
            <Text style={[s.statCardValue, stat.highlight && { color: C.primary }]}>{stat.value}</Text>
          </View>
        ))}
      </View>

      {/* ── Profile Views Chart ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Profile Views — Last 30 Days</Text>
        {profileViews?.chartData ? (
          <>
            <ProfileViewsChart data={profileViews.chartData} width={chartWidth} C={C} />
            <View style={s.chartLabels}>
              <Text style={s.chartLabel}>30 days ago</Text>
              <Text style={s.chartLabel}>Today</Text>
            </View>
          </>
        ) : (
          <View style={s.chartPlaceholder}>
            <ActivityIndicator color={C.primary} />
          </View>
        )}
      </View>

      {/* ── Match Activity ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Match Activity</Text>
        <View style={s.outreachGrid}>
          {([
            { label: 'Reviewed',   value: matchActivity?.reviewed ?? 0,  color: C.text    },
            { label: 'Liked',      value: matchActivity?.liked ?? 0,     color: C.primary },
            { label: 'Matched',    value: matchActivity?.matched ?? 0,   color: '#10b981' },
            { label: 'Msgs Sent',  value: matchActivity?.messagesSent ?? 0, color: '#f59e0b' },
          ] as const).map((stat, i) => (
            <View key={i} style={s.outreachCell}>
              <Text style={[s.outreachValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.outreachLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        {!!matchActivity?.matched && (
          <Text style={s.replyLine}>
            {matchActivity.coachesWhoReplied} of {matchActivity.matched} matched coach{matchActivity.matched !== 1 ? 'es' : ''} replied
          </Text>
        )}
      </View>

      {/* ── Recruiting Intelligence ── */}
      <View style={{ gap: 4 }}>
        <Text style={s.intelligenceTitle}>Recruiting Intelligence</Text>
        <Text style={s.intelligenceSub}>
          Real conversion by division, coach reply time, and who's actually engaging back.
        </Text>
      </View>

      {recruiting ? (
        <>
          {/* Conversion Funnel by Division */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Conversion Funnel by Division</Text>
            {divisionsWithActivity.length === 0 ? (
              <Text style={s.dimText}>Like a few programs to start seeing your funnel here.</Text>
            ) : (
              <View style={s.tierGrid}>
                {divisionsWithActivity.map(division => {
                  const stats = recruiting.divStats[division];
                  const matchedPct = stats.liked > 0 ? Math.round((stats.matched / stats.liked) * 100) : 0;
                  const messagedPct = stats.matched > 0 ? Math.round((stats.messaged / stats.matched) * 100) : 0;
                  return (
                    <View key={division} style={s.tierCard}>
                      <Text style={s.tierCardTitle}>{DIVISION_LABELS[division]}</Text>
                      <View style={s.tierBarRow}>
                        <View style={s.tierBarHeader}>
                          <Text style={s.tierBarLabel}>Matched</Text>
                          <Text style={s.tierBarPct}>{matchedPct}%</Text>
                        </View>
                        <View style={s.tierBarTrack}><View style={[s.tierBarFill, { width: `${matchedPct}%` as any, backgroundColor: '#10b981' }]} /></View>
                      </View>
                      <View style={s.tierBarRow}>
                        <View style={s.tierBarHeader}>
                          <Text style={s.tierBarLabel}>Messaged</Text>
                          <Text style={s.tierBarPct}>{messagedPct}%</Text>
                        </View>
                        <View style={s.tierBarTrack}><View style={[s.tierBarFill, { width: `${messagedPct}%` as any, backgroundColor: '#a78bfa' }]} /></View>
                      </View>
                      <Text style={s.tierCount}>{stats.liked} liked</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Average Response Time by Division */}
          {Object.keys(recruiting.avgResponseTime).length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Average Coach Reply Time by Division</Text>
              <View style={s.responseGrid}>
                {(Object.entries(recruiting.avgResponseTime) as [Division, number][]).map(([division, days]) => (
                  <View key={division} style={s.responseCell}>
                    <Text style={s.responseTier}>{DIVISION_LABELS[division]}</Text>
                    <Text style={[s.responseDays, { color: C.primary }]}>{days}</Text>
                    <Text style={s.responseSub}>days avg</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Most Engaged Coaches */}
          {recruiting.coachMomentum.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Most Engaged Coaches</Text>
              {recruiting.coachMomentum.map((coach, i) => (
                <View key={i} style={s.coachRow}>
                  <Text style={s.coachRank}>#{i + 1}</Text>
                  <View style={s.coachInfo}>
                    <Text style={s.coachName}>{coach.name}{coach.school ? ` · ${coach.school}` : ''}</Text>
                    <Text style={s.coachSub}>{coach.messagesReceived} of {coach.messagesSent + coach.messagesReceived} messages from them</Text>
                  </View>
                  {coach.division ? (
                    <View style={s.coachBadge}><Text style={s.coachBadgeText}>{coach.division}</Text></View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={s.center}>
          <ActivityIndicator color={C.primary} />
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20, gap: 16 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: C.background },

    title: { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 3 },
    subtitle: { fontSize: 13, color: C.textMuted },

    dimText: { fontSize: 12, color: C.textDim },

    // 2×2 stat grid
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statCard: {
      flex: 1,
      minWidth: '46%',
      backgroundColor: C.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 18,
      gap: 6,
    },
    statCardLabel: { fontSize: 11, color: C.textDim },
    statCardValue: { fontSize: 32, fontWeight: '900', color: C.text, lineHeight: 36 },

    // Generic card
    card: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      gap: 12,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: C.text },

    // Chart
    chartPlaceholder: { height: 140, alignItems: 'center', justifyContent: 'center' },
    chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    chartLabel: { fontSize: 10, color: C.textDim },

    // Match activity 4-cell grid
    outreachGrid: { flexDirection: 'row', gap: 8 },
    outreachCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      backgroundColor: C.surfaceAlt,
      borderRadius: 10,
    },
    outreachValue: { fontSize: 24, fontWeight: '900', lineHeight: 28 },
    outreachLabel: {
      fontSize: 9,
      color: C.textDim,
      fontWeight: '600',
      textTransform: 'uppercase',
      textAlign: 'center',
      letterSpacing: 0.3,
      marginTop: 2,
    },
    replyLine: { fontSize: 12, color: C.textMuted, textAlign: 'center' },

    // Rate bars (kept for potential reuse)
    barRowWrap: { gap: 5 },
    barRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    barRowLabel: { fontSize: 12, color: C.textMuted },
    barRowValue: { fontSize: 12, fontWeight: '700' },
    barTrack: { height: 6, borderRadius: 3, backgroundColor: C.surfaceAlt, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },
    barRowSub: { fontSize: 10, color: C.textDim, marginTop: 1 },

    // Recruiting Intelligence header
    intelligenceTitle: { fontSize: 18, fontWeight: '800', color: C.text },
    intelligenceSub: { fontSize: 12, color: C.textMuted, lineHeight: 18 },

    // Division funnel
    tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tierCard: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: C.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },
    tierCardTitle: { fontSize: 12, fontWeight: '800', color: C.text },
    tierBarRow: { gap: 3 },
    tierBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    tierBarLabel: { fontSize: 11, color: C.textMuted },
    tierBarPct: { fontSize: 11, fontWeight: '700', color: C.text },
    tierBarTrack: { height: 4, borderRadius: 2, backgroundColor: C.surface, overflow: 'hidden' },
    tierBarFill: { height: '100%', borderRadius: 2 },
    tierCount: { fontSize: 10, color: C.textDim, fontWeight: '600' },

    // Response time
    responseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    responseCell: {
      flex: 1,
      minWidth: '28%',
      alignItems: 'center',
      backgroundColor: C.surfaceAlt,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 8,
    },
    responseTier: { fontSize: 11, color: C.textDim, fontWeight: '600', marginBottom: 4 },
    responseDays: { fontSize: 24, fontWeight: '900' },
    responseSub: { fontSize: 10, color: C.textDim },

    // Coach momentum
    coachRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: C.surfaceAlt,
      borderRadius: 8,
    },
    coachRank: { fontSize: 13, fontWeight: '900', color: C.textDim, width: 26 },
    coachInfo: { flex: 1, gap: 2 },
    coachName: { fontSize: 12, fontWeight: '700', color: C.text },
    coachSub: { fontSize: 10, color: C.textDim },
    coachBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(131,58,180,0.15)' },
    coachBadgeText: { fontSize: 9, fontWeight: '700', color: C.primary },
  });
}
