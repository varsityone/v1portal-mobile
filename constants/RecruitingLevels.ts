// Mirrors web's lib/recruitingLevels.js — single source of truth for V1 Score ->
// division bands, shared between the swipe deck's level picker and reality-check alert.

export const DIVISION_ORDER = ['D1_FBS', 'D1_FCS', 'D2', 'D3', 'NAIA', 'NJCAA'] as const;
export type Division = typeof DIVISION_ORDER[number];

export const DIVISION_LABELS: Record<Division, string> = {
  D1_FBS: 'D1 FBS',
  D1_FCS: 'D1 FCS',
  D2: 'D2',
  D3: 'D3',
  NAIA: 'NAIA',
  NJCAA: 'NJCAA',
};

// Typical V1 Score floor coaches at each division actually recruit from —
// only for coach-setup defaults/warnings, NEVER for "what division fits
// this athlete" (that's DIVISION_BAND_FLOOR below). Mirrors web's
// lib/recruitingLevels.js DIVISION_MIN_SCORE_DEFAULT exactly.
export const DIVISION_MIN_SCORE_DEFAULT: Record<Division, number> = {
  D1_FBS: 80,
  D1_FCS: 75,
  D2: 70,
  D3: 60,
  NAIA: 60,
  NJCAA: 50,
};

// Bridges the athlete-tier ladder (RECRUITING_LEVEL_BANDS in recruitingLevels.ts)
// to the six-division bucket used by the swipe deck and reach-alerts. Deliberately
// separate from DIVISION_MIN_SCORE_DEFAULT above. Mirrors web's DIVISION_BAND_FLOOR
// exactly — use THIS for "what division fits this athlete," never the table above.
export const DIVISION_BAND_FLOOR: Record<Division, number> = {
  D1_FBS: 85,
  D1_FCS: 75,
  D2: 65,
  D3: 55,
  NAIA: 55,
  NJCAA: 0,
};

export function getBandFloorForDivision(division: Division): number {
  return DIVISION_BAND_FLOOR[division];
}

export function getPrimaryDivisionForScore(score: number): Division {
  return DIVISION_ORDER.find(d => score >= DIVISION_BAND_FLOOR[d]) ?? DIVISION_ORDER[DIVISION_ORDER.length - 1];
}
