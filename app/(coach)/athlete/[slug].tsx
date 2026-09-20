import LoadingScreen from '../../../components/LoadingScreen';
import { useEffect, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { useAuth } from '../../../hooks/useAuth';
import { logInterestCompliance, recordInterestAction } from '../../../hooks/useCoachInterested';
import { GRADIENT, ThemeColors, PINK_RED } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Card } from '../../../components/ui/Card';
import { ScoreRing } from '../../../components/ui/ScoreRing';

const API_BASE = 'https://v1portal.com';

interface TopFitProgram {
  id: string;
  name: string;
  division: string | null;
  logoUrl: string | null;
  fitPct: number;
  tag: string;
}

interface AthleteProfile {
  athleteId: string;
  name: string;
  bio: string | null;
  profilePhoto: string | null;
  position: string | null;
  graduationYear: number | string | null;
  highSchool: string | null;
  city: string | null;
  state: string | null;
  height: string | null;
  weight: string | number | null;
  fortyYard: string | number | null;
  shuttle: string | number | null;
  threeCone: string | number | null;
  vertical: string | number | null;
  broadJump: string | number | null;
  gpa: string | number | null;
  hudlLink: string | null;
  youtubeLink: string | null;
  v1Score: number | null;
  recruitingLevel: string | { level?: string; title?: string } | null;
  starRatingNum: number | null;
  profileComplete: boolean;
  topFitPrograms: TopFitProgram[] | null;
  scoreBreakdown: Record<string, number | { score: number }> | null;
  seasonStats: Record<string, string | number> | null;
  careerStats: (Record<string, string | number> & { seasonsTracked?: number }) | null;
  varsityYears: number | string | null;
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'film', label: 'Film' },
  { id: 'stats', label: 'Stats' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const DIV_COLORS: Record<string, { bg: string; text: string }> = {
  FBS: { bg: 'rgba(131,58,180,0.14)', text: '#c084fc' },
  FCS: { bg: 'rgba(131,58,180,0.14)', text: '#c084fc' },
  D2: { bg: 'rgba(16,185,129,0.14)', text: '#34d399' },
  D3: { bg: 'rgba(245,158,11,0.14)', text: '#fbbf24' },
  NAIA: { bg: 'rgba(249,115,22,0.14)', text: '#fb923c' },
  JUCO: { bg: 'rgba(59,130,246,0.14)', text: '#60a5fa' },
};

const SCORE_CATEGORIES: { label: string; key: string; fallback?: string; color: string }[] = [
  { label: 'Athletic / Physical', key: 'athletic', fallback: 'physical', color: '#ff6b35' },
  { label: 'Football Production', key: 'production', color: '#f7931e' },
  { label: 'Academic', key: 'academic', color: '#3b82f6' },
  { label: 'Intangibles', key: 'intangibles', color: '#a78bfa' },
];

function getYouTubeId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
}

function humanizeKey(k: string): string {
  return k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, c => c.toUpperCase());
}

export default function AthletePublicProfileScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { coach, loading: coachLoading } = useCoachData();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [myDirection, setMyDirection] = useState<'like' | 'pass' | null>(null);
  const [acting, setActing] = useState<'like' | 'pass' | null>(null);
  const [matchNotif, setMatchNotif] = useState<string | null>(null);
  const [errorNotif, setErrorNotif] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/profile/${slug}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        if (!cancelled) setProfile(data);
        if (data.athleteId) {
          fetch(`${API_BASE}/api/track-view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ athleteId: data.athleteId }),
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (coachLoading || !coach?.id || !profile?.athleteId) return;
    const coachId = coach.id;
    const athleteId = profile.athleteId;

    (async () => {
      const { data: savedData } = await supabase
        .from('coach_saved_prospects')
        .select('id')
        .eq('coach_id', coachId)
        .eq('athlete_id', athleteId)
        .maybeSingle();
      setIsSaved(!!savedData);
      setSavedId(savedData?.id ?? null);

      const { data: existingMatch } = await supabase
        .from('mutual_matches')
        .select('id')
        .eq('coach_id', coachId)
        .eq('athlete_id', athleteId)
        .maybeSingle();
      setMatchId(existingMatch?.id ?? null);

      const { data: existingSwipe } = await supabase
        .from('swipes')
        .select('direction')
        .eq('coach_id', coachId)
        .eq('athlete_id', athleteId)
        .eq('swiped_by', 'coach')
        .maybeSingle();
      setMyDirection((existingSwipe?.direction as 'like' | 'pass') ?? null);
    })();
  }, [coachLoading, coach?.id, profile?.athleteId]);

  useEffect(() => {
    if (!matchNotif) return;
    const t = setTimeout(() => setMatchNotif(null), 4000);
    return () => clearTimeout(t);
  }, [matchNotif]);
  useEffect(() => {
    if (!errorNotif) return;
    const t = setTimeout(() => setErrorNotif(null), 4000);
    return () => clearTimeout(t);
  }, [errorNotif]);

  const toggleSave = async () => {
    if (!coach?.id || !profile?.athleteId) return;
    if (isSaved && savedId) {
      await supabase.from('coach_saved_prospects').delete().eq('id', savedId);
      setIsSaved(false);
      setSavedId(null);
    } else {
      const { data } = await supabase
        .from('coach_saved_prospects')
        .insert({ coach_id: coach.id, athlete_id: profile.athleteId })
        .select()
        .single();
      if (data) {
        setIsSaved(true);
        setSavedId(data.id);
      }
    }
  };

  const handleAction = async (direction: 'like' | 'pass') => {
    if (!coach?.id || !profile?.athleteId || acting) return;
    setActing(direction);
    await logInterestCompliance(coach.id, coach.division, coach.region, profile.athleteId);
    const result = await recordInterestAction({
      athleteId: profile.athleteId, coachId: coach.id, direction, accessToken: session?.access_token,
    });
    if (!result.ok) {
      setErrorNotif("That didn't save. Check your connection and try again.");
      setActing(null);
      return;
    }
    setMyDirection(direction);
    if (result.matched && result.matchId) {
      setMatchId(result.matchId);
      setMatchNotif(`Matched with ${profile.name ?? 'this athlete'}.`);
    }
    setActing(null);
  };

  const startConversation = async () => {
    if (!coach?.id || !profile?.athleteId) return;
    const { data: existing } = await supabase
      .from('coach_athlete_conversations')
      .select('id')
      .eq('coach_id', coach.id)
      .eq('athlete_id', profile.athleteId)
      .single();

    if (existing) {
      router.push(`/(coach)/messages/${existing.id}` as any);
      return;
    }

    const { data: created } = await supabase
      .from('coach_athlete_conversations')
      .insert({ coach_id: coach.id, athlete_id: profile.athleteId })
      .select()
      .single();

    if (created) router.push(`/(coach)/messages/${created.id}` as any);
  };

  if (loading) return <LoadingScreen />;
  if (notFound || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
        <Ionicons name="person-outline" size={40} color={C.textDim} />
        <Text style={{ fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text }}>Profile not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: FontFamily.bodySemi, fontSize: 13, color: PINK_RED }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  let recruitingLevel = profile.recruitingLevel;
  if (typeof recruitingLevel === 'object' && recruitingLevel !== null) {
    recruitingLevel = recruitingLevel.level || recruitingLevel.title || 'Prospect';
  }

  const combineStats = [
    { label: '40 YD', value: profile.fortyYard, suffix: 's' },
    { label: 'Shuttle', value: profile.shuttle, suffix: 's' },
    { label: 'Vert', value: profile.vertical ? String(profile.vertical).replace(/"+$/, '') : null, suffix: '"' },
  ].filter(st => st.value);

  const starCount = profile.starRatingNum ?? 0;
  const metaParts = [profile.position, profile.height, profile.weight ? `${profile.weight} lbs` : null, profile.graduationYear ? `Class of ${profile.graduationYear}` : null].filter(Boolean);
  const locationText = [profile.city, profile.state].filter(Boolean).join(', ');
  const youtubeId = getYouTubeId(profile.youtubeLink);

  const careerStatsEntries = profile.careerStats ? Object.entries(profile.careerStats).filter(([k]) => k !== 'seasonsTracked') : [];
  const scoreBreakdownRows = profile.scoreBreakdown
    ? SCORE_CATEGORIES.map(item => {
        const raw = profile.scoreBreakdown![item.key] ?? (item.fallback ? profile.scoreBreakdown![item.fallback] : undefined);
        if (raw == null) return null;
        const val = typeof raw === 'object' ? raw.score : raw;
        if (!val) return null;
        return { ...item, val };
      }).filter(Boolean) as { label: string; key: string; color: string; val: number }[]
    : [];

  const quickInfoRows = [
    { label: 'Position', value: profile.position },
    { label: 'Height', value: profile.height },
    { label: 'Weight', value: profile.weight ? `${profile.weight} lbs` : null },
    { label: '40-Yard', value: profile.fortyYard ? `${profile.fortyYard}s` : null },
    { label: 'Vertical', value: profile.vertical ? `${String(profile.vertical).replace(/"+$/, '')}"` : null },
    { label: 'GPA', value: profile.gpa },
    { label: 'Grad Year', value: profile.graduationYear },
    { label: 'High School', value: profile.highSchool },
    { label: 'Location', value: locationText || null },
  ].filter(r => r.value);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <Pressable style={s.backLink} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={14} color="#fff" />
          <Text style={s.backLinkText}>Back</Text>
        </Pressable>

        {/* Hero */}
        <View style={s.hero}>
          {profile.profilePhoto ? (
            <Image source={{ uri: profile.profilePhoto }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#2a2d33', '#0c0d0e']} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(11,12,13,0.75)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />

          {profile.v1Score != null && (
            <View style={s.heroScoreWrap}>
              <ScoreRing score={Math.round(profile.v1Score)} size={72} />
              {recruitingLevel ? <Text style={s.heroLevelText} numberOfLines={2}>{recruitingLevel as string}</Text> : null}
            </View>
          )}

          <View style={s.heroInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.heroName}>{profile.name}</Text>
              {profile.profileComplete && (
                <Image source={require('../../../assets/varsityone-logo-mark-full-palette.png')} style={{ width: 16, height: 20 }} resizeMode="contain" />
              )}
            </View>
            {metaParts.length > 0 && <Text style={s.heroMeta}>{metaParts.join(' · ')}</Text>}
            {(locationText || starCount > 0) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                {locationText ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="location" size={12} color="rgba(255,255,255,0.65)" />
                    <Text style={s.heroLoc}>{locationText}</Text>
                  </View>
                ) : null}
                {starCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name={i < starCount ? 'star' : 'star-outline'} size={12} color={i < starCount ? '#F6BA00' : 'rgba(255,255,255,0.22)'} />
                      ))}
                    </View>
                    <Text style={s.heroRatingLabel}>V1 Rating</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View style={s.body}>
          {matchNotif && (
            <View style={s.toastWrap} pointerEvents="none">
              <LinearGradient colors={['#501af0', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.toast}>
                <Text style={s.toastText}>{matchNotif}</Text>
              </LinearGradient>
            </View>
          )}
          {errorNotif && (
            <View style={s.toastWrap} pointerEvents="none">
              <View style={[s.toast, { backgroundColor: C.surfaceAlt }]}>
                <Text style={[s.toastText, { color: C.text }]}>{errorNotif}</Text>
              </View>
            </View>
          )}

          {/* Combine stats */}
          {combineStats.length > 0 && (
            <View style={s.statsRow}>
              {combineStats.map(st => (
                <View key={st.label} style={s.statCard}>
                  <Text style={s.statLabel}>{st.label.toUpperCase()}</Text>
                  <Text style={s.statValue}>{st.value}{st.suffix}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tabs */}
          <View style={s.tabsRow}>
            {TABS.map(tab => (
              <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={s.tabBtn}>
                <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
                {activeTab === tab.id && <View style={s.tabUnderline} />}
              </Pressable>
            ))}
          </View>

          {activeTab === 'overview' && (
            <View style={{ gap: 16 }}>
              {profile.bio && (
                <Card>
                  <Text style={s.h2}>About</Text>
                  <Text style={s.bioText}>{profile.bio}</Text>
                </Card>
              )}

              {careerStatsEntries.length > 0 && (
                <Card>
                  <Text style={s.h2}>Career Stats</Text>
                  <Text style={s.subLabel}>
                    Across {profile.careerStats?.seasonsTracked} varsity season{profile.careerStats?.seasonsTracked === 1 ? '' : 's'}
                  </Text>
                  <View style={s.statGrid}>
                    {careerStatsEntries.map(([k, v]) => (
                      <View key={k} style={s.whiteStatBox}>
                        <Text style={s.whiteStatLabel}>{humanizeKey(k)}</Text>
                        <Text style={s.whiteStatValue}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {scoreBreakdownRows.length > 0 && (
                <Card>
                  <Text style={s.h2}>V1 Score Breakdown</Text>
                  <View style={{ gap: 14 }}>
                    {scoreBreakdownRows.map(item => (
                      <View key={item.key}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={s.breakdownLabel}>{item.label}</Text>
                          <Text style={s.breakdownValue}>{item.val}</Text>
                        </View>
                        <View style={s.breakdownTrack}>
                          <LinearGradient colors={['#EA0C5F', '#F6BA00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.breakdownFill, { width: `${item.val}%` }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              )}

              {profile.topFitPrograms && profile.topFitPrograms.length > 0 && (
                <Card>
                  <Text style={s.h2}>Top Fit Programs</Text>
                  <View>
                    {profile.topFitPrograms.map(p => {
                      const colors = (p.division && DIV_COLORS[p.division]) || { bg: 'rgba(255,255,255,0.08)', text: C.textMuted };
                      const initials = (p.name ?? 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <View key={p.id} style={s.fitRow}>
                          {p.logoUrl ? (
                            <Image source={{ uri: p.logoUrl }} style={[s.fitLogo, { backgroundColor: '#fff' }]} resizeMode="contain" />
                          ) : (
                            <View style={[s.fitLogo, { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }]}>
                              <Text style={{ fontFamily: FontFamily.headlineBold, fontSize: 12, color: colors.text }}>{initials}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.fitName} numberOfLines={1}>{p.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.success }} />
                              <Text style={s.fitPct}>{p.fitPct}% Fit</Text>
                              <Text style={[s.fitTag, { color: p.tag === 'High' ? C.success : '#F6BA00' }]}>{p.tag.toUpperCase()}</Text>
                            </View>
                          </View>
                          <LinearGradient colors={['#EA0C5F', '#FF8820']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fitBadge}>
                            <Text style={s.fitBadgeText}>{p.fitPct}</Text>
                          </LinearGradient>
                        </View>
                      );
                    })}
                  </View>
                </Card>
              )}

              {quickInfoRows.length > 0 && (
                <Card>
                  <Text style={s.h2}>Quick Info</Text>
                  <View>
                    {quickInfoRows.map((row, i) => (
                      <View key={row.label} style={[s.quickRow, i > 0 && s.quickRowBorder]}>
                        <Text style={s.quickLabel}>{row.label}</Text>
                        <Text style={s.quickValue}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </Card>
              )}
            </View>
          )}

          {activeTab === 'film' && (
            <View style={{ gap: 16 }}>
              {profile.hudlLink && (
                <Pressable style={s.filmPromo} onPress={() => Linking.openURL(profile.hudlLink!)}>
                  <LinearGradient colors={['#1a1a2e', '#0a0a0c']} style={StyleSheet.absoluteFill} />
                  <View style={s.filmPlayCircle}>
                    <Ionicons name="play" size={22} color="rgba(255,255,255,0.75)" />
                  </View>
                  <Text style={s.filmPromoTitle}>Watch Highlights on Hudl</Text>
                  <Text style={s.filmPromoSub}>Tap to view film</Text>
                  <View style={s.filmPromoBtn}>
                    <Text style={s.filmPromoBtnText}>View on Hudl</Text>
                  </View>
                </Pressable>
              )}

              {youtubeId ? (
                <View>
                  <Text style={s.sectionTitleSm}>YouTube Highlights</Text>
                  <View style={s.videoBox}>
                    <WebView source={{ uri: `https://www.youtube.com/embed/${youtubeId}` }} allowsFullscreenVideo style={{ flex: 1, backgroundColor: 'transparent' }} />
                  </View>
                </View>
              ) : profile.youtubeLink ? (
                <Pressable style={s.filmPromo} onPress={() => Linking.openURL(profile.youtubeLink!)}>
                  <LinearGradient colors={['#1a1a2e', '#0a0a0c']} style={StyleSheet.absoluteFill} />
                  <View style={s.filmPlayCircle}>
                    <Ionicons name="play" size={22} color="rgba(255,255,255,0.75)" />
                  </View>
                  <Text style={s.filmPromoTitle}>Watch on YouTube</Text>
                  <View style={s.filmPromoBtn}>
                    <Text style={s.filmPromoBtnText}>View on YouTube</Text>
                  </View>
                </Pressable>
              ) : null}

              {!profile.hudlLink && !profile.youtubeLink && (
                <View style={s.emptyFilmBox}>
                  <Text style={s.emptyFilmText}>No film available</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'stats' && (
            <View style={{ gap: 24 }}>
              {profile.varsityYears && (
                <View style={s.chipRow}>
                  <Text style={s.chipLabel}>VARSITY SEASONS PLAYED</Text>
                  <Text style={s.chipValue}>{profile.varsityYears}</Text>
                </View>
              )}

              <View>
                <Text style={s.sectionTitleSm}>This Season</Text>
                {profile.seasonStats && Object.keys(profile.seasonStats).length > 0 ? (
                  <View style={s.statGrid}>
                    {Object.entries(profile.seasonStats).map(([k, v]) => (
                      <View key={k} style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>{humanizeKey(k)}</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{v}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={s.emptyFilmBox}>
                    <Text style={s.emptyFilmText}>No statistics available</Text>
                  </View>
                )}
              </View>

              {careerStatsEntries.length > 0 && (
                <View>
                  <Text style={s.sectionTitleSm}>Career Totals</Text>
                  <View style={s.statGrid}>
                    {careerStatsEntries.map(([k, v]) => (
                      <View key={k} style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>{humanizeKey(k)}</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(profile.fortyYard || profile.vertical || profile.broadJump || profile.shuttle || profile.threeCone) && (
                <View>
                  <Text style={s.sectionTitleSm}>Athletic Testing</Text>
                  <View style={s.statGrid}>
                    {profile.fortyYard && (
                      <View style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>40-Yard</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{profile.fortyYard}s</Text>
                      </View>
                    )}
                    {profile.vertical && (
                      <View style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>Vertical</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{String(profile.vertical).replace(/"+$/, '')}&quot;</Text>
                      </View>
                    )}
                    {profile.broadJump && (
                      <View style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>Broad Jump</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{String(profile.broadJump).replace(/"+$/, '')}&quot;</Text>
                      </View>
                    )}
                    {profile.shuttle && (
                      <View style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>Pro Shuttle</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{profile.shuttle}s</Text>
                      </View>
                    )}
                    {profile.threeCone && (
                      <View style={[s.whiteStatBox, { minWidth: '45%' }]}>
                        <Text style={s.whiteStatLabel}>3-Cone</Text>
                        <Text style={[s.whiteStatValue, { fontSize: 26 }]}>{profile.threeCone}s</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Coach action bar */}
      <View style={[s.actionBar, { backgroundColor: C.background, borderTopColor: C.border }]}>
        {matchId ? (
          <View style={[s.statusPill, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
            <Text style={[s.statusPillText, { color: '#22c55e' }]}>Matched</Text>
          </View>
        ) : myDirection === 'pass' ? (
          <View style={[s.statusPill, { backgroundColor: C.surfaceAlt }]}>
            <Text style={[s.statusPillText, { color: C.textDim }]}>Passed</Text>
          </View>
        ) : (
          <>
            <Pressable style={s.actBtn} disabled={acting === 'pass'} onPress={() => handleAction('pass')}>
              <Ionicons name="close" size={17} color="#fff" />
            </Pressable>
            <Pressable style={s.actBtnMatch} disabled={acting === 'like'} onPress={() => handleAction('like')}>
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          </>
        )}
        <Pressable style={[s.actBtn, matchId && { backgroundColor: 'rgba(34,197,94,0.16)' }]} onPress={() => matchId ? router.push(`/(coach)/match/${matchId}` as any) : startConversation()}>
          <Ionicons name="chatbubble-outline" size={17} color={matchId ? '#22c55e' : '#fff'} />
        </Pressable>
        <Pressable style={[s.actBtn, isSaved && { backgroundColor: 'rgba(246,186,0,0.16)' }]} onPress={toggleSave}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={16} color={isSaved ? '#f6ba00' : '#fff'} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
    backLinkText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text },

    hero: { height: 300, position: 'relative', overflow: 'hidden', borderRadius: 16, marginHorizontal: 20 },
    heroScoreWrap: { position: 'absolute', top: 18, right: 16, alignItems: 'center', width: 80 },
    heroLevelText: { fontFamily: FontFamily.mono, fontSize: 8, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 6, letterSpacing: 0.4, textTransform: 'uppercase' },
    heroInfo: { position: 'absolute', left: 18, right: 18, bottom: 18 },
    heroName: { fontFamily: FontFamily.headline, fontSize: 30, color: '#fff' },
    heroMeta: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
    heroLoc: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: 'rgba(255,255,255,0.65)' },
    heroRatingLabel: { fontFamily: FontFamily.bodyBold, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, textTransform: 'uppercase' },

    body: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },

    toastWrap: { position: 'absolute', top: -4, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
    toast: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 100 },
    toastText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },

    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, backgroundColor: C.surface, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, letterSpacing: 0.5, marginBottom: 6 },
    statValue: { fontFamily: FontFamily.headline, fontSize: 20, color: C.text },

    tabsRow: { flexDirection: 'row', gap: 24 },
    tabBtn: { paddingBottom: 10 },
    tabText: { fontFamily: FontFamily.mono, fontSize: 12, color: C.textMuted, letterSpacing: 0.3 },
    tabTextActive: { color: C.text, fontFamily: FontFamily.monoBold },
    tabUnderline: { height: 2, backgroundColor: '#F6BA00', borderRadius: 1, marginTop: 8 },

    h2: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.text, marginBottom: 12 },
    subLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: -8, marginBottom: 12 },
    bioText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 20 },

    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    whiteStatBox: { backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', minWidth: '30%', flexGrow: 1 },
    whiteStatLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#6b6b6b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
    whiteStatValue: { fontFamily: FontFamily.headline, fontSize: 20, color: '#232323' },

    breakdownLabel: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },
    breakdownValue: { fontFamily: FontFamily.headlineBold, fontSize: 14, color: C.text },
    breakdownTrack: { height: 6, backgroundColor: C.surfaceAlt, borderRadius: 3, overflow: 'hidden' },
    breakdownFill: { height: '100%', borderRadius: 3 },

    fitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    fitLogo: { width: 32, height: 32, borderRadius: 8 },
    fitName: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    fitPct: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
    fitTag: { fontFamily: FontFamily.mono, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
    fitBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100 },
    fitBadgeText: { fontFamily: FontFamily.headlineBold, fontSize: 13, color: '#fff' },

    quickRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    quickRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    quickLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    quickValue: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    sectionTitleSm: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.text, marginBottom: 12 },

    filmPromo: { borderRadius: 16, overflow: 'hidden', aspectRatio: 16 / 9, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
    filmPlayCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    filmPromoTitle: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
    filmPromoSub: { fontFamily: FontFamily.body, fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: -8 },
    filmPromoBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    filmPromoBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },

    videoBox: { aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface },
    emptyFilmBox: { alignItems: 'center', padding: 40, backgroundColor: C.surface, borderRadius: 12 },
    emptyFilmText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },

    chipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
    chipLabel: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#6b6b6b', letterSpacing: 0.4 },
    chipValue: { fontFamily: FontFamily.headline, fontSize: 17, color: '#232323' },

    actionBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopWidth: 1 },
    actBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
    actBtnMatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    statusPill: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
    statusPillText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13 },
  });
}
