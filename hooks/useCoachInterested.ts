import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useCoachData } from './useCoachData';
import { getBandFloorForDivision, getPrimaryDivisionForScore, DIVISION_LABELS, Division } from '../constants/RecruitingLevels';

const API_BASE = 'https://v1portal.com';

export interface InterestedCandidate {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
  position: string | null;
  state: string | null;
  city: string | null;
  high_school: string | null;
  graduation_year: number | null;
  v1_score: number | null;
  height: string | null;
  weight: string | number | null;
  gpa: string | number | null;
  hudl_link: string | null;
  bio: string | null;
  likedAt: string;
  likesLast14d: number;
  combinedScore: number;
}

export interface InterestFilters {
  positions: string[];
  gradYears: number[];
  states: string[];
}
export const EMPTY_INTEREST_FILTERS: InterestFilters = { positions: [], gradYears: [], states: [] };

export type InterestSort = 'recommended' | 'v1' | 'recent';

// Same palette as the swipe deck's own level badge (constants/Colors + the
// division bridge), applied here instead of reading athletes.recruiting_level,
// which holds inconsistent values in production (tier-name strings, bare
// division codes, and stray non-level values).
const RECRUITING_LEVEL_COLORS: Record<string, string> = {
  'D1 FBS': '#f59e0b', 'D1 FCS': '#3b82f6', 'D2': '#8b5cf6', 'D3': '#22c55e', 'NAIA': '#ec4899', 'NJCAA': '#f97316',
};
export function levelForScore(score: number | null): { label: string; division: Division; color: string } {
  const division = getPrimaryDivisionForScore(score ?? 0);
  const label = DIVISION_LABELS[division];
  return { label, division, color: RECRUITING_LEVEL_COLORS[label] ?? '#9a9da2' };
}

export function sortCandidates(list: InterestedCandidate[], sort: InterestSort): InterestedCandidate[] {
  if (sort === 'v1') return [...list].sort((x, y) => (y.v1_score ?? 0) - (x.v1_score ?? 0));
  if (sort === 'recent') return [...list].sort((x, y) => new Date(y.likedAt).getTime() - new Date(x.likedAt).getTime());
  return [...list].sort((x, y) => (y.combinedScore - x.combinedScore) || (new Date(y.likedAt).getTime() - new Date(x.likedAt).getTime()));
}

// Mirrors web's app/coach/interested/page.tsx data pipeline exactly: the
// candidate list (who already likes this coach, not yet matched) is a plain
// client-side Supabase read -- RLS already scopes `swipes` to rows this coach
// owns. Only the cross-coach "how actively are they recruiting" signal needs
// the shared web API route, since that one has to cross the RLS boundary via
// a service-role key (a coach must never see which OTHER programs an athlete liked).
export function useCoachInterested() {
  const { session } = useAuth();
  const { coach, loading: coachLoading } = useCoachData();
  const [inRange, setInRange] = useState<InterestedCandidate[]>([]);
  const [belowRange, setBelowRange] = useState<InterestedCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);
    try {
      const { data: matches } = await supabase
        .from('mutual_matches')
        .select('athlete_id')
        .eq('coach_id', coach.id);
      const matchedIds = new Set((matches ?? []).map(m => m.athlete_id));

      const { data: likes } = await supabase
        .from('swipes')
        .select('athlete_id, created_at')
        .eq('coach_id', coach.id)
        .eq('swiped_by', 'athlete')
        .eq('direction', 'like');

      const pending = (likes ?? []).filter(l => !matchedIds.has(l.athlete_id));
      const likedAtById = new Map(pending.map(l => [l.athlete_id, l.created_at]));
      const candidateIds = pending.map(l => l.athlete_id);

      if (candidateIds.length === 0) {
        setInRange([]);
        setBelowRange([]);
        return;
      }

      // Typed `any` here for the same reason as the swipe deck's own athlete
      // query: reassigning this builder with the full column set otherwise
      // trips a "type instantiation excessively deep" TS error.
      const { data: athletes }: any = await supabase
        .from('athletes')
        .select('id, full_name, profile_photo_url, position, state, city, high_school, graduation_year, v1_score, height, weight, gpa, hudl_link, bio')
        .in('id', candidateIds);

      let intents: Record<string, { likesLast14d: number }> = {};
      try {
        const res = await fetch(`${API_BASE}/api/coach/interest-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ coach_id: coach.id, athlete_ids: candidateIds }),
        });
        if (res.ok) intents = (await res.json()).intents ?? {};
      } catch {
        // Ranking still works on v1_score alone.
      }

      const enriched: InterestedCandidate[] = (athletes ?? []).map((a: any) => {
        const likesLast14d = intents[a.id]?.likesLast14d ?? 0;
        return {
          ...a,
          likedAt: likedAtById.get(a.id) ?? new Date(0).toISOString(),
          likesLast14d,
          combinedScore: (a.v1_score ?? 0) + Math.min(likesLast14d, 5) * 2,
        };
      });

      const effectiveMinScore = coach.min_score ?? (coach.division ? getBandFloorForDivision(coach.division as Division) : 0) ?? 0;
      setInRange(enriched.filter(a => (a.v1_score ?? 0) >= effectiveMinScore));
      setBelowRange(enriched.filter(a => (a.v1_score ?? 0) < effectiveMinScore));
    } finally {
      setLoading(false);
    }
  }, [coach?.id, coach?.min_score, coach?.division, session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const removeCandidate = (id: string) => {
    setInRange(prev => prev.filter(a => a.id !== id));
    setBelowRange(prev => prev.filter(a => a.id !== id));
  };

  return { coach, coachLoading, inRange, belowRange, loading, reload: load, removeCandidate };
}

// Swipe is always `allowed: true` at the compliance API level (recruiting-
// calendar rules only ever restrict message/visit/evaluation) -- this call
// exists purely so the action lands in compliance_logs for the audit trail,
// same as the swipe deck's own logSwipeCompliance. Never blocks.
export async function logInterestCompliance(coachId: string, division: string | null, region: string | null, athleteId: string) {
  try {
    await fetch(`${API_BASE}/api/compliance/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coach_id: coachId, division, region: region ?? undefined, action: 'swipe', athlete_id: athleteId }),
    });
  } catch {
    // Logging-only call -- never blocks the action.
  }
}

export async function recordInterestAction(params: {
  athleteId: string;
  coachId: string;
  direction: 'like' | 'pass';
  accessToken?: string;
}): Promise<{ ok: boolean; matched?: boolean; matchId?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/match/swipe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(params.accessToken ? { Authorization: `Bearer ${params.accessToken}` } : {}),
      },
      body: JSON.stringify({ athlete_id: params.athleteId, coach_id: params.coachId, swiped_by: 'coach', direction: params.direction }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return { ok: false };
    return { ok: true, matched: data.matched, matchId: data.match_id };
  } catch {
    return { ok: false };
  }
}
