import { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  bordered?: boolean;
}

export function Card({ children, style, bordered }: CardProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  return <View style={[s.card, bordered && s.bordered, style]}>{children}</View>;
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: { backgroundColor: C.surface, borderRadius: 14, padding: 16 },
    bordered: { borderWidth: 1, borderColor: C.border },
  });
}
