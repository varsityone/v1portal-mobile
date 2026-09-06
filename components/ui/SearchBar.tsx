import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../constants/Fonts';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  filterActive?: boolean;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…', onFilterPress, filterActive }: SearchBarProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  return (
    <View style={s.row}>
      <View style={s.inputWrap}>
        <Ionicons name="search" size={16} color={C.textDim} />
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textDim}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={C.textDim} />
          </Pressable>
        )}
      </View>
      {onFilterPress && (
        <Pressable
          style={[s.filterBtn, filterActive && { borderColor: C.primary, backgroundColor: `${C.primary}18` }]}
          onPress={onFilterPress}
        >
          <Ionicons name="options-outline" size={18} color={filterActive ? C.primary : C.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    input: { flex: 1, fontFamily: FontFamily.body, fontSize: 14, color: C.text, padding: 0 },
    filterBtn: {
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: C.border,
    },
  });
}
