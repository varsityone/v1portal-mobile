import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAthleteData } from '../../hooks/useAthleteData';
import { getRecruitingLevelBand, starsForScore } from '../../lib/recruitingLevels';
import { supabase } from '../../lib/supabase';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

export default function DashboardScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { athlete, loading } = useAthleteData();
  const [mutualMatches, setMutualMatches] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        if (!athlete?.id) return;
        setLoadingStats(true);
        try {
          const [matchRes, msgRes] = await Promise.all([
            supabase.from('swipes').select('id', { count: 'exact' }).eq('athlete_id', athlete.id).eq('mutual_match', true),
            supabase.from('coach_athlete_messages').select('id', { count: 'exact' }).eq('athlete_id', athlete.id).eq('read', false),
          ]);
          setMutualMatches(matchRes.count ?? 0);
          setUnreadMessages(msgRes.count ?? 0);
        } catch (e) {
          console.error('Load stats error:', e);
        } finally {
          setLoadingStats(false);
        }
      };
      loadStats();
    }, [athlete?.id])
  );

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!athlete) {
    return <View style={s.container}><EmptyState icon="person" title="Complete Setup" body="Finish your profile to get started." /></View>;
  }

  const currentScore = Math.round(athlete.v1_score ?? 0);
  const band = getRecruitingLevelBand(currentScore);
  const firstName = athlete.full_name?.split(' ')[0] || 'Athlete';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Card style={s.greetingCard}>
        <Text style={s.label}>ATHLETE PORTAL DASHBOARD</Text>
        <Text style={s.greeting}>Good afternoon, {firstName}.</Text>
        <Text style={s.subtitle}>You've completed all 3 phases. Stay active and keep pushing.</Text>
        <Pressable style={s.viewProfileBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
          <Text style={s.viewProfileText}>View Profile →</Text>
        </Pressable>
      </Card>

      <Card style={s.scoreCard}>
        <LinearGradient colors={[C.primary, '#E1306C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.scoreGradient}>
          <Text style={s.scoreLabel}>V1 SCORE</Text>
          <Text style={s.scoreValue}>{currentScore}</Text>
          <Text style={s.scoreTier}>{band?.level || 'Unrated'}</Text>
        </LinearGradient>
      </Card>

      <Card>
        <Text style={s.statLabel}>MUTUAL MATCHES</Text>
        <Text style={s.statValue}>{loadingStats ? '—' : mutualMatches}</Text>
        <Text style={s.statDesc}>Coaches who matched back with you. Real interest, real opportunity.</Text>
      </Card>

      <Card>
        <Text style={s.statLabel}>UNREAD MESSAGES</Text>
        <Text style={s.statValue}>{loadingStats ? '—' : unreadMessages}</Text>
        <Text style={s.statDesc}>From coaches & programs that matched with you</Text>
      </Card>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    greetingCard: { marginBottom: 20 },
    label: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, letterSpacing: 1, marginBottom: 8 },
    greeting: { fontFamily: FontFamily.headline, fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 6 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 12 },
    viewProfileBtn: { paddingVertical: 8, paddingHorizontal: 12 },
    viewProfileText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.primary },
    scoreCard: { marginBottom: 20 },
    scoreGradient: { padding: 24, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    scoreLabel: { fontFamily: FontFamily.mono, fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: 1, marginBottom: 12 },
    scoreValue: { fontFamily: FontFamily.headline, fontSize: 64, fontWeight: '900', color: '#fff', marginBottom: 4 },
    scoreTier: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
    statLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, letterSpacing: 1, marginBottom: 8 },
    statValue: { fontFamily: FontFamily.headline, fontSize: 44, fontWeight: '900', color: C.text, marginBottom: 8 },
    statDesc: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 18 },
  });
}
