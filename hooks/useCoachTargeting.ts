import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface CoachTargeting {
  id: string;
  coach_id: string;
  target_states: string[];
  min_score: number;
  created_at: string;
}

export interface TargetingStats {
  totalProspects: number;
  verifiedCount: number;
  topPosition: string | null;
  avgScore: number;
}

export interface UseCoachTargetingResult {
  targeting: CoachTargeting | null;
  stats: TargetingStats | null;
  loading: boolean;
  selectedStates: Set<string>;
  minScore: number;
  setSelectedStates: (states: Set<string>) => void;
  setMinScore: (score: number) => void;
  save: () => Promise<void>;
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

export function useCoachTargeting(): UseCoachTargetingResult {
  const { coach } = useCoachData();
  const [targeting, setTargeting] = useState<CoachTargeting | null>(null);
  const [stats, setStats] = useState<TargetingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set());
  const [minScore, setMinScore] = useState(0);

  const fetchTargeting = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);

    try {
      const { data: tgt } = await supabase
        .from('coach_targeting')
        .select('*')
        .eq('coach_id', coach.id)
        .single();

      if (tgt) {
        setTargeting(tgt);
        setSelectedStates(new Set(tgt.target_states ?? []));
        setMinScore(tgt.min_score ?? 0);

        // Fetch stats for selected states
        const states = tgt.target_states ?? [];
        if (states.length > 0) {
          const { data: prospects } = await supabase
            .from('athletes')
            .select('id, position, v1_score')
            .in('state', states)
            .gte('v1_score', tgt.min_score ?? 0);

          if (prospects) {
            const verified = prospects.filter(p => p.v1_score != null).length;
            const positions: Record<string, number> = {};
            let totalScore = 0;

            prospects.forEach(p => {
              if (p.position) positions[p.position] = (positions[p.position] ?? 0) + 1;
              if (p.v1_score) totalScore += p.v1_score;
            });

            const topPos = Object.entries(positions).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
            const avgScore = prospects.length > 0 && totalScore > 0 ? Math.round(totalScore / verified) : 0;

            setStats({ totalProspects: prospects.length, verifiedCount: verified, topPosition: topPos, avgScore });
          }
        }
      } else {
        setSelectedStates(new Set());
        setMinScore(0);
        setStats(null);
      }
    } catch (e) {
      console.error('Targeting fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  const save = useCallback(async () => {
    if (!coach?.id) return;

    try {
      const payload = {
        coach_id: coach.id,
        target_states: Array.from(selectedStates),
        min_score: minScore,
      };

      if (targeting?.id) {
        await supabase
          .from('coach_targeting')
          .update(payload)
          .eq('id', targeting.id);
      } else {
        const { data } = await supabase
          .from('coach_targeting')
          .insert([payload])
          .select()
          .single();
        if (data) setTargeting(data);
      }
    } catch (e) {
      console.error('Targeting save error:', e);
      throw e;
    }
  }, [coach?.id, targeting?.id, selectedStates, minScore]);

  useEffect(() => {
    fetchTargeting();
  }, [fetchTargeting]);

  return {
    targeting,
    stats,
    loading,
    selectedStates,
    minScore,
    setSelectedStates,
    setMinScore,
    save,
    refresh: fetchTargeting,
  };
}
