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
  background: '#0a0a0b',
  surface:    '#141416',
  surfaceAlt: '#1c1c1f',
  scoreCard:  '#0e0b14',
  border:     'rgba(255,255,255,0.09)',
  border2:    'rgba(255,255,255,0.18)',
  text:       '#ffffff',
  textMuted:  '#8e8e93',
  textDim:    '#48484a',
  icon:       '#ffffff',
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
