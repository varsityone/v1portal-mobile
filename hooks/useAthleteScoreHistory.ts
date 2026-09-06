import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface ScoreHistoryEntry {
  id: string;
  athlete_id: string;
  v1_score: number;
  recorded_at: string;
}

export interface UseAthleteScoreHistoryResult {
  history: ScoreHistoryEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAthleteScoreHistory(): UseAthleteScoreHistoryResult {
  const { session } = useAuth();
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('athlete_score_history')
        .select('*')
        .eq('athlete_id', session.user.id)
        .order('recorded_at', { ascending: true })
        .limit(30);

      setHistory((data ?? []) as ScoreHistoryEntry[]);
    } catch (e) {
      console.error('Score history fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { history, loading, refresh: fetch };
}
