import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getRecruitingLevelBand } from '../lib/recruitingLevels';
import { Athlete } from '../hooks/useAthleteData';
import { ThemeColors, FLAME_GRADIENT } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';
import { useColors } from '../context/ThemeContext';

// Full port of web's app/dashboard/gameplan/ProfileGuidance.tsx — same four
// tabs, same tier-keyed copy, restyled with the flame/signal gradient system.

const TIER_LABEL: Record<string, string> = {
  elite_p4_fbs: 'FBS',
  strong_fbs_fcs: 'FCS',
  fcs_d2: 'D2',
  d2_d3_naia: 'D3/NAIA',
  juco_dev: 'NAIA/JUCO',
  dev_needed: 'JUCO/Prep',
};

function getTierGuidance(v1Score: number) {
  const bandKey = getRecruitingLevelBand(v1Score).key;
  if (bandKey === 'elite_p4_fbs') {
    return {
      title: 'FBS Prospect Profile',
      highlight: ['Elite athleticism', 'Production in elite competition', 'Physical dominance', 'Academic credentials'],
      filmFocus: 'Best-of highlights only (30-45 sec) showing elite plays',
      filmExamples: ['Most explosive runs/catches', 'Dominant defensive plays', 'Quality of competition'],
      caution: 'Do NOT include game film showing mistakes or coverage breakdowns',
    };
  } else if (bandKey === 'strong_fbs_fcs') {
    return {
      title: 'FCS Prospect Profile',
      highlight: ['Consistent production', 'Athleticism in quality competition', 'Game intelligence', 'Reliable hands/technique'],
      filmFocus: '2-3 min highlight reel showing production vs. good competition',
      filmExamples: ['Game-winning plays', '3-4 consecutive good plays showing technique', 'Plays against ranked opponents'],
      caution: 'Show consistency, not just peak moments',
    };
  } else if (bandKey === 'fcs_d2') {
    return {
      title: 'D2 Prospect Profile',
      highlight: ['Productive player', 'Solid athleticism', 'Football intelligence', 'Coachability'],
      filmFocus: '3-5 min game film showing actual game performance',
      filmExamples: ['Full series of plays (5-7 snaps)', 'Shows reads/decision-making', 'Mix of good and developing technique'],
      caution: 'Include some game footage with context, not just highlights',
    };
  } else if (bandKey === 'd2_d3_naia') {
    return {
      title: 'D3/NAIA Prospect Profile',
      highlight: ['Fundamental soundness', 'Work ethic and development', 'Academic profile', 'Character'],
      filmFocus: '5-8 min of actual game film showing effort and improvement',
      filmExamples: ['Multiple plays from same game', 'Shows development over season', 'Effort on every snap'],
      caution: 'Coaches want to see you PLAY, not just highlights',
    };
  } else if (bandKey === 'juco_dev') {
    return {
      title: 'NAIA/JUCO Prospect Profile',
      highlight: ['Work ethic', 'Character and coachability', 'Room for growth', 'Foundation skills'],
      filmFocus: 'Full game film or significant game excerpts (15-20 min)',
      filmExamples: ['Show you can play collegiately', 'Effort and consistency', 'Defensive awareness'],
      caution: 'Length matters less than showing you can compete',
    };
  }
  return {
    title: 'JUCO Development Track Profile',
    highlight: ['Potential to develop', 'Character', 'Work ethic', 'Physical foundation'],
    filmFocus: 'Game film showing effort and coachability (20+ min)',
    filmExamples: ['Full game footage', 'Show consistent effort', 'Willingness to learn'],
    caution: 'Coaches recruiting JUCO want upside, not polish',
  };
}

function isAthletePremium(athlete: Athlete | null): boolean {
  if (!athlete) return false;
  const trialActive = athlete.subscription_status === 'trial' &&
    (!athlete.trial_ends_at || new Date(athlete.trial_ends_at) > new Date());
  return athlete.subscription_status === 'active' || trialActive || !!athlete.is_admin || !!athlete.manual_access;
}

const HIGHLIGHT_ICONS: React.ComponentProps<typeof Ionicons>['name'][] = ['bar-chart', 'film', 'fitness', 'book'];
const HIGHLIGHT_DESCS = [
  'Game statistics, measurables, accolades',
  'Quality film, game highlights, production',
  'Strength numbers, athletic testing, speed',
  'GPA, test scores, academic standing',
];

const CHECKLIST_ITEMS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: (tier: string) => string }[] = [
  { icon: 'person', title: 'Profile Photo', desc: () => 'Clear headshot, professional (no party pics), in uniform if possible' },
  { icon: 'clipboard', title: 'Position & Physical', desc: tier => `Position, Height, Weight, 40-time — key measurables for ${tier}` },
  { icon: 'bar-chart', title: 'Stats & Production', desc: () => 'Season stats (yards, TDs, tackles, etc) with context (team record, competition)' },
  { icon: 'school', title: 'Academic Info', desc: () => 'GPA, test scores (SAT/ACT), graduation year, course load (honors/AP)' },
  { icon: 'film', title: 'Film Link', desc: () => 'Hudl profile or highlight reel link — MUST be easily accessible' },
  { icon: 'phone-portrait', title: 'Contact Info', desc: () => 'Email (professional), phone, twitter/instagram handles (if clean)' },
  { icon: 'pencil', title: 'Bio', desc: () => '2-3 sentences: position, tier fit, what makes you valuable for coaches' },
  { icon: 'trophy', title: 'Accolades', desc: () => 'All-conference, all-state, team captain, awards, recognitions' },
];

const POSITION_TIPS: { pos: string; tips: string[] }[] = [
  { pos: 'QB', tips: ['Show decision-making (progressions)', 'Include completions AND incompletions (accuracy)', 'Mix of game film and pocket presence'] },
  { pos: 'RB', tips: ['Vision (following blocks)', 'Contact balance (not falling forward)', 'Receiving ability (pass catching)'] },
  { pos: 'WR', tips: ['Route running (crisp stems)', 'Hands (catches away from body)', 'Contested catches (wins 50/50s)'] },
  { pos: 'OL', tips: ['Pass protection footwork', 'Run blocking technique', 'Plays vs. good DL (not just 2A teams)'] },
  { pos: 'DL', tips: ['Pass rush moves (variety)', 'Gap discipline', 'Effort on every play'] },
  { pos: 'LB', tips: ['Pursuit angles', 'Tackling form', 'Coverage ability'] },
  { pos: 'DB', tips: ['Man coverage (footwork)', 'Ball skills (INTs, PDs)', 'Tackling (safety value)'] },
];

const ACADEMIC_TIER_ROWS = [
  { tier: 'FBS (85+)', focus: 'Academic profile is NON-NEGOTIABLE', emphasis: '3.5+ GPA, 1300+ SAT (29+ ACT). Many FBS programs have academic minimums. You need credentials.' },
  { tier: 'FCS (75-84)', focus: 'Academic profile matters', emphasis: '3.2+ GPA, 1200+ SAT (26+ ACT). Shows you can graduate and stay eligible.' },
  { tier: 'D2 (65-74)', focus: 'Academic profile is important', emphasis: '3.0+ GPA, 1100+ SAT (24+ ACT). D2s have stronger academic standards.' },
  { tier: 'D3/NAIA (55-64)', focus: 'Academic profile is critical', emphasis: '3.0+ GPA, solid test scores. Some D3s are as selective as small colleges. NAIA more flexible.' },
  { tier: 'JUCO (45-54)', focus: 'Less emphasis initially', emphasis: 'Good H.S. GPA helps, but JUCO accepts more athletes. Get strong grades at JUCO to transfer up.' },
  { tier: 'Development (below 45)', focus: 'Academics are your leverage right now', emphasis: 'Grades and eligibility matter most while you build the physical/production profile — a clean academic record keeps every future door open.' },
];

const ELIGIBILITY_ITEMS = [
  { item: 'Register with NCAA Eligibility Center', status: 'CRITICAL', timeline: "Now - don't wait" },
  { item: 'Get H.S. transcripts registered', status: 'CRITICAL', timeline: 'Before senior year' },
  { item: 'Take SAT/ACT and submit scores', status: 'CRITICAL', timeline: 'Before December senior year' },
  { item: 'Maintain 2.3+ GPA (NCAA requirement)', status: 'CRITICAL', timeline: 'Every semester' },
  { item: 'Complete core courses (16 total required)', status: 'HIGH', timeline: 'Check with college advisor' },
];

const PHONE_TIPS = [
  { title: 'Answer Calls', desc: 'Unknown number? Answer it. That might be a coach. Or call back if you miss it.' },
  { title: 'Set Up Voicemail', desc: 'Professional greeting with YOUR name. "Hi, you\'ve reached [Name]. Leave a message."' },
  { title: 'Keep Phone Available', desc: 'During fall/spring recruiting periods, keep your phone charged and with you.' },
  { title: 'Have a Quiet Place', desc: 'When a coach calls, you want to talk in a place where they can hear you clearly.' },
];

const SOCIAL_ITEMS = [
  { item: 'Delete/hide party photos, drinking, profanity', priority: 'ASAP' },
  { item: 'Delete offensive comments or old tweets', priority: 'ASAP' },
  { item: 'Make accounts private if you have sensitive posts', priority: 'This week' },
  { item: 'Post quality football content (highlights, workouts, game clips)', priority: 'Ongoing' },
  { item: "Follow college programs you're interested in", priority: 'Good signal' },
  { item: 'Keep bio clean and football-focused', priority: 'Update now' },
];

const TABS = [
  { id: 'optimization', label: 'Profile Optimization' },
  { id: 'film', label: 'Film Editing' },
  { id: 'academic', label: 'Academic Positioning' },
  { id: 'contact', label: 'Contact Setup' },
] as const;

export default function ProfileGuidance({ athlete, v1Score }: { athlete: Athlete | null; v1Score: number | null }) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('optimization');

  if (v1Score == null) return null;

  const isPremium = isAthletePremium(athlete);
  const tier = TIER_LABEL[getRecruitingLevelBand(v1Score).key];
  const guidance = getTierGuidance(v1Score);

  return (
    <View style={s.root}>
      <Text style={s.heading}>Profile Strategy Tips</Text>
      <Text style={s.sub}>For {tier} recruits, here's what coaches actually look for and how to present it.</Text>

      {isPremium ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsRow}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={s.tab}>
                <Text style={[s.tabText, active && s.tabTextActive]}>{tab.label}</Text>
                {active && <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.tabUnderline} />}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <View style={s.lockCard}>
          <LinearGradient colors={['#C0007A', '#FF5341']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.lockIcon}>
            <Ionicons name="lock-closed" size={22} color="#fff" />
          </LinearGradient>
          <Text style={s.lockTitle}>Unlock Your Profile Optimization</Text>
          <Text style={s.lockDesc}>
            Your profile info is saved. Upgrade to Pro to get personalized film guidance, academic positioning,
            contact setup, and tier-specific optimization built around your V1 Score.
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/upgrade' as any)}>
            <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.upgradeBtn}>
              <Text style={s.upgradeBtnText}>Upgrade to Pro →</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}

      {isPremium && activeTab === 'optimization' && (
        <View style={s.stack}>
          <View style={s.card}>
            <Text style={s.cardTitle}>What to Highlight</Text>
            <View style={s.tileGrid}>
              {guidance.highlight.map((item, idx) => (
                <View key={idx} style={s.tile}>
                  <LinearGradient colors={['#EA0C5F', '#FF8820']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.tileIcon}>
                    <Ionicons name={HIGHLIGHT_ICONS[idx]} size={14} color="#fff" />
                  </LinearGradient>
                  <Text style={s.tileTitle}>{item}</Text>
                  <Text style={s.tileDesc}>{HIGHLIGHT_DESCS[idx]}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Public Athlete Profile Checklist</Text>
            <Text style={s.cardSub}>Every coach will look at your profile. Make sure it has these essentials:</Text>
            <View style={s.list}>
              {CHECKLIST_ITEMS.map((item, idx) => (
                <View key={idx} style={s.listRow}>
                  <Ionicons name={item.icon} size={18} color="#ff8820" style={s.listIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.title}</Text>
                    <Text style={s.listDesc}>{item.desc(tier)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {isPremium && activeTab === 'film' && (
        <View style={s.stack}>
          <View style={s.card}>
            <Text style={s.cardTitle}>What Coaches Actually Watch</Text>
            <Text style={s.cardSub}>Coaches are busy. They don't watch full game film. Here's what they ACTUALLY look for:</Text>
            <View style={s.callout}>
              <Text style={s.calloutTitle}>Target Film Length: {guidance.filmFocus}</Text>
              <Text style={s.calloutDesc}>
                Keep it short, impactful. Better a 45-second reel of your BEST plays than 5 minutes of mediocre ones.
              </Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>What to Include in Your Highlight Reel</Text>
            <View style={s.list}>
              {guidance.filmExamples.map((example, idx) => (
                <View key={idx} style={s.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>#{idx + 1}: {example}</Text>
                    <Text style={s.listDesc}>
                      {idx === 0 && "Only include plays you're proud of. Coaches judge QUICKLY. Bad plays early = they stop watching."}
                      {idx === 1 && "Shows consistency and technique. One good play isn't enough to get offered."}
                      {idx === 2 && 'Proves you can compete at level. Ranked teams = more credibility.'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Position-Specific Film Tips</Text>
            <View style={s.list}>
              {POSITION_TIPS.map((item, idx) => (
                <View key={idx} style={s.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.pos}</Text>
                    {item.tips.map((tip, i) => (
                      <Text key={i} style={s.ulItem}>• {tip}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={s.warn}>
            <View style={s.warnTitleRow}>
              <Ionicons name="warning" size={15} color="#ef4444" />
              <Text style={s.warnTitle}>What NOT to Include</Text>
            </View>
            <Text style={s.warnDesc}>{guidance.caution}</Text>
          </View>
        </View>
      )}

      {isPremium && activeTab === 'academic' && (
        <View style={s.stack}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Academic Strategy by Tier</Text>
            <Text style={s.cardSub}>Academic emphasis changes DRAMATICALLY by tier. Here's where to focus:</Text>
            <View style={s.list}>
              {ACADEMIC_TIER_ROWS.map((item, idx) => (
                <View key={idx} style={s.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.tier}</Text>
                    <Text style={s.listFocus}>{item.focus}</Text>
                    <Text style={s.listDesc}>{item.emphasis}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>NCAA Eligibility Checklist</Text>
            <Text style={s.cardSub}>Before coaches even recruit you, they verify eligibility. Get ahead of this NOW:</Text>
            <View style={s.list}>
              {ELIGIBILITY_ITEMS.map((item, idx) => (
                <View key={idx} style={s.listRow}>
                  <View style={[s.badge, item.status === 'CRITICAL' ? s.badgeCritical : s.badgeHigh]}>
                    <Text style={[s.badgeText, item.status === 'CRITICAL' ? s.badgeTextCritical : s.badgeTextHigh]}>{item.status}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.item}</Text>
                    <Text style={s.listTimeline}>{item.timeline}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {isPremium && activeTab === 'contact' && (
        <View style={s.stack}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Professional Email Setup</Text>
            <Text style={s.cardSub}>Coaches email you first. Make sure you have a professional email they'll respect:</Text>
            <View style={s.callout}>
              <View style={s.doRow}>
                <Ionicons name="checkmark-circle" size={14} color={C.success} />
                <Text style={[s.doText, { color: C.success }]}>DO THIS:</Text>
              </View>
              <Text style={s.calloutDesc}>
                firstname.lastname@gmail.com{'\n'}firstname.lastnameYEAR@gmail.com{'\n'}OR use your high school email (if professional)
              </Text>
              <View style={s.dontRow}>
                <Ionicons name="close-circle" size={14} color="#ef4444" />
                <Text style={s.dontText}>DON'T DO THIS:</Text>
              </View>
              <Text style={s.calloutDesc}>
                partyguy420@gmail.com{'\n'}ballin_out_247@yahoo.com{'\n'}your_crush_7@gmail.com
              </Text>
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Phone Setup</Text>
            <Text style={s.cardSub}>Coaches WILL call you. Be prepared:</Text>
            <View style={s.list}>
              {PHONE_TIPS.map((item, idx) => (
                <View key={idx} style={s.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.listTitle}>{item.title}</Text>
                    <Text style={s.listDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Social Media Audit</Text>
            <Text style={s.cardSub}>Coaches check your social media. A LOT. Clean it up now:</Text>
            <View style={s.list}>
              {SOCIAL_ITEMS.map((item, idx) => (
                <View key={idx} style={[s.listRow, s.listRowSpread]}>
                  <Text style={[s.listDesc, { flex: 1 }]}>{item.item}</Text>
                  <View style={s.priorityBadge}>
                    <Text style={s.priorityText}>{item.priority}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { marginTop: 28 },
    heading: { fontFamily: FontFamily.headlineBold, fontSize: 17, color: C.text, marginBottom: 4 },
    sub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginBottom: 16 },

    tabsScroll: { marginBottom: 18 },
    tabsRow: { borderBottomWidth: 1, borderBottomColor: C.border },
    tab: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 18 },
    tabText: { fontFamily: FontFamily.bodyBold, fontSize: 12.5, color: C.textDim },
    tabTextActive: { color: C.text },
    tabUnderline: { height: 2, borderRadius: 1, marginTop: 9, position: 'absolute', bottom: -1, left: 0, right: 0 },

    lockCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 28, alignItems: 'center' },
    lockIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    lockTitle: { fontFamily: FontFamily.headlineBold, fontSize: 15, color: C.text, marginBottom: 8, textAlign: 'center' },
    lockDesc: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 19, textAlign: 'center', marginBottom: 20, maxWidth: 320 },
    upgradeBtn: { borderRadius: 100, paddingVertical: 13, paddingHorizontal: 24 },
    upgradeBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },

    stack: { gap: 16 },
    card: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 20 },
    cardTitle: { fontFamily: FontFamily.headlineBold, fontSize: 14, color: C.text, marginBottom: 12 },
    cardSub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: -8, marginBottom: 14 },

    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 13, width: '47%' },
    tileIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
    tileTitle: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text, marginBottom: 3 },
    tileDesc: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, lineHeight: 15 },

    list: { gap: 8 },
    listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 12 },
    listRowSpread: { alignItems: 'center', justifyContent: 'space-between' },
    listIcon: { marginTop: 1, flexShrink: 0 },
    listTitle: { fontFamily: FontFamily.bodyBold, fontSize: 12.5, color: C.text, marginBottom: 3 },
    listDesc: { fontFamily: FontFamily.body, fontSize: 11.5, color: C.textMuted, lineHeight: 16 },
    listFocus: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.textMuted, marginBottom: 3 },
    listTimeline: { fontFamily: FontFamily.body, fontSize: 10, color: C.textDim, marginTop: 2 },
    ulItem: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, marginTop: 3, lineHeight: 15 },

    callout: { backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: 11, padding: 14 },
    calloutTitle: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text, marginBottom: 6 },
    calloutDesc: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, lineHeight: 17 },
    doRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 6 },
    doText: { fontFamily: FontFamily.bodyBold, fontSize: 11 },
    dontRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, marginBottom: 6 },
    dontText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#ef4444' },

    warn: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: '#ef4444', borderRadius: 16, padding: 16 },
    warnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    warnTitle: { fontFamily: FontFamily.headlineBold, fontSize: 12, color: '#ef4444' },
    warnDesc: { fontFamily: FontFamily.body, fontSize: 11, color: C.textMuted, lineHeight: 17 },

    badge: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
    badgeCritical: { backgroundColor: 'rgba(239,68,68,0.1)' },
    badgeHigh: { backgroundColor: 'rgba(251,191,36,0.1)' },
    badgeText: { fontFamily: FontFamily.bodyBold, fontSize: 9 },
    badgeTextCritical: { color: '#ef4444' },
    badgeTextHigh: { color: C.warning },
    priorityBadge: { backgroundColor: 'rgba(255,136,32,0.14)', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, flexShrink: 0 },
    priorityText: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#ff8820' },
  });
}
