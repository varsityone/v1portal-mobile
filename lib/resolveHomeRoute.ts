import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type HomeRoute = '/(coach)' | '/coach-setup' | '/(tabs)' | '/(auth)/waitlist' | '/(auth)/flag-football-waitlist';

export const FLAG_FOOTBALL_ACK_STORAGE_KEY = 'v1portal_flag_football_seen';

// A coach with a finished coach_accounts row goes straight to the coach
// shell. A coach who signed up but hasn't finished setup yet (no
// coach_accounts row, but athletes.account_role === 'coach') goes to
// setup. An athlete/parent held by gate_athlete_signup (INSERT-only
// trigger, see web's supabase/migrations/20260917031620_athlete_waitlist_gate.sql
// -- not applied to prod as of writing) goes to the waitlist screen. A
// flag_football_waitlist signup (see lib/roleStorage.ts accountRoleForInsert)
// sees the flag-football landing once -- mirrors web's
// app/onboarding/flag-football-waitlist/page.tsx, which is a one-time
// acknowledgment, not a persistent gate, so this only routes there until
// FLAG_FOOTBALL_ACK_STORAGE_KEY is set. Everyone else keeps going to the
// athlete tabs, unchanged.
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
  if (athlete?.account_role === 'flag_football_waitlist') {
    const acked = await AsyncStorage.getItem(FLAG_FOOTBALL_ACK_STORAGE_KEY);
    if (!acked) return '/(auth)/flag-football-waitlist';
  }

  return '/(tabs)';
}
