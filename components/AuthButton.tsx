import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

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
        colors={['#ff0000', '#aa00ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  ghostLabel: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
});
