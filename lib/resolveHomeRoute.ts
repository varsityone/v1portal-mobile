import { supabase } from './supabase';

export type HomeRoute = '/(coach)' | '/coach-setup' | '/(tabs)';

// A coach with a finished coach_accounts row goes straight to the coach
// shell. A coach who signed up but hasn't finished setup yet (no
// coach_accounts row, but athletes.account_role === 'coach') goes to
// setup. Everyone else keeps going to the athlete tabs, unchanged.
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

  return '/(tabs)';
}
