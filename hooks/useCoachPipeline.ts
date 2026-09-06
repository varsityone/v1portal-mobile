import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface PipelineProspect {
  id: string;
  athlete_id: string;
  coach_id: string;
  status: 'interested' | 'pursuing' | 'committed' | 'signed';
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
  };
}

export interface UseCoachPipelineResult {
  prospects: PipelineProspect[];
  loading: boolean;
  add: (athleteId: string) => Promise<void>;
  updateStatus: (prospectId: string, status: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCoachPipeline(): UseCoachPipelineResult {
  const { coach } = useCoachData();
  const [prospects, setProspects] = useState<PipelineProspect[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('coach_recruit_pipeline')
        .select(`
          id, athlete_id, coach_id, status, committed_at, signed_at, created_at,
          athlete:athletes(id, full_name, position, state, v1_score, profile_photo_url)
        `)
        .eq('coach_id', coach.id)
        .order('created_at', { ascending: false });

      setProspects((data ?? []) as PipelineProspect[]);
    } catch (e) {
      console.error('Pipeline fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  const add = useCallback(
    async (athleteId: string) => {
      if (!coach?.id) return;

      try {
        await supabase.from('coach_recruit_pipeline').insert([
          { coach_id: coach.id, athlete_id: athleteId, status: 'interested' },
        ]);
        await fetch();
      } catch (e) {
        console.error('Pipeline add error:', e);
        if (!e.message?.includes('duplicate')) throw e;
      }
    },
    [coach?.id, fetch],
  );

  const updateStatus = useCallback(
    async (prospectId: string, status: string) => {
      try {
        const update: any = { status };
        if (status === 'committed') update.committed_at = new Date().toISOString();
        if (status === 'signed') update.signed_at = new Date().toISOString();

        await supabase
          .from('coach_recruit_pipeline')
          .update(update)
          .eq('id', prospectId);

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
