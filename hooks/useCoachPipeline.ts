import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export type PipelineStatus = 'interested' | 'contacted' | 'visited' | 'offered' | 'committed' | 'signed' | 'declined';

export interface PipelineProspect {
  id: string;
  athlete_id: string;
  coach_id: string;
  status: PipelineStatus;
  offer_scholarship_amount: number | null;
  committed_at: string | null;
  signed_at: string | null;
  created_at: string;
  athlete: {
    id: string;
    full_name: string | null;
    position: string | null;
    state: string | null;
    v1_score: number | null;
    profile_photo_url: string | null;
    profile_slug: string | null;
  };
}

export interface UseCoachPipelineResult {
  prospects: PipelineProspect[];
  loading: boolean;
  add: (athleteId: string) => Promise<void>;
  updateStatus: (prospectId: string, status: PipelineStatus) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCoachPipeline(): UseCoachPipelineResult {
  const { coach } = useCoachData();
  const [prospects, setProspects] = useState<PipelineProspect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coach?.id || !coach.verified) { setLoading(false); return; }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('coach_recruit_pipeline')
        .select(`
          id, athlete_id, coach_id, status, offer_scholarship_amount, committed_at, signed_at, created_at,
          athlete:athletes(id, full_name, position, state, v1_score, profile_photo_url, profile_slug)
        `)
        .eq('coach_id', coach.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProspects((data ?? []).map(row => ({ ...row, athlete: Array.isArray(row.athlete) ? row.athlete[0] : row.athlete })) as PipelineProspect[]);
    } catch (e) {
      console.error('Pipeline fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, coach?.verified]);

  const add = useCallback(
    async (athleteId: string) => {
      if (!coach?.id || !coach.verified) throw new Error('A verified coach account is required.');

      try {
        const { error } = await supabase.from('coach_recruit_pipeline').insert([
          { coach_id: coach.id, athlete_id: athleteId, status: 'interested' },
        ]);
        if (error && error.code !== '23505') throw error;
        await fetch();
      } catch (e) {
        console.error('Pipeline add error:', e);
        throw e;
      }
    },
    [coach?.id, fetch],
  );

  const updateStatus = useCallback(
    async (prospectId: string, status: PipelineStatus) => {
      try {
        const update = {
          status,
          committed_at: status === 'committed' ? new Date().toISOString() : null,
          signed_at: status === 'signed' ? new Date().toISOString() : null,
        };

        const { error } = await supabase
          .from('coach_recruit_pipeline')
          .update(update)
          .eq('id', prospectId);
        if (error) throw error;
        await fetch();
      } catch (e) {
        console.error('Pipeline status update error:', e);
        throw e;
      }
    },
    [fetch],
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { prospects, loading, add, updateStatus, refresh: fetch };
}
