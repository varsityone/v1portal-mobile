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
