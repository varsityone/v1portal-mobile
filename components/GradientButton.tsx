import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, PressableProps, StyleProp, ViewStyle } from 'react-native';

const COLORS: [string, string, string] = ['#833AB4', '#C13584', '#E1306C'];

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function GradientButton({ children, style, disabled, ...props }: Props) {
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        s.base,
        style,
        pressed && s.pressed,
        disabled && s.disabled,
      ]}
    >
      <LinearGradient
        colors={COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    position: 'relative',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
