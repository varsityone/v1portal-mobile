import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAthleteData } from '../../hooks/useAthleteData';
import { useAthleteScoreHistory } from '../../hooks/useAthleteScoreHistory';
import { isAthletePremium } from '../../lib/subscription';
import { supabase } from '../../lib/supabase';
import { PINK_RED, ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';
import { EmptyState } from '../../components/ui/EmptyState';
import ScoreAnimator from '../../components/ScoreAnimator';
import SurveyModal from '../../components/SurveyModal';
import RetakeCard from '../../components/results/RetakeCard';
import ScoreHistoryCard from '../../components/results/ScoreHistoryCard';
import PercentileCard from '../../components/results/PercentileCard';
import ScoreBreakdownCard from '../../components/results/ScoreBreakdownCard';
import UpsellCard from '../../components/results/UpsellCard';
import RecruitingGapCard from '../../components/results/RecruitingGapCard';
import RealityCheckCard from '../../components/results/RealityCheckCard';
import CompleteBanner from '../../components/results/CompleteBanner';

export default function ResultsScreen() {
  const C = useColors();
  const s = createStyles(C);
  const router = useRouter();
  const { athlete, assessment, loading } = useAthleteData();
  const { history } = useAthleteScoreHistory(athlete?.id);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkSurvey = async () => {
        const last = await AsyncStorage.getItem('v1-survey-done');
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const neverShown = !last || last === '1';
        const enoughTimePassed = !!last && last !== '1' && (Date.now() - parseInt(last)) > sevenDays;
        if (neverShown || enoughTimePassed) {
          setTimeout(() => setShowSurvey(true), 3000);
        }
      };
      checkSurvey();
    }, [])
  );

  useEffect(() => {
    const fetchPercentile = async () => {
      if (!athlete?.v1_score) return;
      const { data } = await supabase.rpc('get_score_percentile', { p_score: Math.round(athlete.v1_score) });
      if (data !== null && data !== undefined) setPercentile(data as number);
    };
    fetchPercentile();
  }, [athlete?.v1_score]);

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={PINK_RED} size="large" /></View>;
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
  const tier = assessment.recruiting_level as any;
  const tierLabel = typeof tier === 'string' ? tier : (tier?.level ?? '');
  const scoreBreakdown = assessment.score_breakdown as Record<string, unknown> | null;
  const scoreHistory = history.map(h => ({ score: Math.round(h.score), date: new Date(h.scored_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));

  const goToUpgrade = () => router.push('/(tabs)/upgrade' as any);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <ScoreAnimator finalScore={currentScore} duration={2000} recruitingLevel={tierLabel} />

      <RetakeCard />

      {scoreHistory.length >= 2 && <ScoreHistoryCard history={scoreHistory} />}

      {percentile !== null && <PercentileCard percentile={percentile} />}

      <ScoreBreakdownCard scoreBreakdown={scoreBreakdown} isPremium={isPremium} onUpgrade={goToUpgrade} />

      {!isPremium && <UpsellCard onUpgrade={goToUpgrade} />}

      <RecruitingGapCard v1Score={currentScore} />

      <RealityCheckCard
        scoreBreakdown={scoreBreakdown}
        gateResults={assessment.gate_results}
        developmentPotential={assessment.development_potential}
        developmentPathway={assessment.development_pathway}
      />

      <CompleteBanner isPremium={isPremium} onUpgrade={goToUpgrade} />

      {showSurvey && (
        <SurveyModal
          onClose={() => {
            AsyncStorage.setItem('v1-survey-done', Date.now().toString()).catch(() => {});
            setShowSurvey(false);
          }}
          source="results_page"
        />
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
  });
}
