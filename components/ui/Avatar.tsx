import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '../../constants/Fonts';
import { ThemeColors } from '../../constants/Colors';
import { useColors, useTheme } from '../../context/ThemeContext';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Shown instead of initials when there's no photo (e.g. a position code). */
  fallbackText?: string | null;
  fallbackColor?: string;
}

// Same initials algorithm as CoachDrawer.tsx's profile header — first letter
// of up to the first 2 words of the name, uppercased.
export function initialsFor(name: string | null | undefined, email?: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
  return (email ?? '').slice(0, 2).toUpperCase();
}

export function Avatar({ uri, name, size = 44, fallbackText, fallbackColor }: AvatarProps) {
  const C = useColors();
  const { theme } = useTheme();
  const s = useMemo(() => createStyles(C, size), [C, size]);

  if (uri) {
    return <Image source={{ uri }} style={s.photo} />;
  }

  const bg = fallbackColor ?? (theme === 'dark' ? '#ffffff' : '#000000');
  const fg = fallbackColor ? C.white : (theme === 'dark' ? '#000000' : '#ffffff');
  const label = fallbackText ?? initialsFor(name);

  return (
    <View style={[s.photo, s.fallback, { backgroundColor: fallbackColor ? `${fallbackColor}22` : bg, borderColor: fallbackColor ? `${fallbackColor}55` : 'transparent', borderWidth: fallbackColor ? 1.5 : 0 }]}>
      <Text style={[s.initials, { color: fallbackColor ?? fg }]}>{label}</Text>
    </View>
  );
}

function createStyles(C: ThemeColors, size: number) {
  return StyleSheet.create({
    photo: { width: size, height: size, borderRadius: size / 2, flexShrink: 0 },
    fallback: { alignItems: 'center', justifyContent: 'center' },
    initials: { fontFamily: FontFamily.bodyExtraBold, fontSize: size * 0.36 },
  });
}
