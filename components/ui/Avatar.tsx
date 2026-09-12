import { Image } from 'react-native';
import { DEFAULT_PROFILE_IMAGE } from '../../constants/ProfileImage';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
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

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  return (
    <Image
      source={uri ? { uri } : DEFAULT_PROFILE_IMAGE}
      accessibilityLabel={name ? `${name}'s profile photo` : 'Profile photo'}
      style={{ width: size, height: size, borderRadius: size / 2, flexShrink: 0 }}
    />
  );
}
