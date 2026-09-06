import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface SavedProspect {
  id: string;
  athlete_id: string;
  saved_at: string;
  notes: string | null;
  athlete: {
    full_name: string | null;
    position: string | null;
    state: string | null;
    v1_score: number | null;
    graduation_year: number | null;
    profile_photo_url: string | null;
  } | null;
}

export interface UseCoachSavedResult {
  saved: SavedProspect[];
  loading: boolean;
  sort: 'recent' | 'score';
  setSort: (s: 'recent' | 'score') => void;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
}

export function useCoachSaved(): UseCoachSavedResult {
  const { coach } = useCoachData();
  const [saved, setSaved] = useState<SavedProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'recent' | 'score'>('recent');

  const fetch = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_saved_prospects')
        .select('id, athlete_id, saved_at, notes, athlete:athletes(full_name, position, state, v1_score, graduation_year, profile_photo_url)')
        .eq('coach_id', coach.id);

      if (error) throw error;

      let sorted = (data as SavedProspect[]) ?? [];
      if (sort === 'score') {
        sorted.sort((a, b) => (b.athlete?.v1_score ?? 0) - (a.athlete?.v1_score ?? 0));
      } else {
        sorted.sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());
      }
      setSaved(sorted);
    } catch (e) {
      console.error('Fetch saved error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, sort]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(async (id: string) => {
    try {
      await supabase.from('coach_saved_prospects').delete().eq('id', id);
      setSaved(s => s.filter(x => x.id !== id));
    } catch (e) {
      console.error('Remove error:', e);
    }
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    try {
      await supabase.from('coach_saved_prospects').update({ notes }).eq('id', id);
      setSaved(s => s.map(x => x.id === id ? { ...x, notes } : x));
    } catch (e) {
      console.error('Update notes error:', e);
    }
  }, []);

  return { saved, loading, sort, setSort, remove, refresh: fetch, updateNotes };
}
