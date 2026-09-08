import { SupabaseClient } from '@supabase/supabase-js';

// Mirrors the relevant slice of web's app/api/analytics/route.js — total
// profile views plus swipe-based reviewed/liked counts — scoped to one athlete.
export interface DashboardStats {
  profileViews: number;
  programsReviewed: number;
  programsLiked: number;
}

export async function getDashboardStats(supabase: SupabaseClient, athleteId: string): Promise<DashboardStats> {
  const [{ count: profileViews }, { data: swipeData }] = await Promise.all([
    supabase
      .from('profile_views')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', athleteId),
    supabase
      .from('swipes')
      .select('direction')
      .eq('athlete_id', athleteId)
      .eq('swiped_by', 'athlete'),
  ]);

  return {
    profileViews: profileViews ?? 0,
    programsReviewed: swipeData?.length ?? 0,
    programsLiked: swipeData?.filter(s => s.direction === 'like').length ?? 0,
  };
}
