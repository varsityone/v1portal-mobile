import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;

export interface SearchFilters {
  positions: string[];
  gradYears: number[];
  states: string[];
  minScore: number;
  verifiedOnly: boolean;
}

export interface SearchResult {
  id: string;
  full_name: string | null;
  position: string | null;
  state: string | null;
  v1_score: number | null;
  graduation_year: number | null;
  profile_photo_url: string | null;
}

export interface UseCoachSearchResult {
  results: SearchResult[];
  loading: boolean;
  hasMore: boolean;
  filters: SearchFilters;
  setFilters: (f: SearchFilters) => void;
  loadMore: () => void;
  refreshSort: (sort: 'score' | 'year') => void;
  currentSort: 'score' | 'year';
}

export function useCoachSearch(): UseCoachSearchResult {
  const { coach } = useCoachData();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    positions: [],
    gradYears: [],
    states: [],
    minScore: 0,
    verifiedOnly: false,
  });
  const [currentSort, setCurrentSort] = useState<'score' | 'year'>('score');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const debounceTimer = useRef<NodeJS.Timeout>();

  const search = useCallback(
    async (f: SearchFilters, l: number, sort: 'score' | 'year') => {
      if (!coach?.id) return;
      setLoading(true);

      try {
        let query = supabase
          .from('athletes')
          .select('id, full_name, position, state, v1_score, graduation_year, profile_photo_url', { count: 'exact' });

        if (f.positions.length > 0) query = query.in('position', f.positions);
        if (f.gradYears.length > 0) query = query.in('graduation_year', f.gradYears);
        if (f.states.length > 0) query = query.in('state', f.states);
        if (f.minScore > 0) query = query.gte('v1_score', f.minScore);
        if (f.verifiedOnly) query = query.not('v1_score', 'is', null);

        query = sort === 'score'
          ? query.order('v1_score', { ascending: false, nullsFirst: false })
          : query.order('graduation_year', { ascending: true });

        const { data, count, error } = await query.limit(l);
        if (error) throw error;

        setResults((data as SearchResult[]) ?? []);
        setHasMore(((count ?? 0) > l));
        setLoading(false);
      } catch (e) {
        console.error('Search error:', e);
        setLoading(false);
      }
    },
    [coach?.id]
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setLimit(PAGE_SIZE);
      search(filters, PAGE_SIZE, currentSort);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceTimer.current);
  }, [filters, currentSort, search]);

  return {
    results,
    loading,
    hasMore,
    filters,
    setFilters,
    loadMore: () => setLimit(l => l + PAGE_SIZE),
    refreshSort: (sort) => setCurrentSort(sort),
    currentSort,
  };
}
