import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '../../constants/Fonts';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

export interface ChipOption {
  label: string;
  value: string;
  color?: string;
}

interface FilterChipsProps {
  options: ChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  horizontal?: boolean;
  singleSelect?: boolean;
}

// Multi-select pill row — used by Search (position/state/grad-year), Profile
// Edit (position_needs/level_bands), Pipeline (status filter), and the
// state-targeting screen's region groupings.
export function FilterChips({ options, selected, onToggle, horizontal = true, singleSelect }: FilterChipsProps) {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const chips = options.map(opt => {
    const active = selected.includes(opt.value);
    const color = opt.color ?? C.primary;
    return (
      <Pressable
        key={opt.value}
        style={[
          s.chip,
          active ? { backgroundColor: `${color}18`, borderColor: color } : { borderColor: C.border },
        ]}
        onPress={() => onToggle(opt.value)}
      >
        <Text style={[s.chipText, active && { color, fontFamily: FontFamily.bodyBold }]}>{opt.label}</Text>
      </Pressable>
    );
  });

  if (!horizontal) {
    return <View style={s.wrapRow}>{chips}</View>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {chips}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: { gap: 8, paddingVertical: 2 },
    wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5 },
    chipText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
  });
}
