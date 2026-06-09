import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
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

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? Colors.text : '#000'} size="small" />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.ghostLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.success,
    borderRadius: 10,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
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
    color: '#000',
    letterSpacing: -0.2,
  },
  ghostLabel: {
    color: Colors.textMuted,
    fontWeight: '400',
  },
});
