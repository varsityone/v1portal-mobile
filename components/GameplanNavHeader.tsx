import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAthleteData } from '../hooks/useAthleteData';
import { useMatchCount } from '../hooks/useMatchCount';
import { useGameplanPhases } from '../hooks/useGameplanPhases';
import { PhaseStepper } from './PhaseStepper';
import GradientRing from './GradientRing';
import { ThemeColors, SIGNAL_GRADIENT } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';
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
        <View style={s.titleRow}>
          <GradientRing size={34} strokeWidth={3.5} progress={gp.progressPct} colors={SIGNAL_GRADIENT} trackColor={C.border}>
            <Text style={s.ringPct}>{Math.round(gp.progressPct)}<Text style={s.ringPctSign}>%</Text></Text>
          </GradientRing>
          <View>
            <Text style={s.eyebrow}>Roadmap</Text>
            <Text style={s.title}>The Gameplan</Text>
          </View>
        </View>
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
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    ringPct: { fontFamily: FontFamily.monoBold, fontSize: 10, color: C.text },
    ringPctSign: { fontSize: 7 },
    eyebrow: { fontFamily: FontFamily.eyebrow, fontSize: 8.5, color: C.textDim, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 },
    title: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text },
    stepperWrap: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 12 },
  });
}
