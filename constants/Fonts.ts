// Matches web's type system: Big Shoulders Display (headlines), Archivo (body),
// JetBrains Mono (labels/data), DM Sans (big stat numbers — V1 Score, StatCard
// values — matches web's var(--font-dm-sans) used specifically for those).
// Registered via useFonts() in app/_layout.tsx — these string values are the
// exact keys passed there.
export const FontFamily = {
  headline:      'BigShouldersDisplay_900Black',
  headlineBold:  'BigShouldersDisplay_800ExtraBold',
  headlineSemi:  'BigShouldersDisplay_700Bold',
  body:          'Archivo_500Medium',
  bodySemi:      'Archivo_600SemiBold',
  bodyBold:      'Archivo_700Bold',
  bodyExtraBold: 'Archivo_800ExtraBold',
  mono:          'JetBrainsMono_600SemiBold',
  monoBold:      'JetBrainsMono_700Bold',
  statNumber:    'DMSans_900Black',
} as const;

export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
} as const;
