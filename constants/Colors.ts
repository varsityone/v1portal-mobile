export const Colors = {
  // ── Primary ─────────────────────────────────────────────────
  primary: '#833AB4',          // purple — matches web var(--purple)
  primaryDark: '#6B2D96',

  // ── Backgrounds ─────────────────────────────────────────────
  background: '#18191d',       // dark charcoal — matches web --bg
  surface: '#28292e',          // lifted surface — matches web --surface
  surfaceAlt: '#303238',       // surface2 — matches web --surface2
  scoreCard: '#0e0b14',        // deep purple-black for score card background

  // ── Borders ─────────────────────────────────────────────────
  border: 'rgba(255,255,255,0.09)',   // matches web --border
  border2: 'rgba(255,255,255,0.16)',  // matches web --border2

  // ── Text ────────────────────────────────────────────────────
  text: '#e8e9ea',             // off-white — matches web --text
  textMuted: '#9a9da2',        // matches web --text2
  textDim: '#5a5d63',          // matches web --text3

  // ── Semantic ────────────────────────────────────────────────
  success: '#71ff7e',          // neon green — matches web --green
  warning: '#F59E0B',          // amber
  error: '#e63535',            // matches web --red

  // ── Neutrals ────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Instagram-style gradient — used on score display, breakdown bars, CTAs
export const GRADIENT = ['#833AB4', '#C13584', '#E1306C', '#F56040', '#FCAF45'] as const;

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
