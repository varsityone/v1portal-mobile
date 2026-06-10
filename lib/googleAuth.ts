import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

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

  // Upsert athlete record for new Google sign-ups
  if (sessionData?.user) {
    const user = sessionData.user;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    await supabase.from('athletes').upsert([{
      user_id: user.id,
      email: user.email ?? '',
      full_name: fullName,
      account_role: 'athlete',
    }], { onConflict: 'user_id' });
  }

  return {};
}
