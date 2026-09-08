import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccountRole = 'athlete' | 'parent' | 'flag_football' | 'coach';

export function isAccountRole(value: string | null | undefined): value is AccountRole {
  return !!value && ['athlete', 'parent', 'coach', 'flag_football'].includes(value);
}

// Mirrors web's lib/roleDestinations.ts ROLE_BLURBS/ROLE_HEADLINES exactly.
export const ROLE_BLURBS: Record<AccountRole, string> = {
  athlete: "You'll complete the V1 Assessment and build your profile. Your parent can be given access later from your Settings page.",
  parent: "You'll complete the full profile on your athlete's behalf. Once you're set up, you can send your athlete an invite link from Settings so they can also log in.",
  coach: "You'll set up your coach profile with your school, division, and recruiting focus. Coach verification is required before you can message athletes.",
  flag_football: "College flag football is growing fast. Join the waitlist and we'll notify you when V1Portal launches full support for flag football recruiting.",
};

export const ROLE_HEADLINES: Record<AccountRole, string> = {
  athlete: "Let's Build Your Profile.",
  parent: "Set Up Your Athlete's Profile.",
  coach: 'Set Up Your Coach Profile.',
  flag_football: 'Join the Waitlist.',
};

const KEY = 'v1_pending_role';

export async function savePendingRole(role: AccountRole): Promise<void> {
  await AsyncStorage.setItem(KEY, role);
}

export async function readAndClearPendingRole(): Promise<AccountRole | null> {
  const role = await AsyncStorage.getItem(KEY);
  await AsyncStorage.removeItem(KEY);
  return role as AccountRole | null;
}
