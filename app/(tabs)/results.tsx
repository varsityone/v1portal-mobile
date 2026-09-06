import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAthleteData } from '../../hooks/useAthleteData';
import { useAthleteScoreHistory } from '../../hooks/useAthleteScoreHistory';
import { isAthletePremium } from '../../lib/subscription';
import { getRecruitingLevelBand } from '../../lib/recruitingLevels';
import { supabase } from '../../lib/supabase';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import ScoreAnimator from '../../components/ScoreAnimator';
import SurveyModal from '../../components/SurveyModal';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';

const SCORE_BREAKDOWN_CATEGORIES = [
  { key: 'production', label: 'Production', weight: 45 },
  { key: 'physical', label: 'Athletic', weight: 25 },
  { key: 'academic', label: 'Academic', weight: 15 },
  { key: 'intangibles', label: 'Intangibles', weight: 15 },
];

const TIERS = ['Low', 'Fair', 'Good', 'Strong', 'Elite'];

function tierIndex(value: number): number {
  if (value >= 80) return 4;
  if (value >= 60) return 3;
  if (value >= 40) return 2;
  if (value >= 20) return 1;
  return 0;
}

export default function ResultsScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { athlete, assessment, loading } = useAthleteData();
  const { history } = useAthleteScoreHistory();
  const [percentile, setPercentile] = useState<number | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkSurvey = async () => {
        try {
          const last = await AsyncStorage.getItem('v1-survey-done');
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          const neverShown = !last || last === '1';
          const enoughTimePassed = last && last !== '1' && (Date.now() - parseInt(last)) > sevenDays;
          if (neverShown || enoughTimePassed) {
            setTimeout(() => setShowSurvey(true), 3000);
          }
        } catch (e) {
          console.error('Survey check error:', e);
        }
      };
      checkSurvey();
    }, [])
  );

  useEffect(() => {
    const fetchPercentile = async () => {
      if (!athlete?.v1_score) return;
      try {
        const { data } = await supabase.rpc('get_score_percentile', { p_score: Math.round(athlete.v1_score) });
        if (data !== null && data !== undefined) {
          setPercentile(data as number);
        }
      } catch (e) {
        console.error('Percentile fetch error:', e);
      }
    };
    fetchPercentile();
  }, [athlete?.v1_score]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  if (!athlete || !assessment) {
    return (
      <View style={s.container}>
        <EmptyState
          icon="analytics"
          title="Complete Assessment"
          body="Take the V1 Assessment to see your recruiting profile and college fit analysis."
        />
      </View>
    );
  }

  const isPremium = isAthletePremium(athlete);
  const currentScore = Math.round(athlete.v1_score ?? 0);
  const band = getRecruitingLevelBand(currentScore);
  const scoreBreakdown = (assessment as any)?.score_breakdown ?? null;

  if (!isPremium) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Text style={s.eyebrow}>MY</Text>
          <Text style={s.title}>V1 Score</Text>
        </View>
        <ScoreAnimator finalScore={currentScore} recruitingLevel={band?.description} />
        <EmptyState
          icon="star"
          title="Unlock Full Results"
          body="Upgrade to Match+ to see detailed score breakdown, percentile ranking, recruiting gap analysis, and more."
          actionLabel="View Plans"
          onAction={() => router.push('/upgrade' as any)}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>MY</Text>
        <Text style={s.title}>V1 Score</Text>
      </View>

      {/* Animated score reveal */}
      <ScoreAnimator finalScore={currentScore} recruitingLevel={band?.description} />

      {/* Score breakdown grid (4 cards) */}
      <View style={s.breakdownGrid}>
        {SCORE_BREAKDOWN_CATEGORIES.map(({ key, label, weight }) => {
          const val = scoreBreakdown?.[key] ?? 0;
          return (
            <Card key={key} style={s.breakdownCard}>
              <Text style={s.breakdownCardLabel}>{label}</Text>
              <Text style={s.breakdownCardValue}>{val}</Text>
              <Text style={s.breakdownCardWeight}>{weight}% of score</Text>
              <StatTierBar activeIndex={tierIndex(val)} C={C} />
            </Card>
          );
        })}
      </View>

      {/* Percentile */}
      {percentile !== null && (
        <Card>
          <Text style={s.sectionTitle}>Percentile Ranking</Text>
          <View style={s.percentileDisplay}>
            <Text style={s.percentileValue}>{percentile}th</Text>
            <Text style={s.percentileLabel}>percentile among assessed athletes</Text>
          </View>
        </Card>
      )}

      {/* Score history */}
      {history.length >= 2 && (
        <Card>
          <Text style={s.sectionTitle}>Score History</Text>
          <View style={s.miniChart}>
            {history.slice(-10).map((h, i) => {
              const maxScore = Math.max(...history.slice(-10).map(x => x.v1_score));
              return (
                <View
                  key={i}
                  style={[
                    s.miniChartBar,
                    {
                      height: `${(h.v1_score / maxScore) * 100}%`,
                      backgroundColor: h.v1_score >= currentScore ? '#22c55e' : '#8b5cf6',
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={s.chartLabel}>{history.length} assessments recorded</Text>
        </Card>
      )}

      {/* Recruiting gap */}
      <Card>
        <Text style={s.sectionTitle}>Your Recruiting Gap</Text>
        <View style={s.gapAnalysis}>
          <View style={s.gapRow}>
            <Text style={s.gapLabel}>D1 Threshold</Text>
            <Text style={s.gapValue}>80+</Text>
            <View style={[s.gapIndicator, { backgroundColor: currentScore >= 80 ? '#22c55e' : '#ef4444' }]} />
          </View>
          <View style={s.gapRow}>
            <Text style={s.gapLabel}>FCS Threshold</Text>
            <Text style={s.gapValue}>65+</Text>
            <View style={[s.gapIndicator, { backgroundColor: currentScore >= 65 ? '#22c55e' : '#ef4444' }]} />
          </View>
          <View style={s.gapRow}>
            <Text style={s.gapLabel}>D2/D3 Range</Text>
            <Text style={s.gapValue}>50+</Text>
            <View style={[s.gapIndicator, { backgroundColor: currentScore >= 50 ? '#22c55e' : '#ef4444' }]} />
          </View>
        </View>
      </Card>

      {/* Reality check */}
      <Card style={s.realityCard}>
        <Text style={s.sectionTitle}>Reality Check</Text>
        <Text style={s.realityText}>
          {currentScore >= 80
            ? 'You\'re in D1 territory. Focus on film, measurables, and academic progress.'
            : currentScore >= 65
              ? 'Strong FCS prospect. Build a film highlight reel and contact programs directly.'
              : currentScore >= 50
                ? 'Competitive at D2/D3 level. Demonstrate coachability and game film quality.'
                : 'Build your profile. Work with coaches to identify and improve key areas.'}
        </Text>
      </Card>

      {/* Retake button */}
      <Pressable style={s.retakeBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
        <Text style={s.retakeBtnText}>Retake Assessment</Text>
      </Pressable>

      {showSurvey && (
        <SurveyModal
          onClose={() => {
            AsyncStorage.setItem('v1-survey-done', Date.now().toString()).catch(() => {});
            setShowSurvey(false);
          }}
        />
      )}
    </ScrollView>
  );
}

function StatTierBar({ activeIndex, C }: { activeIndex: number; C: ThemeColors }) {
  const s = StyleSheet.create({
    container: { display: 'flex', gap: 4, marginTop: 8, width: '100%', flexDirection: 'row' },
    tier: { flex: 1, alignItems: 'center' },
    bar: { height: 2, borderRadius: 1, marginBottom: 3 },
    label: { fontSize: 7, fontWeight: '500', textAlign: 'center' },
  });

  return (
    <View style={s.container}>
      {TIERS.map((t, i) => (
        <View key={t} style={s.tier}>
          <View style={[s.bar, { backgroundColor: i <= activeIndex ? C.text : C.border }]} />
          <Text style={[s.label, { color: i === activeIndex ? C.text : C.textDim }]}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    breakdownGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    breakdownCard: { flex: 1, minWidth: '48%', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
    breakdownCardLabel: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    breakdownCardValue: { fontFamily: FontFamily.headline, fontSize: 32, fontWeight: '900', color: C.text, marginBottom: 4 },
    breakdownCardWeight: { fontFamily: FontFamily.mono, fontSize: 10, fontWeight: '700', color: C.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 12 },

    percentileDisplay: { alignItems: 'center', paddingVertical: 12 },
    percentileValue: { fontFamily: FontFamily.headline, fontSize: 40, fontWeight: '900', color: C.primary, lineHeight: 44 },
    percentileLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 6 },

    miniChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 60, marginVertical: 12 },
    miniChartBar: { flex: 1, borderRadius: 2 },
    chartLabel: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 8 },

    gapAnalysis: { gap: 12 },
    gapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    gapLabel: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, color: C.text },
    gapValue: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.primary, minWidth: 40, textAlign: 'right' },
    gapIndicator: { width: 12, height: 12, borderRadius: 6 },

    realityCard: { backgroundColor: C.primary + '15', borderLeftWidth: 4, borderLeftColor: C.primary, marginBottom: 16 },
    realityText: { fontFamily: FontFamily.body, fontSize: 12, color: C.text, lineHeight: 18, marginTop: 8 },

    retakeBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    retakeBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#ffffff' },
  });
}
