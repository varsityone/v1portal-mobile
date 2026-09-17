import { supabase } from './supabase';

export type HomeRoute = '/(coach)' | '/coach-setup' | '/(tabs)' | '/(auth)/waitlist';

// A coach with a finished coach_accounts row goes straight to the coach
// shell. A coach who signed up but hasn't finished setup yet (no
// coach_accounts row, but athletes.account_role === 'coach') goes to
// setup. An athlete/parent held by gate_athlete_signup (INSERT-only
// trigger, see web's supabase/migrations/20260917031620_athlete_waitlist_gate.sql
// -- not applied to prod as of writing) goes to the waitlist screen.
// Everyone else keeps going to the athlete tabs, unchanged.
export async function resolveHomeRoute(userId: string): Promise<HomeRoute> {
  const { data: coach } = await supabase
    .from('coach_accounts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (coach) return '/(coach)';

  const { data: athlete } = await supabase
    .from('athletes')
    .select('account_role')
    .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
    .maybeSingle();
  if (athlete?.account_role === 'coach') return '/coach-setup';
  if (athlete?.account_role === 'athlete_waitlist' || athlete?.account_role === 'parent_waitlist') return '/(auth)/waitlist';

  return '/(tabs)';
}
