// Ported from web's lib/recruitingLevels.js — the 6-tier V1 Score -> caliber
// bands used by Recruit Search, Saved, Pipeline, Profile Edit, and Results.
// Distinct from constants/RecruitingLevels.ts (the division-floor ladder used
// by the swipe deck) — that file answers "what division fits this athlete";
// this one answers "what caliber/star-rating is this score".

export interface RecruitingLevelBand {
  key: string;
  level: string;
  minScore: number;
  description: string;
  targets: string[];
  starRating: string;
}

export const RECRUITING_LEVEL_BANDS: RecruitingLevelBand[] = [
  {
    key: 'elite_p4_fbs',
    level: 'Elite P4/FBS Prospect',
    minScore: 85,
    description: 'You have the measurables, production, and profile of a Power 4 recruit. Focus on showcasing your film and getting in front of P4 coaches.',
    targets: ['Power 4 (SEC, Big Ten, Big 12, ACC)', 'Top G5 programs'],
    starRating: '4-5 star caliber',
  },
  {
    key: 'strong_fbs_fcs',
    level: 'Strong FBS/FCS Prospect',
    minScore: 75,
    description: 'You meet D1 standards and should pursue Group of 5 FBS and top FCS programs actively.',
    targets: ['G5 FBS (AAC, Sun Belt, C-USA, MAC, MWC)', 'Top FCS (Big Sky, CAA, MVFC)'],
    starRating: '3 star caliber',
  },
  {
    key: 'fcs_d2',
    level: 'FCS/D2 Prospect',
    minScore: 65,
    description: 'You have college potential but need to target realistic programs. FCS and D2 should be your focus.',
    targets: ['FCS', 'D2', 'Top NAIA'],
    starRating: '2 star / unrated',
  },
  {
    key: 'd2_d3_naia',
    level: 'D2/D3/NAIA Prospect',
    minScore: 55,
    description: 'You can play college football with the right fit. D2, D3, and NAIA programs are realistic targets.',
    targets: ['D2', 'D3', 'NAIA', 'JUCO with transfer path'],
    starRating: 'Unrated',
  },
  {
    key: 'juco_dev',
    level: 'JUCO/Development Prospect',
    minScore: 45,
    description: 'Consider JUCO to develop your skills and potentially transfer to a 4-year program.',
    targets: ['JUCO', 'Prep schools', 'D3'],
    starRating: 'Unrated / Development needed',
  },
  {
    key: 'dev_needed',
    level: 'Significant Development Needed',
    minScore: 0,
    description: 'Focus on fundamental skill development and strength training. Consider walk-on opportunities or non-competitive programs.',
    targets: ['D3 walk-on', 'Club football', 'Focus on academics'],
    starRating: 'Not currently college-ready',
  },
];

export function getRecruitingLevelBand(score: number): RecruitingLevelBand {
  return RECRUITING_LEVEL_BANDS.find(b => score >= b.minScore) ?? RECRUITING_LEVEL_BANDS[RECRUITING_LEVEL_BANDS.length - 1];
}

// Same text-caliber -> star-count mapping web duplicates between search/page.tsx
// and api/profile/[[...slug]]/route.js — this is mobile's single copy.
const STAR_RATING_MAP: Record<string, number> = {
  '4-5 star caliber': 5,
  '3 star caliber': 3,
  '2 star / unrated': 2,
  'Unrated': 1,
  'Unrated / Development needed': 1,
  'Not currently college-ready': 0,
};

export function starsForScore(score: number | null | undefined): number {
  if (score == null) return 0;
  return STAR_RATING_MAP[getRecruitingLevelBand(score).starRating] ?? 0;
}

// Used by Profile Edit to derive coach_accounts.min_score from the selected
// level_bands on every save — never user-editable directly. Matches by the
// `level` label string (what's stored in coach_accounts.level_bands), not `key`.
export function floorFromLevels(levels: string[] | null | undefined): number | null {
  if (!levels || levels.length === 0) return null;
  const scores = levels
    .map(name => RECRUITING_LEVEL_BANDS.find(b => b.level === name)?.minScore)
    .filter((n): n is number => n != null);
  if (scores.length === 0) return null;
  return Math.min(...scores);
}

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P', 'LS'] as const;

export const STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington D.C.' },
];

export const GRAD_YEARS = [2025, 2026, 2027, 2028, 2029];

// Grouped for the state-targeting map UI (Phase 3b) — regional clusters used
// as a fallback list view alongside the tappable SVG map.
export const STATE_REGIONS: { label: string; codes: string[] }[] = [
  { label: 'Northeast', codes: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'] },
  { label: 'Southeast', codes: ['DE', 'MD', 'DC', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA'] },
  { label: 'Midwest', codes: ['OH', 'MI', 'IN', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'] },
  { label: 'Southwest', codes: ['TX', 'OK', 'NM', 'AZ'] },
  { label: 'West', codes: ['CO', 'WY', 'MT', 'ID', 'UT', 'NV', 'CA', 'OR', 'WA', 'AK', 'HI'] },
];
