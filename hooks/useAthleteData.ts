import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Athlete {
  id: string;
  full_name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  v1_score: number | null;
  recruiting_tier: string | null;
  recruiting_level: string | null;
  subscription_status: string | null;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  height: string | null;
  weight: string | null;
  gpa: number | string | null;
  position: string | null;
  graduation_year: number | string | null;
  high_school: string | null;
  city: string | null;
  state: string | null;
  hudl_link: string | null;
  hudl_video_link: string | null;
  phone: string | null;
  bio: string | null;
  ncaa_id: string | null;
  sat_score: number | null;
  act_score: number | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  target_list_saved_at: string | null;
  test_scores_not_taken: boolean | null;
}

export interface ScoreBreakdown {
  athletic?: number;
  physical?: number;
  production?: number;
  intangibles?: number;
  academic?: number;
  competitionMultiplier?: string;
}

export interface Assessment {
  id: string;
  v1_score: number;
  score_breakdown: ScoreBreakdown | null;
  gate_results: Record<string, unknown> | null;
  development_potential: Record<string, unknown> | null;
  development_pathway: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
}

export interface AthleteData {
  athlete: Athlete | null;
  assessment: Assessment | null;
  percentile: number | null;
  isPremium: boolean;
  isTrial27: boolean;
  loading: boolean;
  refresh: () => void;
}

export function useAthleteData(): AthleteData {
  const { session } = useAuth();
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);

    const userId = session.user.id;

    const { data: ath } = await supabase
      .from('athletes')
      .select('id, full_name, email, profile_photo_url, v1_score, recruiting_tier, recruiting_level, subscription_status, subscription_tier, trial_ends_at, height, weight, gpa, position, graduation_year, high_school, city, state, hudl_link, hudl_video_link, phone, bio, ncaa_id, sat_score, act_score, test_scores_not_taken, guardian_name, guardian_relationship, guardian_phone, guardian_email, target_list_saved_at')
      .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
      .maybeSingle();

    setAthlete(ath ?? null);

    if (ath) {
      const { data: rows } = await supabase
        .from('assessments')
        .select('id, v1_score, score_breakdown, gate_results, development_potential, development_pathway, completed_at, created_at, responses')
        .eq('athlete_id', ath.id)
        .not('v1_score', 'is', null)
        .order('completed_at', { ascending: false, nullsFirst: false })
        .limit(1);

      const latest = (rows?.[0] as Assessment) ?? null;
      setAssessment(latest);

      if (latest?.v1_score) {
        const score = Math.round(latest.v1_score);
        const { data: pctData } = await supabase.rpc('get_score_percentile', { p_score: score });
        if (pctData !== null && pctData !== undefined) {
          setPercentile(pctData as number);
        }
      }
    }

    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const now = new Date();
  const isPremium = !!(
    athlete?.subscription_status === 'active' ||
    (athlete?.subscription_status === 'trial' &&
      (!athlete.trial_ends_at || new Date(athlete.trial_ends_at) > now))
  );
  const isTrial27 = athlete?.subscription_tier === 'trial_27';

  return { athlete, assessment, percentile, isPremium, isTrial27, loading, refresh: fetchData };
}
