import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ScoreHistoryEntry {
  score: number;
  scored_at: string;
}

export interface UseAthleteScoreHistoryResult {
  history: ScoreHistoryEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAthleteScoreHistory(athleteId: string | null | undefined): UseAthleteScoreHistoryResult {
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('athlete_score_history')
        .select('score, scored_at')
        .eq('athlete_id', athleteId)
        .order('scored_at', { ascending: true })
        .limit(50);

      setHistory((data ?? []) as ScoreHistoryEntry[]);
    } catch (e) {
      console.error('Score history fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { history, loading, refresh: fetch };
}
