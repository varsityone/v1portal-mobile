import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { ensureAthleteProfile } from './ensureAthleteProfile';

export const onboardingKey = (userId: string) => `v1portal_onboarding_seen:${userId}`;

export type HomeRoute = '/(coach)' | '/coach-setup' | '/(tabs)' | '/(auth)/waitlist' | '/(auth)/flag-football-waitlist' | '/onboarding' | '/assessment';

export const FLAG_FOOTBALL_ACK_STORAGE_KEY = 'v1portal_flag_football_seen';

// Preserve role-specific destinations; athletes see account-specific slides,
// then assessment, then the dashboard once a score exists (including zero).
export async function resolveHomeRoute(userId: string, afterSlides = false): Promise<HomeRoute> {
  const { data: coach, error: coachError } = await supabase
    .from('coach_accounts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (coachError) throw coachError;
  if (coach) return '/(coach)';

  const athlete = await ensureAthleteProfile(userId);
  if (athlete?.account_role === 'coach') return '/coach-setup';
  if (athlete?.account_role === 'athlete_waitlist' || athlete?.account_role === 'parent_waitlist') return '/(auth)/waitlist';
  if (athlete?.account_role === 'flag_football_waitlist') {
    const acked = await AsyncStorage.getItem(FLAG_FOOTBALL_ACK_STORAGE_KEY);
    if (!acked) return '/(auth)/flag-football-waitlist';
  }

  if (!afterSlides && !await AsyncStorage.getItem(onboardingKey(userId))) return '/onboarding';
  if (athlete.v1_score == null) return '/assessment';
  return '/(tabs)';
}
