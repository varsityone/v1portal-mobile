export type ThemeColors = {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  scoreCard: string;
  border: string;
  border2: string;
  text: string;
  textMuted: string;
  textDim: string;
  icon: string;
  success: string;
  warning: string;
  error: string;
  white: string;
  black: string;
};

export const DARK_THEME: ThemeColors = {
  primary:    '#833AB4',
  primaryDark:'#6B2D96',
  background: '#1d1f23',
  surface:    '#121212',
  surfaceAlt: '#303238',
  scoreCard:  '#18191d',
  border:     'rgba(255,255,255,0.09)',
  border2:    'rgba(255,255,255,0.16)',
  text:       '#e8e9ea',
  textMuted:  '#9a9da2',
  textDim:    '#5a5d63',
  icon:       '#e8e9ea',
  success:    '#71ff7e',
  warning:    '#F59E0B',
  error:      '#e63535',
  white:      '#FFFFFF',
  black:      '#000000',
};

export const LIGHT_THEME: ThemeColors = {
  primary:    '#833AB4',
  primaryDark:'#6B2D96',
  background: '#f2f2f7',
  surface:    '#ffffff',
  surfaceAlt: '#e5e5ea',
  scoreCard:  '#f5f3ff',
  border:     'rgba(0,0,0,0.09)',
  border2:    'rgba(0,0,0,0.18)',
  text:       '#000000',
  textMuted:  '#3c3c43',
  textDim:    '#8e8e93',
  icon:       '#1c1c1e',
  success:    '#16a34a',
  warning:    '#D97706',
  error:      '#dc2626',
  white:      '#FFFFFF',
  black:      '#000000',
};

// Backward-compat alias — dark values; use useColors() inside components for theming
export const Colors = DARK_THEME;

// V1Portal brand gradient (6-stop purple -> pink -> red -> orange -> gold) —
// matches web's BRAND_GRADIENT_STOPS. Used on CTAs, role icons, breakdown bars.
export const GRADIENT = ['#82008F', '#C0007A', '#EA0C5F', '#FF5341', '#FF8820', '#F6BA00'] as const;

// Same 6-stop brand gradient, aliased to match web's naming for score/tier/
// identity elements (the "signal" gradient — from the logo mark / signal dot).
export const SIGNAL_GRADIENT = GRADIENT;

// Web's "flame" gradient — red -> orange, used for action/CTA surfaces
// (buttons, progress fills, the current-step glow). Matches web's literal
// `linear-gradient(135deg, #ff0000, #ffa700)`, e.g. the dashboard's
// "Your Gameplan" hero card.
export const FLAME_GRADIENT = ['#ff0000', '#ffa700'] as const;

// V1 Score's own red -> gold identity — distinct from the general brand sweep
// above. Matches web's V1 Score ring/card gradient.
export const SCORE_GRADIENT = ['#EA0C5F', '#FF5341', '#FF8820', '#F6BA00'] as const;

// Fixed brand accents (not theme-dependent) — matches web's --pinkred / --green tokens.
export const PINK_RED = '#EA0C5F';
export const BRAND_GREEN = '#71ff7e';

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function sampleGradient(stops: readonly string[], t: number): string {
  const n = stops.length - 1;
  const pos = Math.min(Math.max(t, 0), 1) * n;
  const idx = Math.min(Math.floor(pos), n - 1);
  const frac = pos - idx;
  const c0 = hexToRgb(stops[idx]);
  const c1 = hexToRgb(stops[idx + 1]);
  const r = Math.round(c0.r + (c1.r - c0.r) * frac);
  const g = Math.round(c0.g + (c1.g - c0.g) * frac);
  const b = Math.round(c0.b + (c1.b - c0.b) * frac);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

// Samples a sub-range [t0, t1] of a multi-stop gradient into its own color
// array — used so a gradient split across several adjacent segments (e.g. a
// segmented progress bar) reads as one continuous sweep instead of each
// segment restarting the full gradient from its first stop.
export function sliceGradient(stops: readonly string[], t0: number, t1: number, samples = 5): string[] {
  const colors: string[] = [];
  for (let k = 0; k < samples; k++) {
    colors.push(sampleGradient(stops, t0 + (t1 - t0) * (k / (samples - 1))));
  }
  return colors;
}

// Computes continuous gradient slices for a "done" trail rendered as
// alternating node/connector elements (node, connector, node, connector, …) —
// e.g. the Gameplan tracker's step circles or the phase list's checkmark
// badges and the lines linking them — so the whole trail reads as one
// flowing sweep instead of each node/connector restarting the gradient.
// Returns one entry per input flag: null for a not-done phase, otherwise
// { nodeColors, connectorColors } (connectorColors omitted for the final
// phase in the array, which has no trailing connector).
export function phaseTrailSlices(
  doneFlags: boolean[],
  stops: readonly string[] = SIGNAL_GRADIENT
): ({ nodeColors: string[]; connectorColors?: string[] } | null)[] {
  const n = doneFlags.length;
  const doneCount = doneFlags.filter(Boolean).length;
  if (doneCount === 0) return doneFlags.map(() => null);

  const lastIsFinalPhase = doneFlags[n - 1] === true;
  const totalUnits = lastIsFinalPhase ? doneCount * 2 - 1 : doneCount * 2;
  let unit = 0;

  return doneFlags.map((done, i) => {
    if (!done) return null;
    const nodeColors = sliceGradient(stops, unit / totalUnits, (unit + 1) / totalUnits, 2);
    unit += 1;
    const hasConnector = i < n - 1;
    if (!hasConnector) return { nodeColors };
    const connectorColors = sliceGradient(stops, unit / totalUnits, (unit + 1) / totalUnits, 5);
    unit += 1;
    return { nodeColors, connectorColors };
  });
}

// Instagram-style purple -> pink -> orange -> gold sweep used specifically for
// the dashboard tier pill and the Match+/Free tier status panel — matches
// web's literal `linear-gradient(135deg, #833AB4, #C13584, #E1306C, #F56040, #FCAF45)`,
// a different (less saturated) stop set than the general brand GRADIENT above.
export const TIER_GRADIENT = ['#833AB4', '#C13584', '#E1306C', '#F56040', '#FCAF45'] as const;

// Tier progression bars (matches web ScoreAnimator)
export const TIER_BARS = [
  { label: 'Dev',   color: '#006aff' },
  { label: 'Emrg',  color: '#00b4ff' },
  { label: 'Comp',  color: '#00ff1e' },
  { label: 'Cont',  color: '#4040dd' },
  { label: 'Elite', color: '#6020ff' },
] as const;

// Score number color — interpolates blue → cyan → green (matches ScoreAnimator)
export function scoreNumColor(score: number): string {
  const t = Math.min(score / 99.9, 1);
  const stops: [number, [number, number, number]][] = [
    [0,   [0, 106, 255]],
    [0.5, [0, 180, 255]],
    [1.0, [0, 255,  30]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (t <= s1) {
      const p = (t - s0) / (s1 - s0);
      return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * p)},${Math.round(c0[1] + (c1[1] - c0[1]) * p)},${Math.round(c0[2] + (c1[2] - c0[2]) * p)})`;
    }
  }
  return '#006aff';
}

export type ColorKey = keyof typeof Colors;

// ─── Tier color system ────────────────────────────────────────────────────────

export const TIER_COLORS = {
  'Match+':        'rgb(255, 148, 0)',
  'Match+ Trial':  'rgb(255, 148, 0)',
  'Scout':         '#9900ff',
  'Free':          '#101010',
} as const;

export type TierName = keyof typeof TIER_COLORS;

export function getTierFromAthlete(
  status: string | null | undefined,
  tier: string | null | undefined,
  hasAthlete: boolean,
): TierName {
  if (status === 'active') return 'Match+';
  if (status === 'trial') return 'Match+ Trial';
  if (hasAthlete) return 'Scout';
  return 'Free';
}
