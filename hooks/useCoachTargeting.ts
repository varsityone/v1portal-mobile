import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface TargetedProspect {
  id: string;
  full_name: string | null;
  position: string | null;
  state: string | null;
  city: string | null;
  v1_score: number | null;
  profile_photo_url: string | null;
  graduation_year: number | string | null;
}

export interface ProspectAnalytics {
  averageScore: number | null;
  topPositions: { position: string; count: number; avgScore: number }[];
  scoreDistribution: { excellent: number; strong: number; developing: number; unknown: number };
}

export interface CoachTargetingStats {
  totalAthletes: number;
  targetedStates: number;
  targetedAthletes: number;
}

export interface UseCoachTargetingResult {
  selectedStates: Set<string>;
  prospects: TargetedProspect[];
  stats: CoachTargetingStats;
  analytics: ProspectAnalytics | null;
  loading: boolean;
  toggleState: (state: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export { STATES };

// Mirrors web's lib/recruitingAnalytics.ts analyzeProspects — same
// buckets/rounding, so a coach sees identical numbers on both platforms.
function analyzeProspects(prospects: TargetedProspect[]): ProspectAnalytics {
  const scores = prospects.filter(p => p.v1_score).map(p => p.v1_score as number);
  const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const positionCounts: Record<string, number> = {};
  const positionScores: Record<string, number[]> = {};
  prospects.forEach(p => {
    const pos = p.position || 'Unknown';
    positionCounts[pos] = (positionCounts[pos] ?? 0) + 1;
    positionScores[pos] = positionScores[pos] ?? [];
    if (p.v1_score) positionScores[pos].push(p.v1_score);
  });

  const topPositions = Object.entries(positionCounts)
    .map(([position, count]) => ({
      position,
      count,
      avgScore: positionScores[position]?.length
        ? Math.round(positionScores[position].reduce((a, b) => a + b, 0) / positionScores[position].length)
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const scoreDistribution = {
    excellent: prospects.filter(p => p.v1_score && p.v1_score >= 90).length,
    strong: prospects.filter(p => p.v1_score && p.v1_score >= 80 && p.v1_score < 90).length,
    developing: prospects.filter(p => p.v1_score && p.v1_score < 80).length,
    unknown: prospects.filter(p => !p.v1_score).length,
  };

  return { averageScore, topPositions, scoreDistribution };
}

export function useCoachTargeting(): UseCoachTargetingResult {
  const { coach } = useCoachData();
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [prospects, setProspects] = useState<TargetedProspect[]>([]);
  const [totalAthletes, setTotalAthletes] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadProspects = useCallback(async (states: Set<string>) => {
    if (states.size === 0) {
      setProspects([]);
      return;
    }
    const { data, error } = await supabase
      .from('athletes')
      .select('id, full_name, position, state, city, v1_score, profile_photo_url, graduation_year')
      .in('state', Array.from(states))
      .order('v1_score', { ascending: false });

    if (error) {
      console.error('Targeted prospects fetch error:', error);
      return;
    }
    setProspects((data as TargetedProspect[]) ?? []);
  }, []);

  const refresh = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);
    try {
      const [{ data: tgt, error: tgtError }, { count }] = await Promise.all([
        supabase.from('coach_targeting').select('state').eq('coach_id', coach.id),
        supabase.from('athletes').select('id', { count: 'exact', head: true }),
      ]);
      if (tgtError) throw tgtError;

      const states = new Set((tgt ?? []).map(r => r.state));
      setSelectedStates(states);
      setTotalAthletes(count ?? 0);
      await loadProspects(states);
    } catch (e) {
      console.error('Targeting fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, loadProspects]);

  // One row per (coach_id, state) on coach_targeting — toggling inserts or
  // deletes a single row, mirroring web's RecruitingMap.tsx exactly. There
  // is no min_score column on this table (that lives on coach_accounts and
  // isn't used to filter this screen's prospect list on either platform).
  const toggleState = useCallback(async (state: string) => {
    if (!coach?.id) return;
    const wasTargeted = selectedStates.has(state);
    const next = new Set(selectedStates);
    if (wasTargeted) next.delete(state); else next.add(state);
    setSelectedStates(next);
    await loadProspects(next);

    if (wasTargeted) {
      await supabase.from('coach_targeting').delete().eq('coach_id', coach.id).eq('state', state);
    } else {
      await supabase.from('coach_targeting').insert({ coach_id: coach.id, state });
    }
  }, [coach?.id, selectedStates, loadProspects]);

  const clearAll = useCallback(async () => {
    if (!coach?.id) return;
    await supabase.from('coach_targeting').delete().eq('coach_id', coach.id);
    setSelectedStates(new Set());
    setProspects([]);
  }, [coach?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const analytics = prospects.length > 0 ? analyzeProspects(prospects) : null;

  return {
    selectedStates,
    prospects,
    stats: { totalAthletes, targetedStates: selectedStates.size, targetedAthletes: prospects.length },
    analytics,
    loading,
    toggleState,
    clearAll,
    refresh,
  };
}
