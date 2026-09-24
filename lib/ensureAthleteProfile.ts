import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { accountRoleForInsert, isAccountRole } from './roleStorage';

// Never upsert defaults over an existing athlete's profile or subscription.
export async function ensureAthleteProfile(userId: string) {
  const read = () => supabase.from('athletes').select('id, account_role, v1_score')
    .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`).maybeSingle();
  const existing = await read();
  if (existing.error) throw existing.error;
  if (existing.data) { await AsyncStorage.removeItem('v1_pending_role'); return existing.data; }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== userId) throw error ?? new Error('Please sign in again.');
  const pending = await AsyncStorage.getItem('v1_pending_role');
  const role = isAccountRole(user.user_metadata?.account_role) ? user.user_metadata.account_role : isAccountRole(pending) ? pending : 'athlete';
  const { error: insertError } = await supabase.from('athletes').insert({
    user_id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
    account_role: accountRoleForInsert(role), graduation_year: null, state: null,
    subscription_status: 'free', subscription_tier: null,
    ...(role === 'flag_football' && { flag_football_waitlist: true }),
  });
  const result = await read();
  if (result.error || !result.data) throw result.error ?? insertError ?? new Error('Could not finish profile setup. Please try again.');
  await AsyncStorage.removeItem('v1_pending_role');
  return result.data;
}
