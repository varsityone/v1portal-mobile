import { DEFAULT_PROFILE_IMAGE } from '../../../constants/ProfileImage';
import LoadingScreen from '../../../components/LoadingScreen';
import { useProfilePhoto } from '../../../lib/profilePhotos';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../../hooks/useCoachData';
import { GRADIENT, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';

const DIVISION_LABELS: Record<string, string> = {
  D1_FBS: 'FBS (Division I)',
  D1_FCS: 'FCS (Division I-AA)',
  D2: 'Division II',
  D3: 'Division III',
  NAIA: 'NAIA',
  NJCAA: 'Junior College (NJCAA)',
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'contact', label: 'Contact' },
];

export default function CoachProfileScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading } = useCoachData();
  const photoUrl = useProfilePhoto('coach_accounts', coach?.id, coach?.profile_photo_url);
  const [tab, setTab] = useState<'overview' | 'contact'>('overview');

  if (loading) return <LoadingScreen />;
  if (!coach) return null;

  const divisionLabel = coach.division ? (DIVISION_LABELS[coach.division] ?? coach.division) : null;
  const twitterHandle = coach.twitter ? `@${coach.twitter.replace(/^@/, '')}` : null;
  const coachLine = [coach.full_name, coach.title, twitterHandle].filter(Boolean).join(' · ');
  const metaLine = [divisionLabel, coach.region].filter(Boolean).join(' · ');
  const positionNeeds = coach.position_needs ?? [];
  const levelBands = coach.level_bands ?? [];

  const statCards = [
    { label: 'Division', value: divisionLabel },
    { label: 'Region', value: coach.region },
    { label: 'Years Coaching', value: coach.years_coaching ? `${coach.years_coaching} yrs` : null },
    { label: 'Positions Needed', value: positionNeeds.length > 0 ? positionNeeds.join(', ') : null },
    { label: 'Min V1 Score', value: coach.min_score != null ? `${coach.min_score}+` : null },
  ].filter(c => c.value);

  const programInfo = [
    { label: 'School', value: coach.school_name },
    { label: 'Coach', value: coach.full_name },
    { label: 'Title', value: coach.title },
    { label: 'Position Coached', value: coach.position_coached },
    { label: 'Division', value: divisionLabel },
    { label: 'Region', value: coach.region },
    { label: 'Years Coaching', value: coach.years_coaching ? `${coach.years_coaching} yrs` : null },
    { label: 'Min V1 Score', value: coach.min_score != null ? `${coach.min_score}+` : null },
  ].filter(f => f.value);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#09090B' }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={s.hero}>
        <Image source={photoUrl ? { uri: photoUrl } : DEFAULT_PROFILE_IMAGE} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
        <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(10,10,10,0.7)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

        <View style={s.heroTopRow}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.heroBackBtn}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={() => router.push('/(coach)/profile/edit' as any)} style={s.heroEditBtn}>
            <Ionicons name="pencil" size={13} color="#fff" />
            <Text style={s.heroEditBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        <View style={s.heroInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={s.heroName}>{coach.school_name}</Text>
            {coach.verified && (
              <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.verifiedPill}>
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                <Text style={s.verifiedPillText}>Verified</Text>
              </LinearGradient>
            )}
          </View>
          {coachLine ? <Text style={s.heroCoachLine}>{coachLine}</Text> : null}
          {metaLine ? <Text style={s.heroMeta}>{metaLine}</Text> : null}
          {positionNeeds.length > 0 && (
            <View style={s.needsRow}>
              <Text style={s.needsLabel}>NEEDS</Text>
              {positionNeeds.map(p => (
                <View key={p} style={s.needsPill}><Text style={s.needsPillText}>{p}</Text></View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={s.body}>
        {statCards.length > 0 && (
          <View style={s.statsRow}>
            {statCards.map(c => (
              <View key={c.label} style={s.statCard}>
                <Text style={s.statLabel}>{c.label.toUpperCase()}</Text>
                <Text style={s.statValue} numberOfLines={1}>{c.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.tabRow}>
          {TABS.map(t => (
            <Pressable key={t.id} onPress={() => setTab(t.id as 'overview' | 'contact')} style={s.tabBtn}>
              <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
              {tab === t.id && <View style={s.tabUnderline} />}
            </Pressable>
          ))}
        </View>

        {tab === 'overview' ? (
          <View style={{ marginTop: 20, gap: 20 }}>
            {coach.message_to_recruits ? (
              <View style={s.noteCard}>
                <Text style={s.h2}>A Note to Athletes and Parents</Text>
                <Text style={s.noteText}>“{coach.message_to_recruits}”</Text>
                {coachLine ? <Text style={s.noteAttribution}>- {coachLine}</Text> : null}
              </View>
            ) : null}

            {coach.bio ? (
              <View>
                <Text style={s.h2}>About</Text>
                <Text style={s.bodyText}>{coach.bio}</Text>
              </View>
            ) : null}

            {coach.previous_stops ? (
              <View>
                <Text style={s.h2}>Coaching Background</Text>
                <Text style={s.bodyTextSmall}>{coach.previous_stops}</Text>
              </View>
            ) : null}

            {programInfo.length > 0 && (
              <View>
                <Text style={s.h2}>Program Info</Text>
                <View style={s.infoGrid}>
                  {programInfo.map(f => (
                    <View key={f.label} style={s.infoCard}>
                      <Text style={s.infoLabel}>{f.label}</Text>
                      <Text style={s.infoValue} numberOfLines={2}>{f.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {(positionNeeds.length > 0 || levelBands.length > 0) && (
              <View style={s.focusCard}>
                <Text style={s.h2}>Recruiting Focus</Text>
                {positionNeeds.length > 0 && (
                  <View style={{ marginBottom: levelBands.length > 0 ? 16 : 0 }}>
                    <Text style={s.focusLabel}>Positions Needed</Text>
                    <View style={s.focusPillRow}>
                      {positionNeeds.map(p => <View key={p} style={s.focusPill}><Text style={s.focusPillText}>{p}</Text></View>)}
                    </View>
                  </View>
                )}
                {levelBands.length > 0 && (
                  <View>
                    <Text style={s.focusLabel}>Level Bands</Text>
                    <View style={s.focusPillRow}>
                      {levelBands.map(l => <View key={l} style={s.focusPill}><Text style={s.focusPillText}>{l}</Text></View>)}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={{ marginTop: 20, gap: 12 }}>
            {coach.school_email ? (
              <View style={s.contactRow}>
                <Text style={s.contactLabel}>Email</Text>
                <Text style={s.contactValue}>{coach.school_email}</Text>
              </View>
            ) : null}
            {coach.phone && coach.phone_public ? (
              <View style={s.contactRow}>
                <Text style={s.contactLabel}>Phone</Text>
                <Text style={s.contactValue}>{coach.phone}</Text>
              </View>
            ) : null}
            {twitterHandle ? (
              <View style={s.contactRow}>
                <Text style={s.contactLabel}>Twitter</Text>
                <Text style={s.contactValue}>{twitterHandle}</Text>
              </View>
            ) : null}
            {!coach.phone && !twitterHandle && (
              <Text style={s.bodyTextSmall}>You haven't shared additional contact info yet.</Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    hero: { height: 356, position: 'relative', overflow: 'hidden', backgroundColor: '#16171a' },
    heroFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#16171a' },
    heroFallbackLetter: { fontFamily: FontFamily.headline, fontSize: 88, color: 'rgba(255,255,255,0.12)' },
    heroTopRow: { position: 'absolute', top: 54, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroBackBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
    heroEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100 },
    heroEditBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: '#fff' },
    heroInfo: { position: 'absolute', left: 20, right: 20, bottom: 44 },
    heroName: { fontFamily: FontFamily.headline, fontSize: 26, color: '#fff' },
    verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100 },
    verifiedPillText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#fff' },
    heroCoachLine: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff', marginTop: 6 },
    heroMeta: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
    needsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    needsLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.8 },
    needsPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.14)' },
    needsPillText: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: '#fff' },

    body: { paddingHorizontal: 20, paddingTop: 0 },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -20, marginBottom: 8 },
    statCard: { minWidth: 100, flexGrow: 1, backgroundColor: C.surface, borderRadius: 14, padding: 12, alignItems: 'center' },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 9, color: C.textDim, marginBottom: 6, textAlign: 'center' },
    statValue: { fontFamily: FontFamily.headline, fontSize: 15, color: C.text, textAlign: 'center' },

    tabRow: { flexDirection: 'row', gap: 24, marginTop: 20, borderBottomWidth: 1, borderBottomColor: C.border },
    tabBtn: { paddingBottom: 10 },
    tabText: { fontFamily: FontFamily.mono, fontSize: 12, color: C.textDim },
    tabTextActive: { color: C.text, fontFamily: FontFamily.monoBold },
    tabUnderline: { height: 2, backgroundColor: '#F6BA00', marginTop: 8, borderRadius: 1 },

    h2: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.text, marginBottom: 10 },
    bodyText: { fontFamily: FontFamily.body, fontSize: 14, color: C.textMuted, lineHeight: 21 },
    bodyTextSmall: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, lineHeight: 19 },

    noteCard: { backgroundColor: C.surface, borderLeftWidth: 3, borderLeftColor: '#F6BA00', borderRadius: 12, padding: 18 },
    noteText: { fontFamily: FontFamily.body, fontSize: 14, color: C.text, lineHeight: 21, fontStyle: 'italic' },
    noteAttribution: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim, marginTop: 10 },

    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoCard: { flexGrow: 1, minWidth: 100, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
    infoLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, textAlign: 'center' },
    infoValue: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#232323', textAlign: 'center' },

    focusCard: { backgroundColor: C.surface, borderRadius: 16, padding: 20 },
    focusLabel: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    focusPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    focusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
    focusPillText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },

    contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14 },
    contactLabel: { fontFamily: FontFamily.bodyBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
    contactValue: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.text },
  });
}
