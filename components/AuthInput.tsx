import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  showToggle?: boolean;
}

export const AuthInput = forwardRef<TextInput, AuthInputProps>(
  ({ label, error, style, showToggle, secureTextEntry, ...props }, ref) => {
    const [hidden, setHidden] = useState(true);
    const isSecure = showToggle ? hidden : (secureTextEntry ?? false);

    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            ref={ref}
            style={[styles.input, showToggle && styles.inputPadded, !!error && styles.inputError, style]}
            placeholderTextColor={Colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={isSecure}
            {...props}
          />
          {showToggle && (
            <Pressable onPress={() => setHidden(h => !h)} style={styles.eyeBtn} hitSlop={8}>
              <Ionicons
                name={hidden ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={Colors.textDim}
              />
            </Pressable>
          )}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  }
);

AuthInput.displayName = 'AuthInput';

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    color: '#6b6d70',
    marginBottom: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: FontFamily.body,
    fontSize: 17,
    color: Colors.text,
  },
  inputPadded: {
    paddingRight: 44,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 1,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: '#ff8a8a',
    marginTop: 4,
  },
});
