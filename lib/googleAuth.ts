import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { readAndClearPendingRole } from './roleStorage';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const redirectTo = Linking.createURL('/');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) return { error: error.message };
  if (!data?.url) return { error: 'Could not start Google sign-in.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return {};

  const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
  if (sessionError) return { error: sessionError.message };

  if (sessionData?.user) {
    const user = sessionData.user;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    const role = await readAndClearPendingRole();
    const isFlagFootball = role === 'flag_football';

    await supabase.from('athletes').upsert([{
      user_id: user.id,
      email: user.email ?? '',
      full_name: fullName,
      account_role: isFlagFootball ? 'flag_football' : (role ?? 'athlete'),
      ...(isFlagFootball && { flag_football_waitlist: true }),
    }], { onConflict: 'user_id' });
  }

  return {};
}
