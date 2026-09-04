import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAthleteData } from '../hooks/useAthleteData';
import { useMatchCount } from '../hooks/useMatchCount';
import { useGameplanPhases } from '../hooks/useGameplanPhases';
import { PhaseStepper } from './PhaseStepper';
import { ThemeColors } from '../constants/Colors';
import { useColors } from '../context/ThemeContext';

/**
 * The persistent nav shell for the whole Gameplan flow — mounted as the Stack's
 * native header (see gameplan/_layout.tsx) so it stays put across the list screen
 * and every phase screen, the way Carvana's checkout sidebar stays put across steps.
 */
export function GameplanNavHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const { athlete, assessment } = useAthleteData();
  const matchCount = useMatchCount(athlete?.id);
  const gp = useGameplanPhases(athlete, assessment, matchCount);

  const phaseMatch = pathname.match(/\/gameplan\/(\d+)/);
  const currentPhaseNumber = phaseMatch ? Number(phaseMatch[1]) : gp.activePhaseIdx + 1;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.icon} />
        </Pressable>
        <Text style={s.title}>The Gameplan</Text>
        <View style={s.backBtn} />
      </View>
      <View style={s.stepperWrap}>
        <PhaseStepper currentPhaseNumber={currentPhaseNumber} gp={gp} />
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { backgroundColor: C.background, borderBottomWidth: 1, borderBottomColor: C.border },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6 },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 15, fontWeight: '700', color: C.text },
    stepperWrap: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 },
  });
}
