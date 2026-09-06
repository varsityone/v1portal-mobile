import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

const TIMEFRAMES = { week: 7, month: 30, all: 999999 } as const;

export interface AnalyticsKPIs {
  viewed: number;
  liked: number;
  matched: number;
  saved: number;
  messaged: number;
  conversionRate: number;
  funnelViewed: number;
  funnelLiked: number;
  funnelMatched: number;
  topPositions: { position: string; count: number; avgScore: number }[];
  topStates: { state: string; count: number }[];
  topLiked: Array<{ id: string; full_name: string | null; position: string | null; v1_score: number | null; profile_photo_url: string | null }>;
}

export interface UseCoachAnalyticsResult {
  kpis: AnalyticsKPIs | null;
  loading: boolean;
  timeframe: 'week' | 'month' | 'all';
  setTimeframe: (t: 'week' | 'month' | 'all') => void;
}

export function useCoachAnalytics(): UseCoachAnalyticsResult {
  const { coach } = useCoachData();
  const [kpis, setKpis] = useState<AnalyticsKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');

  const fetch = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);

    try {
      const days = TIMEFRAMES[timeframe];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: swipes } = await supabase
        .from('swipes')
        .select('athlete_id, direction, created_at')
        .eq('coach_id', coach.id)
        .gte('created_at', startDate.toISOString());

      const { data: matches } = await supabase
        .from('mutual_matches')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('status', 'active')
        .gte('matched_at', startDate.toISOString());

      const { data: saved } = await supabase
        .from('coach_saved_prospects')
        .select('id')
        .eq('coach_id', coach.id)
        .gte('saved_at', startDate.toISOString());

      const { data: messaged } = await supabase
        .from('coach_athlete_messages')
        .select('id')
        .eq('coach_id', coach.id)
        .eq('sender_type', 'coach')
        .gte('created_at', startDate.toISOString());

      const viewed = swipes?.length ?? 0;
      const liked = swipes?.filter(s => s.direction === 'right').length ?? 0;
      const matched = matches?.length ?? 0;
      const savedCount = saved?.length ?? 0;
      const messagedCount = messaged?.length ?? 0;

      const conversionRate = viewed > 0 ? Math.round((matched / viewed) * 100) : 0;

      // Batch fetch athletes for position/state breakdown and top liked
      const athleteIds = swipes?.map(s => s.athlete_id).filter(Boolean) as string[] | undefined;
      if (!athleteIds?.length) {
        setKpis({
          viewed, liked, matched, saved: savedCount, messaged: messagedCount, conversionRate,
          funnelViewed: viewed, funnelLiked: liked, funnelMatched: matched,
          topPositions: [], topStates: [], topLiked: [],
        });
        setLoading(false);
        return;
      }

      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, full_name, position, state, v1_score, profile_photo_url')
        .in('id', athleteIds);

      // Build breakdowns
      const positionCounts: Record<string, { count: number; scores: number[] }> = {};
      const stateCounts: Record<string, number> = {};
      const likedAthletesSet = new Set(swipes?.filter(s => s.direction === 'right').map(s => s.athlete_id));

      (athletes ?? []).forEach(a => {
        if (a.position) {
          positionCounts[a.position] = positionCounts[a.position] || { count: 0, scores: [] };
          positionCounts[a.position].count += 1;
          if (a.v1_score) positionCounts[a.position].scores.push(a.v1_score);
        }
        if (a.state) stateCounts[a.state] = (stateCounts[a.state] ?? 0) + 1;
      });

      const topPositions = Object.entries(positionCounts)
        .map(([pos, data]) => ({
          position: pos,
          count: data.count,
          avgScore: data.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b) / data.scores.length) : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topStates = Object.entries(stateCounts)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topLiked = (athletes ?? [])
        .filter(a => likedAthletesSet.has(a.id))
        .sort((a, b) => (b.v1_score ?? 0) - (a.v1_score ?? 0))
        .slice(0, 5);

      setKpis({
        viewed, liked, matched, saved: savedCount, messaged: messagedCount, conversionRate,
        funnelViewed: viewed, funnelLiked: liked, funnelMatched: matched,
        topPositions, topStates, topLiked,
      });
    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, timeframe]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { kpis, loading, timeframe, setTimeframe };
}
