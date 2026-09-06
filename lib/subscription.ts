// Canonical premium check, matching web's app/dashboard/results/page.tsx exactly.
// Mobile currently computes "isPremium" 3 different, inconsistent ways
// (useAthleteData's trial-inclusive formula, (tabs)/match/index.tsx's local
// computation, useSubscription's table-then-fallback) — none of those match
// web's Results page, which uses this simpler formula. Use THIS helper for
// anything that needs to match web Results' gating exactly (the new Results
// screen's ScoreBreakdownCard/UpsellCard/CompleteBanner); the other 3 existing
// call sites are left alone to avoid regressing already-shipped screens.

export interface PremiumCheckFields {
  subscription_status?: string | null;
  is_admin?: boolean | null;
  manual_access?: boolean | null;
}

export function isAthletePremium(athlete: PremiumCheckFields | null | undefined): boolean {
  if (!athlete) return false;
  return !!(athlete.subscription_status === 'active' || athlete.is_admin || athlete.manual_access);
}
