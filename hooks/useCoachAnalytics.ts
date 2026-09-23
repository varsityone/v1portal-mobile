import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface AnalyticsKPIs {
  viewed: number; liked: number; matched: number; saved: number; messaged: number;
  conversionRate: number; funnelViewed: number; funnelLiked: number; funnelMatched: number;
  topPositions: { position: string; count: number }[];
  topStates: { state: string; count: number }[];
  topLiked: { id: string; full_name: string | null; position: string | null; state: string | null; v1_score: number | null; profile_photo_url: string | null }[];
}
export function useCoachAnalytics() {
  const { coach } = useCoachData();
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!coach?.verified) { setKpis(null); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(''); setKpis(null);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Please sign in again.');
        const response = await fetch(`https://v1portal.com/api/coach/analytics?timeframe=${timeframe}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not load analytics. Please retry.');
        const data = await response.json();
        if (!controller.signal.aborted) setKpis(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load analytics.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [coach?.id, coach?.verified, timeframe, revision]);
  return { kpis, loading, error, timeframe, setTimeframe, refresh: () => setRevision(v => v + 1) };
}
