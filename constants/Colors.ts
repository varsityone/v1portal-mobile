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
  success: string;
  warning: string;
  error: string;
  white: string;
  black: string;
};

export const DARK_THEME: ThemeColors = {
  primary:    '#833AB4',
  primaryDark:'#6B2D96',
  background: '#18191d',
  surface:    '#28292e',
  surfaceAlt: '#303238',
  scoreCard:  '#0e0b14',
  border:     'rgba(255,255,255,0.09)',
  border2:    'rgba(255,255,255,0.16)',
  text:       '#e8e9ea',
  textMuted:  '#9a9da2',
  textDim:    '#5a5d63',
  success:    '#71ff7e',
  warning:    '#F59E0B',
  error:      '#e63535',
  white:      '#FFFFFF',
  black:      '#000000',
};

export const LIGHT_THEME: ThemeColors = {
  primary:    '#833AB4',
  primaryDark:'#6B2D96',
  background: '#f0f0f0',
  surface:    '#ffffff',
  surfaceAlt: '#e8e8ed',
  scoreCard:  '#f5f3ff',
  border:     'rgba(0,0,0,0.08)',
  border2:    'rgba(0,0,0,0.14)',
  text:       '#1a1b1d',
  textMuted:  '#5a5d63',
  textDim:    '#9a9da2',
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
