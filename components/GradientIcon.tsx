import { Platform } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface GradientIconProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size: number;
  colors: readonly string[];
}

// Ionicons only exposes a flat `color` prop — there's no per-path stroke to
// hand to an SVG <LinearGradient> the way web does with its shared
// `stroke="url(#fcardIconGrad)"` def. MaskedView is the standard RN
// equivalent: render the icon as a mask, then paint a gradient underneath it.
export default function GradientIcon({ name, size, colors }: GradientIconProps) {
  // MaskedView doesn't work on React Native Web -- the mask silently fails
  // there and every gradient icon renders as a solid black shape instead.
  // This never ships (the app is iOS/Android only), but it's confusing when
  // previewing in a browser, so fall back to a flat color from the same
  // gradient instead of the broken mask.
  if (Platform.OS === 'web') {
    return <Ionicons name={name} size={size} color={colors[0]} />;
  }
  return (
    <MaskedView
      maskElement={<Ionicons name={name} size={size} color="#000" />}
      style={{ width: size, height: size }}
    >
      <LinearGradient
        colors={colors as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: size, height: size }}
      />
    </MaskedView>
  );
}
