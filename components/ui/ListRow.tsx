import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../constants/Fonts';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface ListRowProps {
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  style?: ViewStyle;
  highlighted?: boolean;
}

export function ListRow({ left, title, subtitle, right, onPress, showChevron, style, highlighted }: ListRowProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const content = (
    <View style={[s.row, highlighted && s.highlighted, style]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right}
      {showChevron && <Ionicons name="chevron-forward" size={16} color={C.textDim} />}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      {content}
    </Pressable>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      padding: 14,
    },
    highlighted: { borderColor: `${C.primary}4D` },
    title: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    subtitle: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 3 },
  });
}
