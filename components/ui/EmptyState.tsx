import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../constants/Fonts';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Used for the "couldn't load" case, where a plain retry link fits better than a gradient CTA. */
  variant?: 'empty' | 'error';
}

export function EmptyState({ icon, title, body, actionLabel, onAction, variant = 'empty' }: EmptyStateProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  return (
    <View style={s.wrap}>
      <Ionicons
        name={icon ?? (variant === 'error' ? 'alert-circle-outline' : 'file-tray-outline')}
        size={44}
        color={C.textDim}
        style={{ opacity: 0.6, marginBottom: 16 }}
      />
      <Text style={s.title}>{title}</Text>
      {body ? <Text style={s.body}>{body}</Text> : null}
      {actionLabel && onAction && (
        variant === 'error' ? (
          <Pressable onPress={onAction}>
            <Text style={s.retryLink}>{actionLabel}</Text>
          </Pressable>
        ) : (
          <Pressable style={s.actionWrap} onPress={onAction}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={s.actionText}>{actionLabel}</Text>
          </Pressable>
        )
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
    title: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text, marginBottom: 8, textAlign: 'center' },
    body: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, marginBottom: 20, textAlign: 'center', lineHeight: 19 },
    actionWrap: { borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10, overflow: 'hidden' },
    actionText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
    retryLink: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.primary },
  });
}
