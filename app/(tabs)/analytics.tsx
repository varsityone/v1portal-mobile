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
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAthleteData } from '../../hooks/useAthleteData';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartPoint { date: string; views: number; }

interface ProfileViewStats {
  total: number;
  unique: number;
  last7Days: number;
  last30Days: number;
  chartData: ChartPoint[];
}

interface OutreachStats {
  total: number;
  sent: number;
  opened: number;
  bounced: number;
}

interface TierStat { total: number; contacted: number; interested: number; offer: number; }

interface RecruitingData {
  tierStats: Record<string, TierStat>;
  templateStats: Record<string, { sent: number; opened: number }>;
  avgResponseTime: Record<string, number>;
  coachMomentum: { name: string; status: string; emailsSent: number; emailsOpened: number }[];
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
          <Stop offset="0%" stopColor="#501aff" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#501aff" stopOpacity="0" />
        </SvgGradient>
        <SvgGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#501aff" />
          <Stop offset="55%" stopColor="#a855f7" />
          <Stop offset="100%" stopColor="#ec4899" />
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
      {line ? <Path d={line} fill="none" stroke="#501aff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" /> : null}
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
  const [outreach, setOutreach] = useState<OutreachStats | null>(null);
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

    // ── Outreach ───────────────────────────────────────────────────────────────
    const { data: outreachData } = await supabase
      .from('coach_outreach')
      .select('status, sent_at, opened_at, template_used, program_id')
      .eq('athlete_id', athlete.id);

    const od = outreachData ?? [];
    const outreachStats: OutreachStats = {
      total: od.length,
      sent: od.filter((o: any) => ['sent', 'opened', 'bounced'].includes(o.status ?? '')).length,
      opened: od.filter((o: any) => o.status === 'opened').length,
      bounced: od.filter((o: any) => o.status === 'bounced').length,
    };
    setOutreach(outreachStats);

    // ── Recruiting Intelligence ────────────────────────────────────────────────
    {
      const { data: trackerData } = await supabase
        .from('coach_tracker')
        .select('id, status, coach:coaches(id, name, programs(id, name, division))')
        .eq('athlete_id', athlete.id);

      const td = trackerData ?? [];

      const getTier = (division: string | null) => division ? division.split('/')[0] : 'Unknown';

      const tierStats: Record<string, TierStat> = {
        FBS:  { total: 0, contacted: 0, interested: 0, offer: 0 },
        FCS:  { total: 0, contacted: 0, interested: 0, offer: 0 },
        D2:   { total: 0, contacted: 0, interested: 0, offer: 0 },
        D3:   { total: 0, contacted: 0, interested: 0, offer: 0 },
        NAIA: { total: 0, contacted: 0, interested: 0, offer: 0 },
        JUCO: { total: 0, contacted: 0, interested: 0, offer: 0 },
      };

      td.forEach((entry: any) => {
        const prog = Array.isArray(entry.coach?.programs) ? entry.coach.programs[0] : entry.coach?.programs;
        const tier = getTier(prog?.division ?? null);
        if (tierStats[tier]) {
          tierStats[tier].total++;
          if (entry.status !== 'not_contacted') tierStats[tier].contacted++;
          if (['interested', 'serious', 'offer'].includes(entry.status)) tierStats[tier].interested++;
          if (entry.status === 'offer') tierStats[tier].offer++;
        }
      });

      const templateStats: Record<string, { sent: number; opened: number }> = {};
      od.forEach((email: any) => {
        const tmpl = email.template_used || 'unknown';
        if (!templateStats[tmpl]) templateStats[tmpl] = { sent: 0, opened: 0 };
        templateStats[tmpl].sent++;
        if (email.opened_at) templateStats[tmpl].opened++;
      });

      const responseTimeByTier: Record<string, number[]> = {};
      od.forEach((email: any) => {
        if (!email.opened_at || !email.sent_at) return;
        const tracker = td.find((t: any) => {
          const prog = Array.isArray(t.coach?.programs) ? t.coach.programs[0] : t.coach?.programs;
          return prog?.id === email.program_id;
        });
        if (tracker) {
          const prog = Array.isArray(tracker.coach?.programs) ? tracker.coach.programs[0] : tracker.coach?.programs;
          const tier = getTier(prog?.division ?? null);
          if (!responseTimeByTier[tier]) responseTimeByTier[tier] = [];
          const days = Math.ceil(
            (new Date(email.opened_at).getTime() - new Date(email.sent_at).getTime()) / 86400000
          );
          responseTimeByTier[tier].push(days);
        }
      });

      const avgResponseTime: Record<string, number> = {};
      Object.entries(responseTimeByTier).forEach(([tier, times]) => {
        avgResponseTime[tier] = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      });

      const coachMomentum = td
        .map((entry: any) => {
          const prog = Array.isArray(entry.coach?.programs) ? entry.coach.programs[0] : entry.coach?.programs;
          const coachEmails = od.filter((e: any) => e.program_id === prog?.id);
          const opened = coachEmails.filter((e: any) => e.opened_at).length;
          return {
            name: entry.coach?.name ?? 'Unknown',
            status: entry.status ?? '',
            emailsSent: coachEmails.length,
            emailsOpened: opened,
          };
        })
        .filter((c: any) => c.emailsSent > 0)
        .sort((a: any, b: any) => (b.emailsOpened / b.emailsSent) - (a.emailsOpened / a.emailsSent))
        .slice(0, 5);

      setRecruiting({ tierStats, templateStats, avgResponseTime, coachMomentum });
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

  const openRate = outreach && outreach.sent > 0 ? Math.round((outreach.opened / outreach.sent) * 100) : 0;
  const bounceRate = outreach && outreach.sent > 0 ? Math.round((outreach.bounced / outreach.sent) * 100) : 0;

  const statusColors: Record<string, string> = {
    not_contacted: '#5a5d63',
    contacted: '#0ea5e9',
    interested: '#a78bfa',
    serious: '#f1a10d',
    offer: '#10b981',
  };

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
        <Text style={s.subtitle}>Track your profile views and outreach performance.</Text>
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

      {/* ── Outreach Statistics ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Outreach Statistics</Text>
        <View style={s.outreachGrid}>
          {([
            { label: 'Total Emails', value: outreach?.total ?? 0,  color: C.text    },
            { label: 'Sent',         value: outreach?.sent ?? 0,   color: C.primary },
            { label: 'Opened',       value: outreach?.opened ?? 0, color: '#f59e0b' },
            { label: 'Bounced',      value: outreach?.bounced ?? 0, color: '#ef4444' },
          ] as const).map((stat, i) => (
            <View key={i} style={s.outreachCell}>
              <Text style={[s.outreachValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.outreachLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
        {outreach && outreach.sent > 0 && (
          <View style={s.rateRows}>
            <BarRow label="Open Rate" value={`${openRate}%`} pct={openRate} color="#f59e0b" s={s} />
            {outreach.bounced > 0 && (
              <BarRow
                label="Bounce Rate"
                value={`${bounceRate}%`}
                pct={bounceRate}
                color="#ef4444"
                sub="⚠️ Bounced emails may have incorrect addresses."
                s={s}
              />
            )}
          </View>
        )}
      </View>

      {/* ── Recruiting Intelligence ── */}
      <>
        <View style={{ gap: 4 }}>
          <Text style={s.intelligenceTitle}>🎓 Recruiting Intelligence</Text>
            <Text style={s.intelligenceSub}>
              Deep insights into your recruiting strategy — conversion by tier, template performance, and engagement trends.
            </Text>
          </View>

          {recruiting ? (
            <>
              {/* Conversion Funnel by Tier */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Conversion Funnel by Tier</Text>
                {Object.entries(recruiting.tierStats).map(([tier, stats]) => {
                  if (stats.total === 0) return null;
                  const contactedPct  = Math.round((stats.contacted  / stats.total) * 100);
                  const interestedPct = Math.round((stats.interested / stats.total) * 100);
                  const offerPct      = Math.round((stats.offer      / stats.total) * 100);
                  return (
                    <View key={tier} style={s.tierCard}>
                      <Text style={s.tierCardTitle}>{tier}</Text>
                      {([
                        { label: 'Contacted',  pct: contactedPct,  color: '#0ea5e9' },
                        { label: 'Interested', pct: interestedPct, color: '#a78bfa' },
                        { label: 'Offers',     pct: offerPct,      color: '#10b981' },
                      ] as const).map(bar => (
                        <View key={bar.label} style={s.tierBarRow}>
                          <View style={s.tierBarHeader}>
                            <Text style={s.tierBarLabel}>{bar.label}</Text>
                            <Text style={[s.tierBarPct, { color: C.text }]}>{bar.pct}%</Text>
                          </View>
                          <View style={s.tierBarTrack}>
                            <View style={[s.tierBarFill, { width: `${bar.pct}%` as any, backgroundColor: bar.color }]} />
                          </View>
                        </View>
                      ))}
                      <Text style={s.tierCount}>{stats.total} coach{stats.total !== 1 ? 'es' : ''}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Template Performance */}
              <View style={s.card}>
                <Text style={s.cardTitle}>Email Template Performance</Text>
                {Object.entries(recruiting.templateStats).map(([tmpl, stats]) => {
                  const rate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
                  const label = tmpl === 'unknown' ? 'No Template' : tmpl.replace(/_/g, ' ').toUpperCase();
                  return (
                    <BarRow
                      key={tmpl}
                      label={label}
                      value={`${rate}% open rate`}
                      pct={rate}
                      color={C.primary}
                      sub={`${stats.sent} sent, ${stats.opened} opened`}
                      s={s}
                    />
                  );
                })}
              </View>

              {/* Average Response Time by Tier */}
              {Object.keys(recruiting.avgResponseTime).length > 0 && (
                <View style={s.card}>
                  <Text style={s.cardTitle}>Average Response Time by Tier</Text>
                  <View style={s.responseGrid}>
                    {Object.entries(recruiting.avgResponseTime).map(([tier, days]) => (
                      <View key={tier} style={s.responseCell}>
                        <Text style={s.responseTier}>{tier}</Text>
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
                  {recruiting.coachMomentum.map((coach, i) => {
                    const rate = coach.emailsSent > 0 ? Math.round((coach.emailsOpened / coach.emailsSent) * 100) : 0;
                    const statusColor = statusColors[coach.status] ?? '#5a5d63';
                    return (
                      <View key={i} style={s.coachRow}>
                        <Text style={s.coachRank}>#{i + 1}</Text>
                        <View style={s.coachInfo}>
                          <Text style={s.coachName}>{coach.name}</Text>
                          <Text style={s.coachSub}>{coach.emailsOpened} of {coach.emailsSent} emails opened</Text>
                        </View>
                        <View style={s.coachRight}>
                          <Text style={[s.coachRate, { color: C.primary }]}>{rate}%</Text>
                          <View style={[s.coachBadge, { backgroundColor: statusColor + '22' }]}>
                            <Text style={[s.coachBadgeText, { color: statusColor }]}>
                              {coach.status.replace('_', ' ')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <View style={s.center}>
              <ActivityIndicator color={C.primary} />
            </View>
          )}
        </>
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

    // Outreach 4-cell grid
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

    // Rate bars
    rateRows: { gap: 12 },
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

    // Tier funnel
    tierCard: {
      backgroundColor: C.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      gap: 8,
    },
    tierCardTitle: { fontSize: 12, fontWeight: '800', color: C.text },
    tierBarRow: { gap: 3 },
    tierBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    tierBarLabel: { fontSize: 11, color: C.textMuted },
    tierBarPct: { fontSize: 11, fontWeight: '700' },
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
    coachRight: { alignItems: 'flex-end', gap: 4 },
    coachRate: { fontSize: 13, fontWeight: '900' },
    coachBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    coachBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },

    // Elite gate
    eliteGate: {
      borderRadius: 14,
      padding: 32,
      alignItems: 'center',
      gap: 10,
    },
    eliteGateIcon: { fontSize: 32 },
    eliteGateTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center' },
    eliteGateSub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 19 },
  });
}
