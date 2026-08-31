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

// Typical V1 Score floor coaches at each division actually recruit from.
export const DIVISION_MIN_SCORE_DEFAULT: Record<Division, number> = {
  D1_FBS: 80,
  D1_FCS: 75,
  D2: 70,
  D3: 60,
  NAIA: 60,
  NJCAA: 50,
};

export function getAthleteLevel(score: number): Division {
  return DIVISION_ORDER.find(d => score >= DIVISION_MIN_SCORE_DEFAULT[d]) ?? DIVISION_ORDER[DIVISION_ORDER.length - 1];
}
