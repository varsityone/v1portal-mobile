import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, GRADIENT } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';

interface AuthButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}

export function AuthButton({
  label,
  onPress,
  loading = false,
  variant = 'primary',
  disabled,
}: AuthButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'ghost') {
    return (
      <Pressable
        style={({ pressed }) => [styles.ghost, isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed]}
        onPress={onPress}
        disabled={isDisabled}
      >
        {loading
          ? <ActivityIndicator color={Colors.text} size="small" />
          : <Text style={styles.ghostLabel}>{label}</Text>}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed]}
    >
      <LinearGradient
        colors={GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.label}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 100,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
  },
  label: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    color: '#fff',
    letterSpacing: -0.2,
  },
  ghostLabel: {
    fontFamily: FontFamily.body,
    color: Colors.textMuted,
  },
});
