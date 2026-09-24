import { ensureAthleteProfile } from './ensureAthleteProfile';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';
import { accountRoleForInsert, savePendingRole, type AccountRole } from './roleStorage';

export async function signUpWithApple(role: AccountRole): Promise<{ error?: string }> {
  try {
    await savePendingRole(role);
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) return { error: 'Apple sign-in failed. Please try again.' };

    const { data: { session }, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) return { error: error.message };

    if (session?.user) {
      const user = session.user;
      await ensureAthleteProfile(user.id);
    }

    return {};
  } catch (e: any) {
    if (e.code === 'ERR_REQUEST_CANCELED') return {};
    return { error: e.message || 'Apple sign-in failed.' };
  }
}

export async function signInWithApple(): Promise<{ error?: string }> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) return { error: 'Apple sign-in failed. Please try again.' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    if (e.code === 'ERR_REQUEST_CANCELED') return {};
    return { error: e.message || 'Apple sign-in failed.' };
  }
}
