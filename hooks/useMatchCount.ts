import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useMatchCount(athleteId: string | undefined): number {
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!athleteId) return;
    supabase
      .from('mutual_matches')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athleteId)
      .eq('status', 'active')
      .then(({ count }: { count: number | null }) => setMatchCount(count ?? 0));
  }, [athleteId]);

  return matchCount;
}
