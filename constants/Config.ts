import Constants from 'expo-constants';

export const Config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  appName: Constants.expoConfig?.name ?? 'V1Portal',
} as const;
