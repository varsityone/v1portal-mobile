// Mirrors web's lib/tierColors.ts exactly.
export type TierName = 'Match+' | 'Match+ Trial' | 'Free';

export const TIER_COLORS: Record<TierName, string> = {
  'Match+':       'rgb(255, 148, 0)',
  'Match+ Trial': 'rgb(255, 148, 0)',
  'Free':         '#101010',
};

type AthleteRef = { subscription_status?: string | null; subscription_tier?: string | null } | null | undefined;

export function getTierFromAthlete(athlete: AthleteRef): TierName {
  if (athlete?.subscription_status === 'active') return 'Match+';
  if (athlete?.subscription_status === 'trial') return 'Match+ Trial';
  return 'Free';
}

export function getTierColor(athlete: AthleteRef): string {
  return TIER_COLORS[getTierFromAthlete(athlete)];
}
