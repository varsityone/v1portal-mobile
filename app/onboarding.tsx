import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { resolveHomeRoute } from '../lib/resolveHomeRoute';
import { supabase } from '../lib/supabase';
import { GRADIENT, SCORE_GRADIENT, PINK_RED } from '../constants/Colors';

const { width: W, height: H } = Dimensions.get('window');

// Phone frame sizing — kept modest so all slide content fits on small screens
const PHONE_W = Math.min(W * 0.56, 220);
const PHONE_H = PHONE_W * 2.09;
const SCREEN_H = PHONE_H - 6;

// The app's own primary CTA gradient (Sign In, Start Assessment, Find Players) —
// confirmed against the live app, not the Instagram-style purple/pink this
// deck used to show.
const CTA_GRADIENT = ['#ff0000', '#aa00ff'] as const;

// ── Shared chrome: hamburger + real wordmark, matching the app's actual
// drawer header (no avatar, no separate title bar) ────────────────────────

function MockHeader() {
  return (
    <View style={ns.header}>
      <View style={ns.burger}>
        <View style={ns.burgerLine} />
        <View style={ns.burgerLine} />
        <View style={ns.burgerLine} />
      </View>
      <Image source={require('../assets/logo-dark.png')} style={ns.headerLogo} resizeMode="contain" />
      <View style={{ width: 16 }} />
    </View>
  );
}

function TierLadder({ labels, activeIdx }: { labels: string[]; activeIdx: number }) {
  return (
    <View style={ns.tierLadderRow}>
      {labels.map((label, i) => {
        const reached = i <= activeIdx;
        return (
          <View key={label} style={ns.tierLadderItem}>
            <View style={[ns.tierBarSeg, { backgroundColor: reached ? '#fff' : 'rgba(255,255,255,0.3)' }]} />
            <Text style={[ns.tierBarLabel, { color: reached ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: i === activeIdx ? '800' : '500' }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Athlete screens ────────────────────────────────────────────────────────

function ScreenAthleteDashboard() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={ns.whiteCard}>
        <Text style={ns.eyebrow}>ATHLETE PORTAL DASHBOARD</Text>
        <Text style={ns.blackTitle}>Good evening, Kobee.</Text>
        <Text style={ns.graySub}>You've completed all 3 phases. Stay active.</Text>
        <View style={ns.tierRowWrap}>
          <View style={[ns.smallPill, { backgroundColor: '#FF9400' }]}><Text style={ns.smallPillTxt}>Match+</Text></View>
          <View style={[ns.smallPill, { backgroundColor: '#C800A7' }]}><Text style={ns.smallPillTxt}>FCS/D2 Prospect</Text></View>
        </View>
        <View style={ns.whiteBtn}><Text style={ns.whiteBtnTxt}>View Profile</Text><Ionicons name="arrow-forward" size={10} color="#ff3d1f" /></View>
      </View>

      <LinearGradient colors={SCORE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ns.scoreHero}>
        <Text style={ns.scoreHeroLabel}>V1 SCORE</Text>
        <Text style={ns.scoreHeroBig}>66</Text>
        <Text style={ns.scoreHeroSub}>FCS/D2 PROSPECT</Text>
        <TierLadder labels={['Dev', 'Emrg', 'Comp', 'Cont', 'Elite']} activeIdx={2} />
      </LinearGradient>

      <View style={ns.statCardWhite}>
        <Text style={ns.eyebrow}>MUTUAL MATCHES</Text>
        <Text style={ns.statBigNumber}>1</Text>
        <Text style={ns.statCaption}>Coaches who matched back with you</Text>
        <TierLadder2 labels={['Start', 'Build', 'Active', 'Strong', 'Elite']} activeIdx={1} dark />
      </View>
    </View>
  );
}

function TierLadder2({ labels, activeIdx, dark }: { labels: string[]; activeIdx: number; dark?: boolean }) {
  const onColor = dark ? '#0a0a0a' : '#fff';
  const offColor = dark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.3)';
  const offText = dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.4)';
  return (
    <View style={[ns.tierLadderRow, { marginTop: 8 }]}>
      {labels.map((label, i) => {
        const reached = i <= activeIdx;
        return (
          <View key={label} style={ns.tierLadderItem}>
            <View style={[ns.tierBarSeg, { backgroundColor: reached ? onColor : offColor }]} />
            <Text style={[ns.tierBarLabel, { color: reached ? onColor : offText, fontWeight: i === activeIdx ? '800' : '500' }]}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ScreenAthleteProfile() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={ns.photoWrap}>
        <LinearGradient colors={['#3a3a3f', '#141416']} style={StyleSheet.absoluteFill} />
        <Ionicons name="person" size={44} color="rgba(255,255,255,0.25)" style={{ alignSelf: 'center', marginTop: 28 }} />
        <LinearGradient colors={SCORE_GRADIENT} style={ns.scoreBadgeOuter}>
          <View style={ns.scoreBadgeInner}>
            <Text style={ns.scoreBadgeNum}>66</Text>
            <Text style={ns.scoreBadgeCap}>V1 SCORE</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={{ paddingHorizontal: 10, paddingTop: 8 }}>
        <Text style={ns.profileName}>Kobee Bolton</Text>
        <Text style={ns.profileMeta}>S · 6'1" · 187 lbs · Class of 2027</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Text style={ns.profileMetaDim}>Long Beach, CA</Text>
          <View style={{ flexDirection: 'row' }}>
            {[0, 1, 2, 3, 4].map(i => <Ionicons key={i} name="star" size={7} color="#F6BA00" />)}
          </View>
        </View>
      </View>
      <View style={ns.statTileRow}>
        {[['40 YD', '4.79s'], ['Shuttle', '4.4s'], ['Vert', '37"']].map(([l, v]) => (
          <View key={l} style={ns.statTile}>
            <Text style={ns.statTileLabel}>{l}</Text>
            <Text style={ns.statTileValue}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={ns.tabsRow}>
        <View style={ns.tabActive}><Text style={ns.tabActiveTxt}>Overview</Text></View>
        <Text style={ns.tabTxt}>Film</Text>
        <Text style={ns.tabTxt}>Stats</Text>
      </View>
    </View>
  );
}

function ScreenAthleteDivisions() {
  const rows = [
    { label: 'D1 FBS', pill: 'REACH', pillColor: PINK_RED, count: '4 programs available' },
    { label: 'D2', pill: 'YOUR LEVEL', pillColor: '#10b981', count: '12 programs available', highlight: true },
    { label: 'NAIA', pill: null, count: '2 programs available' },
    { label: 'NJCAA', pill: null, count: '2 programs available' },
  ];
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <Text style={ns.pageTitleWhite}>Choose Your Level</Text>
        <Text style={ns.pageSubGray}>Pick a division to start swiping.</Text>
      </View>
      <View style={{ paddingHorizontal: 10, marginTop: 10, gap: 6 }}>
        {rows.map(r => (
          <View key={r.label} style={[ns.divisionRow, r.highlight && ns.divisionRowHighlight]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={ns.divisionLabel}>{r.label}</Text>
                {r.pill && (
                  <View style={[ns.tinyPill, { backgroundColor: r.pillColor! }]}><Text style={ns.tinyPillTxt}>{r.pill}</Text></View>
                )}
              </View>
              <Text style={ns.divisionCount}>{r.count}</Text>
            </View>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.35)" />
          </View>
        ))}
      </View>
    </View>
  );
}

function ScreenAthleteSwipe() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={ns.pageTitleWhite}>Programs For You</Text>
          <Ionicons name="options-outline" size={13} color="rgba(255,255,255,0.6)" />
        </View>
        <View style={ns.swipeProgressTrack}><LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: '25%', height: '100%', borderRadius: 3 }} /></View>
        <View style={[ns.tinyPill, { backgroundColor: '#10b981', alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', gap: 3, alignItems: 'center' }]}>
          <Ionicons name="checkmark" size={8} color="#fff" /><Text style={ns.tinyPillTxt}>Verified</Text>
        </View>
      </View>
      <LinearGradient colors={['#2a1030', '#0d0812']} style={ns.swipeCardBg}>
        <View style={ns.swipeCardBottom}>
          <Text style={ns.swipeCoachName}>Carlos Rivera</Text>
          <Text style={ns.swipeCoachSub}>DB · Iowa State University</Text>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 5 }}>
            {['CB', 'S', 'DB'].map(t => (
              <View key={t} style={ns.tagPill}><Text style={ns.tagPillTxt}>{t}</Text></View>
            ))}
          </View>
        </View>
      </LinearGradient>
      <View style={ns.swipeActionRow}>
        <View style={ns.circleBtnDark}><Ionicons name="close" size={16} color="#fff" /></View>
        <LinearGradient colors={CTA_GRADIENT} style={ns.circleBtnBig}><Ionicons name="add" size={20} color="#fff" /></LinearGradient>
        <View style={ns.circleBtnDark}><Ionicons name="chatbubble-outline" size={13} color="#fff" /></View>
      </View>
    </View>
  );
}

function ScreenAthleteRoadmap() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={11} color="rgba(255,255,255,0.5)" />
          <Text style={ns.pageSubGray}>Dashboard</Text>
        </View>
        <Text style={ns.pageTitleWhite}>The Gameplan</Text>
      </View>
      <View style={{ paddingHorizontal: 12, marginTop: 8 }}>
        {[
          { n: 1, label: 'Know Your Value', done: true },
          { n: 2, label: 'Build Your Profile', done: true },
          { n: 3, label: 'Find Your Matches', active: true },
        ].map((p, i, arr) => (
          <View key={p.n} style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ alignItems: 'center' }}>
              {p.done ? (
                <View style={ns.timelineDot}><Ionicons name="checkmark" size={9} color="#000" /></View>
              ) : (
                <View style={[ns.timelineDot, ns.timelineDotActive]}><Text style={{ fontSize: 8, fontWeight: '800', color: '#833AB4' }}>{p.n}</Text></View>
              )}
              {i < arr.length - 1 && <View style={ns.timelineLine} />}
            </View>
            <Text style={[ns.timelineLabel, p.active && { color: '#fff', fontWeight: '800' }]}>{p.label}</Text>
          </View>
        ))}
      </View>
      <View style={[ns.tinyPill, { backgroundColor: PINK_RED, alignSelf: 'flex-start', marginLeft: 12, marginTop: 8 }]}>
        <Text style={ns.tinyPillTxt}>Phase 3</Text>
      </View>
      <Text style={[ns.pageTitleWhite, { fontSize: 14, marginHorizontal: 12, marginTop: 4 }]}>Find Your Matches</Text>
      <View style={ns.darkStatCard}>
        <Text style={ns.eyebrowDark}>MUTUAL MATCHES</Text>
        <Text style={ns.statBigNumberWhite}>1</Text>
        <Text style={ns.statCaptionDark}>A coach matched back — that's real interest.</Text>
        <View style={ns.pinkCtaBtn}><Text style={ns.pinkCtaTxt}>View My Matches →</Text></View>
      </View>
    </View>
  );
}

// ── Coach screens ──────────────────────────────────────────────────────────

function ScreenCoachDashboard() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={ns.whiteCard}>
        <Text style={ns.eyebrow}>COACH PORTAL DASHBOARD</Text>
        <Text style={ns.blackTitle}>Good evening, Coach Wes.</Text>
        <Text style={ns.graySub}>You have 1 active match.</Text>
        <View style={ns.tierRowWrap}>
          <View style={[ns.smallPill, { backgroundColor: '#FF9400' }]}><Text style={ns.smallPillTxt}>Verified Coach</Text></View>
          <View style={[ns.smallPill, { backgroundColor: '#1d1f23' }]}><Text style={ns.smallPillTxt}>D2</Text></View>
        </View>
        <View style={ns.whiteBtn}><Text style={ns.whiteBtnTxt}>View Profile</Text><Ionicons name="arrow-forward" size={10} color="#ff3d1f" /></View>
      </View>

      <LinearGradient colors={[PINK_RED, '#FF8820']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ns.findPlayersCard}>
        <View style={{ flex: 1 }}>
          <Text style={ns.findPlayersTitle}>Find Players</Text>
          <Text style={ns.findPlayersSub}>Swipe & match with athletes who fit your program</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </LinearGradient>

      <View style={ns.featureGridRow}>
        <View style={ns.featureCardDark}>
          <Ionicons name="map-outline" size={13} color="#fff" />
          <Text style={ns.featureCardTitle}>Recruiting Map</Text>
          <Text style={ns.featureCardSub}>Target states</Text>
        </View>
        <View style={ns.featureCardDark}>
          <Ionicons name="chatbubble-outline" size={13} color="#fff" />
          <Text style={ns.featureCardTitle}>Messages</Text>
          <Text style={ns.featureCardSub}>Reach out</Text>
        </View>
      </View>

      <View style={ns.statCardWhite}>
        <Text style={ns.eyebrow}>MATCHES</Text>
        <Text style={ns.statBigNumber}>1</Text>
        <Text style={ns.statCaption}>Athletes who matched back with you</Text>
        <TierLadder2 labels={['Start', 'Build', 'Active', 'Strong', 'Elite']} activeIdx={1} dark />
      </View>
    </View>
  );
}

function ScreenCoachProfile() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={ns.photoWrap}>
        <LinearGradient colors={['#3a3a3f', '#141416']} style={StyleSheet.absoluteFill} />
        <Ionicons name="american-football" size={40} color="rgba(255,255,255,0.22)" style={{ alignSelf: 'center', marginTop: 30 }} />
      </View>
      <View style={{ paddingHorizontal: 10, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text style={ns.profileName}>VarsityOne University</Text>
          <Ionicons name="checkmark-circle" size={11} color={PINK_RED} />
        </View>
        <Text style={ns.profileMeta}>Wes Starke · Head Coach · Division II</Text>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
          {['QB', 'WR', 'RB', 'CB'].map(p => (
            <View key={p} style={ns.needsPill}><Text style={ns.needsPillTxt}>{p}</Text></View>
          ))}
        </View>
      </View>
      <View style={ns.statTileRow}>
        {[['Division', 'D2'], ['Coaching', '22 yrs'], ['Min Score', '55+']].map(([l, v]) => (
          <View key={l} style={ns.statTile}>
            <Text style={ns.statTileLabel}>{l}</Text>
            <Text style={ns.statTileValue}>{v}</Text>
          </View>
        ))}
      </View>
      <View style={ns.tabsRow}>
        <View style={ns.tabActive}><Text style={ns.tabActiveTxt}>Overview</Text></View>
        <Text style={ns.tabTxt}>Contact</Text>
      </View>
      <View style={ns.quoteCard}>
        <Text style={ns.quoteCardLabel}>A NOTE TO ATHLETES</Text>
        <Text style={ns.quoteCardText}>"We recruit character first, ability second."</Text>
        <Text style={ns.quoteCardAuthor}>— Wes Starke, Head Coach</Text>
      </View>
    </View>
  );
}

function ScreenCoachSearch() {
  const athletes = [
    { name: 'Jayden Williams', meta: "WR · 6'2\" · Class of 2026", loc: 'Atlanta, GA', score: 94 },
    { name: 'Mason Clark', meta: "CB · 5'11\" · Class of 2026", loc: 'Tampa, FL', score: 91 },
  ];
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Text style={ns.pageTitleWhite}>Recruit Search</Text>
        <View style={ns.searchBar}>
          <Ionicons name="search" size={10} color="rgba(255,255,255,0.4)" />
          <Text style={ns.searchBarPh}>Search athletes by name or position</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
          {['Position', 'Class', 'State', 'More Filters'].map(f => (
            <View key={f} style={ns.filterChip}><Text style={ns.filterChipTxt}>{f} ⌄</Text></View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 }}>
          <Text style={ns.sectionHeadWhite}>Top Athletes</Text>
          <Text style={ns.viewAllPink}>View All ›</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 10, marginTop: 4, gap: 6 }}>
        {athletes.map(a => (
          <View key={a.name} style={ns.athleteRow}>
            <LinearGradient colors={['#4a4a52', '#222226']} style={ns.athleteAvatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Text style={ns.athleteName}>{a.name}</Text>
                <Ionicons name="checkmark-circle" size={8} color="#3b9dff" />
              </View>
              <Text style={ns.athleteMeta}>{a.meta}</Text>
              <Text style={ns.athleteMeta}>{a.loc}</Text>
              <View style={{ flexDirection: 'row', marginTop: 2 }}>
                {[0, 1, 2, 3, 4].map(i => <Ionicons key={i} name="star" size={6} color="#F6BA00" />)}
              </View>
            </View>
            <LinearGradient colors={SCORE_GRADIENT} style={ns.miniScoreRing}>
              <View style={ns.miniScoreInner}>
                <Text style={ns.miniScoreNum}>{a.score}</Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </View>
    </View>
  );
}

function ScreenCoachRoster() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Text style={ns.eyebrowDark}>COACH DASHBOARD</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={ns.pageTitleWhite}>My Roster</Text>
          <Text style={ns.pageSubGray}>1 match</Text>
        </View>
        <Text style={ns.pageSubGray}>Athletes who expressed mutual interest.</Text>
      </View>
      <View style={{ paddingHorizontal: 10, marginTop: 8 }}>
        <View style={ns.rosterRow}>
          <LinearGradient colors={['#4a4a52', '#222226']} style={ns.athleteAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={ns.athleteName}>Kobee Bolton</Text>
            <Text style={ns.athleteMeta}>S · Class of 2027 · CA</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={ns.rosterScore}>66 <Text style={{ fontSize: 6, color: 'rgba(255,255,255,0.4)' }}>V1</Text></Text>
            <Text style={ns.rosterToday}>Today</Text>
          </View>
        </View>
      </View>
      <Text style={ns.viewAllPink}>Find more players →</Text>
    </View>
  );
}

function ScreenCoachPipeline() {
  return (
    <View style={ns.root}>
      <MockHeader />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={11} color="rgba(255,255,255,0.5)" />
          <Text style={ns.pageSubGray}>Back to Recruiting</Text>
        </View>
        <Text style={ns.pageTitleWhite}>Recruiting Pipeline</Text>
        <Text style={ns.pageSubGray}>Track prospects from interest to signed.</Text>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={ns.pipelineTabActive}>
            <Text style={ns.pipelineTabActiveTxt}>All (2)</Text>
          </LinearGradient>
          {['Interested (1)', 'Contacted (1)', 'Visited (0)'].map(t => (
            <View key={t} style={ns.pipelineTab}><Text style={ns.pipelineTabTxt}>{t}</Text></View>
          ))}
        </View>
      </View>
      <View style={{ paddingHorizontal: 10, marginTop: 10, gap: 6 }}>
        {[
          { name: 'Kobee Bolton', status: 'Contacted' },
          { name: 'Jayden Williams', status: 'Interested' },
        ].map(p => (
          <View key={p.name} style={ns.prospectRow}>
            <Text style={ns.athleteName}>{p.name}</Text>
            <View style={ns.tinyPill}><Text style={ns.tinyPillTxt}>{p.status}</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Shared screen styles (new, matches the live app's real tokens) ─────────

const ns = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08080f' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 16, paddingBottom: 10,
  },
  burger: { gap: 3, width: 14 },
  burgerLine: { height: 1.4, backgroundColor: '#e8e9ea', borderRadius: 1 },
  headerLogo: { height: 12, width: 58 },

  whiteCard: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 8, marginBottom: 6, padding: 10 },
  eyebrow: { fontSize: 6.5, fontWeight: '700', color: 'rgba(0,0,0,0.4)', letterSpacing: 1, textTransform: 'uppercase' },
  eyebrowDark: { fontSize: 6.5, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' },
  blackTitle: { fontSize: 13, fontWeight: '900', color: '#0a0a0a', marginTop: 2 },
  graySub: { fontSize: 7, color: 'rgba(0,0,0,0.5)', marginTop: 2 },
  tierRowWrap: { flexDirection: 'row', gap: 4, marginTop: 6 },
  smallPill: { paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 10 },
  smallPillTxt: { fontSize: 6, fontWeight: '800', color: '#fff' },
  whiteBtn: {
    marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    borderRadius: 100, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  whiteBtnTxt: { fontSize: 7.5, fontWeight: '800', color: '#ff3d1f' },

  scoreHero: { marginHorizontal: 8, marginBottom: 6, borderRadius: 12, padding: 11, alignItems: 'center' },
  scoreHeroLabel: { fontSize: 7, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  scoreHeroBig: { fontSize: 30, fontWeight: '900', color: '#fff', lineHeight: 34 },
  scoreHeroSub: { fontSize: 7, fontWeight: '700', color: '#fff', marginBottom: 6 },
  tierLadderRow: { flexDirection: 'row', gap: 4, alignSelf: 'stretch' },
  tierLadderItem: { flex: 1, alignItems: 'center', gap: 2 },
  tierBarSeg: { height: 3, borderRadius: 2, width: '100%' },
  tierBarLabel: { fontSize: 5.5 },

  statCardWhite: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 8, padding: 10, alignItems: 'center' },
  statBigNumber: { fontSize: 24, fontWeight: '900', color: '#0a0a0a', lineHeight: 28 },
  statCaption: { fontSize: 6.5, fontWeight: '700', color: 'rgba(0,0,0,0.45)', textAlign: 'center', marginTop: 2 },
  statBigNumberWhite: { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 26 },
  statCaptionDark: { fontSize: 6.5, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 3, marginBottom: 8 },

  photoWrap: { height: SCREEN_H * 0.28, marginHorizontal: 0, position: 'relative', overflow: 'visible' },
  scoreBadgeOuter: { position: 'absolute', bottom: -14, right: 12, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scoreBadgeInner: { width: 33, height: 33, borderRadius: 17, backgroundColor: '#0c0c10', alignItems: 'center', justifyContent: 'center' },
  scoreBadgeNum: { fontSize: 10, fontWeight: '900', color: '#fff', lineHeight: 11 },
  scoreBadgeCap: { fontSize: 3.6, color: 'rgba(255,255,255,0.5)' },

  profileName: { fontSize: 12, fontWeight: '900', color: '#fff' },
  profileMeta: { fontSize: 7, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  profileMetaDim: { fontSize: 6.5, color: 'rgba(255,255,255,0.45)' },
  statTileRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 8, marginTop: 8 },
  statTile: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 6, alignItems: 'center' },
  statTileLabel: { fontSize: 5.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
  statTileValue: { fontSize: 9, fontWeight: '800', color: '#fff', marginTop: 1 },
  tabsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 10, marginTop: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#F6BA00', paddingBottom: 5 },
  tabActiveTxt: { fontSize: 7.5, fontWeight: '800', color: '#fff' },
  tabTxt: { fontSize: 7.5, color: 'rgba(255,255,255,0.4)', paddingBottom: 5 },

  pageTitleWhite: { fontSize: 15, fontWeight: '900', color: '#fff', marginTop: 2 },
  pageSubGray: { fontSize: 7, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

  divisionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 10, padding: 9 },
  divisionRowHighlight: { backgroundColor: 'rgba(16,185,129,0.12)' },
  divisionLabel: { fontSize: 9, fontWeight: '800', color: '#fff' },
  divisionCount: { fontSize: 6, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  tinyPill: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tinyPillTxt: { fontSize: 5.5, fontWeight: '800', color: '#fff' },

  swipeProgressTrack: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 6 },
  swipeCardBg: { flex: 1, marginTop: 8, marginHorizontal: 8, borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden' },
  swipeCardBottom: { padding: 10 },
  swipeCoachName: { fontSize: 12, fontWeight: '900', color: '#fff' },
  swipeCoachSub: { fontSize: 7, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  tagPill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  tagPillTxt: { fontSize: 5.5, fontWeight: '700', color: '#fff' },
  swipeActionRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, paddingVertical: 10 },
  circleBtnDark: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  circleBtnBig: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { backgroundColor: '#1d1f23', borderWidth: 2, borderColor: '#833AB4' },
  timelineLine: { width: 1.5, flex: 1, minHeight: 12, backgroundColor: 'rgba(255,255,255,0.15)' },
  timelineLabel: { fontSize: 8, color: 'rgba(255,255,255,0.5)', marginTop: 1, marginBottom: 8 },

  darkStatCard: { backgroundColor: '#121212', borderRadius: 12, marginHorizontal: 12, marginTop: 8, padding: 10, alignItems: 'center' },
  pinkCtaBtn: { backgroundColor: PINK_RED, borderRadius: 100, paddingVertical: 7, paddingHorizontal: 16 },
  pinkCtaTxt: { fontSize: 7.5, fontWeight: '800', color: '#fff' },

  findPlayersCard: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8, marginBottom: 6, borderRadius: 12, padding: 10 },
  findPlayersTitle: { fontSize: 10.5, fontWeight: '900', color: '#fff' },
  findPlayersSub: { fontSize: 6.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  featureGridRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 6 },
  featureCardDark: { flex: 1, backgroundColor: '#121212', borderRadius: 10, padding: 8, gap: 3 },
  featureCardTitle: { fontSize: 7, fontWeight: '800', color: '#fff' },
  featureCardSub: { fontSize: 5.5, color: 'rgba(255,255,255,0.4)' },

  needsPill: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  needsPillTxt: { fontSize: 6, fontWeight: '800', color: '#fff' },
  quoteCard: { backgroundColor: '#121212', borderLeftWidth: 2.5, borderLeftColor: '#F6BA00', borderRadius: 8, marginHorizontal: 10, marginTop: 9, padding: 9 },
  quoteCardLabel: { fontSize: 5.5, fontWeight: '700', color: '#F6BA00', letterSpacing: 0.5 },
  quoteCardText: { fontSize: 7, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 10 },
  quoteCardAuthor: { fontSize: 6, color: 'rgba(255,255,255,0.4)', marginTop: 4 },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6, marginTop: 7 },
  searchBarPh: { fontSize: 6, color: 'rgba(255,255,255,0.35)' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3 },
  filterChipTxt: { fontSize: 5.5, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  sectionHeadWhite: { fontSize: 8.5, fontWeight: '800', color: '#fff' },
  viewAllPink: { fontSize: 7, fontWeight: '700', color: PINK_RED, marginTop: 8, alignSelf: 'center' },

  athleteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 10, padding: 7 },
  athleteAvatar: { width: 30, height: 30, borderRadius: 15 },
  athleteName: { fontSize: 7.5, fontWeight: '800', color: '#fff' },
  athleteMeta: { fontSize: 5.6, color: 'rgba(255,255,255,0.5)', marginTop: 1 },
  miniScoreRing: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  miniScoreInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0c0c10', alignItems: 'center', justifyContent: 'center' },
  miniScoreNum: { fontSize: 8, fontWeight: '900', color: '#fff' },

  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 10, padding: 8 },
  rosterScore: { fontSize: 9, fontWeight: '900', color: '#833AB4' },
  rosterToday: { fontSize: 5.5, color: 'rgba(255,255,255,0.4)' },

  pipelineTab: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4 },
  pipelineTabTxt: { fontSize: 5.8, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  pipelineTabActive: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4 },
  pipelineTabActiveTxt: { fontSize: 5.8, fontWeight: '800', color: '#fff' },
  prospectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 9, padding: 8 },
});

// ── iPhone frame ──────────────────────────────────────────────────────────────

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={fr.outer}>
      {/* Side buttons */}
      <View style={[fr.btn, fr.volUp]} />
      <View style={[fr.btn, fr.volDn]} />
      <View style={[fr.btn, fr.power]} />
      {/* Frame */}
      <View style={fr.frame}>
        {/* Dynamic island */}
        <View style={fr.island} />
        {/* Screen */}
        <View style={fr.screen}>{children}</View>
        {/* Home bar */}
        <View style={fr.homeBar} />
      </View>
    </View>
  );
}

const fr = StyleSheet.create({
  outer: {
    width: PHONE_W,
    height: PHONE_H,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 30,
  },
  frame: {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 32,
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
    alignItems: 'center',
  },
  island: {
    position: 'absolute',
    top: 8,
    width: PHONE_W * 0.26,
    height: 9,
    backgroundColor: '#000',
    borderRadius: 5,
    zIndex: 10,
  },
  screen: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#08080f',
    overflow: 'hidden',
  },
  homeBar: {
    position: 'absolute',
    bottom: 5,
    width: PHONE_W * 0.28,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  btn: { position: 'absolute', backgroundColor: '#222', borderRadius: 2 },
  volUp:  { left: -2.5, top: PHONE_H * 0.2,  width: 2.5, height: PHONE_H * 0.065 },
  volDn:  { left: -2.5, top: PHONE_H * 0.29, width: 2.5, height: PHONE_H * 0.065 },
  power:  { right: -2.5, top: PHONE_H * 0.26, width: 2.5, height: PHONE_H * 0.1 },
});

// ── Slide data ────────────────────────────────────────────────────────────────

type Slide = {
  id: string;
  num: string;
  Screen: React.ComponentType | null;
  icon: React.ComponentProps<typeof Ionicons>['name'] | null;
  title: string;
  body: string;
  caption: string;
  cta?: boolean;
};

const ATHLETE_SLIDES: Slide[] = [
  {
    id: '1', num: '01', Screen: ScreenAthleteDashboard, icon: 'analytics-outline',
    title: 'Stop Guessing\nYour Recruiting\nLevel',
    body: 'Get your V1 Score and see exactly where you fit in college football.',
    caption: 'Know your value before\ncontacting coaches.',
  },
  {
    id: '2', num: '02', Screen: ScreenAthleteProfile, icon: 'person-outline',
    title: 'Create A Profile\nCoaches Can\nEvaluate',
    body: 'Upload film, measurables, academics, and stats in one place.',
    caption: 'Everything coaches\nneed at a glance.',
  },
  {
    id: '3', num: '03', Screen: ScreenAthleteDivisions, icon: 'school-outline',
    title: 'Discover Schools\nThat Match Your\nLevel',
    body: 'No more guessing which programs are realistic.',
    caption: 'Focus on opportunities\nthat fit your profile.',
  },
  {
    id: '4', num: '04', Screen: ScreenAthleteSwipe, icon: 'chatbubbles-outline',
    title: 'Match With Coaches\nWho Are Actually\nInterested',
    body: 'No cold emails, no guessing who to contact. Messaging only opens once a coach matches back with you.',
    caption: 'Real interest,\nnot guesswork.',
  },
  {
    id: '5', num: '05', Screen: ScreenAthleteRoadmap, icon: 'map-outline',
    title: 'Your Recruiting\nRoadmap',
    body: 'Complete each phase and get matched with programs that fit your level.',
    caption: 'One platform. One\npath forward.',
  },
  {
    id: '6', num: '06', Screen: null, icon: null,
    title: 'Ready To Build\nYour Future?',
    body: 'Thousands of athletes dream about playing at the next level. Start building the plan.',
    caption: '', cta: true,
  },
];

const COACH_SLIDES: Slide[] = [
  {
    id: '1', num: '01', Screen: ScreenCoachDashboard, icon: 'grid-outline',
    title: 'See Your Recruiting\nClass At A\nGlance',
    body: 'Track matches, messages, and recruiting activity from one dashboard.',
    caption: "Know your program's\npipeline at a glance.",
  },
  {
    id: '2', num: '02', Screen: ScreenCoachProfile, icon: 'shield-checkmark-outline',
    title: 'Build A Program\nProfile Athletes\nCan Trust',
    body: 'Share your needs, culture, and contact-period status up front.',
    caption: 'Everything recruits need\nto know before reaching out.',
  },
  {
    id: '3', num: '03', Screen: ScreenCoachSearch, icon: 'search-outline',
    title: 'Search Recruits\nThat Fit Your\nProgram',
    body: 'Filter by position, V1 Score range, state, and grad year.',
    caption: "No more scrolling film\nthat doesn't fit your needs.",
  },
  {
    id: '4', num: '04', Screen: ScreenCoachRoster, icon: 'add-circle-outline',
    title: 'Match With Athletes\nWho Are Actually\nInterested',
    body: 'Messaging opens only once an athlete matches back with you.',
    caption: 'Real interest,\nnot cold outreach.',
  },
  {
    id: '5', num: '05', Screen: ScreenCoachPipeline, icon: 'swap-horizontal-outline',
    title: 'Track Every Recruit,\nStart To\nSigned',
    body: 'Move prospects through Interested, Contacted, Visited, and Signed.',
    caption: 'One board for your\nwhole recruiting class.',
  },
  {
    id: '6', num: '06', Screen: null, icon: null,
    title: 'Ready To Build\nYour Roster?',
    body: 'Real prospects, real interest — start recruiting today.',
    caption: '', cta: true,
  },
];

// ── Slide component ───────────────────────────────────────────────────────────

function SlideItem({ item, onFinish, onLogin, ctaLabel }: { item: Slide; onFinish: () => void; onLogin: () => void; ctaLabel: string }) {
  if (item.cta) {
    return (
      <View style={[s.slide, s.ctaSlide, { width: W }]}>
        <Text style={s.num}>{item.num}</Text>
        <Image
          source={require('../assets/logo-mark.png')}
          style={s.ctaLogo}
          resizeMode="contain"
        />
        <View style={s.textBlock}>
          <Text style={[s.title, s.ctaTitle]}>{item.title}</Text>
          <Text style={s.body}>{item.body}</Text>
        </View>
        <Pressable onPress={onFinish}>
          <LinearGradient
            colors={CTA_GRADIENT}
            style={s.ctaBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.ctaBtnText}>{ctaLabel}</Text>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={onLogin} style={s.signInBtn}>
          <Text style={s.signInText}>Already have an account? <Text style={s.signInLink}>Sign In</Text></Text>
        </Pressable>
      </View>
    );
  }

  const { Screen } = item;
  return (
    <View style={[s.slide, { width: W }]}>
      {/* Slide number */}
      <Text style={s.num}>{item.num}</Text>

      {/* Title + body */}
      <View style={s.textBlock}>
        <Text style={s.title}>{item.title}</Text>
        <Text style={s.body}>{item.body}</Text>
      </View>

      {/* Phone frame */}
      <PhoneFrame>
        {Screen ? <Screen /> : null}
      </PhoneFrame>

      {/* Icon + caption */}
      <View style={s.captionWrap}>
        <View style={s.iconCircle}>
          <Ionicons name={item.icon ?? 'star-outline'} size={18} color="#833AB4" />
        </View>
        <Text style={s.caption}>{item.caption}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router  = useRouter();
  const { session } = useAuth();
  const flatRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const [role, setRole] = useState<'athlete' | 'coach' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRole() {
      if (!session?.user?.id) { if (!cancelled) setRole('athlete'); return; }
      const { data } = await supabase
        .from('athletes')
        .select('account_role')
        .or(`user_id.eq.${session.user.id},linked_user_id.eq.${session.user.id}`)
        .maybeSingle();
      if (!cancelled) setRole(data?.account_role === 'coach' ? 'coach' : 'athlete');
    }
    loadRole();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  const SLIDES = role === 'coach' ? COACH_SLIDES : ATHLETE_SLIDES;
  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('v1portal_onboarding_seen', '1');
    const dest = session?.user?.id ? await resolveHomeRoute(session.user.id) : '/(tabs)';
    router.replace(dest as any);
  };

  const goLogin = async () => {
    await AsyncStorage.setItem('v1portal_onboarding_seen', '1');
    router.replace('/(auth)/login');
  };

  const goNext = () => {
    if (isLast) { finish(); return; }
    const next = index + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  if (!role) {
    return <View style={s.root} />;
  }

  return (
    <View style={s.root}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        onMomentumScrollEnd={e => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        renderItem={({ item }) => (
          <SlideItem
            item={item}
            onFinish={finish}
            onLogin={goLogin}
            ctaLabel={role === 'coach' ? 'Start Recruiting' : 'Get My V1 Score'}
          />
        )}
        style={{ flex: 1 }}
      />

      {/* Bottom bar: dots + nav (hidden on CTA slide which has its own buttons) */}
      {!isLast && (
        <View style={s.bottomBar}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[s.dot, i === index ? s.dotActive : s.dotInactive]}
              />
            ))}
          </View>

          <View style={s.btnRow}>
            <Pressable onPress={finish} style={s.skipBtn}>
              <Text style={s.skipTxt}>Skip</Text>
            </Pressable>

            <Pressable onPress={goNext}>
              <LinearGradient
                colors={CTA_GRADIENT}
                style={s.nextBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={s.nextTxt}>Next</Text>
                <Ionicons name="arrow-forward" size={15} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050507' },

  slide: {
    flex: 1,
    paddingTop: H * 0.055,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  num: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: '#833AB4',
    letterSpacing: 1,
  },
  textBlock: { alignSelf: 'stretch', gap: 6 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.5)',
  },

  captionWrap: { alignItems: 'center', gap: 6 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(131,58,180,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(131,58,180,0.3)',
  },
  caption: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 17,
  },

  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 12,
    gap: 12,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 3, borderRadius: 2 },
  dotActive: { width: 20, backgroundColor: '#833AB4' },
  dotInactive: { width: 5, backgroundColor: 'rgba(255,255,255,0.2)' },

  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipBtn: { paddingVertical: 10, paddingRight: 16 },
  skipTxt: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 26, paddingVertical: 14, borderRadius: 100,
  },
  nextTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  // CTA slide (slide 6)
  ctaSlide: {
    justifyContent: 'center',
    gap: 20,
  },
  ctaLogo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
  },
  ctaTitle: {
    textAlign: 'center',
    fontSize: 30,
  },
  ctaBtn: {
    borderRadius: 100,
    paddingVertical: 17,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.2,
  },
  signInBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  signInText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
  },
  signInLink: {
    color: '#fff',
    fontWeight: '700',
  },
});
