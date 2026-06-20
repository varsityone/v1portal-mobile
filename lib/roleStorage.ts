import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccountRole = 'athlete' | 'parent' | 'flag_football';

const KEY = 'v1_pending_role';

export async function savePendingRole(role: AccountRole): Promise<void> {
  await AsyncStorage.setItem(KEY, role);
}

export async function readAndClearPendingRole(): Promise<AccountRole | null> {
  const role = await AsyncStorage.getItem(KEY);
  await AsyncStorage.removeItem(KEY);
  return role as AccountRole | null;
}
