import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameplanPhases } from '../hooks/useGameplanPhases';
import { ThemeColors } from '../constants/Colors';
import { useColors } from '../context/ThemeContext';
import { UpgradeSheet } from './UpgradeSheet';

interface PhaseStepperProps {
  currentPhaseNumber: number;
  gp: GameplanPhases;
}

/**
 * Persistent step tracker for a phase's own screen — lets you jump straight to any
 * reached phase without backing out to the Gameplan list first (Carvana checkout-flow
 * mechanic: done steps checked, current step highlighted, future steps stay locked).
 */
export function PhaseStepper({ currentPhaseNumber, gp }: PhaseStepperProps) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { phases, phaseLocked } = gp;

  const [sheet, setSheet] = useState<{ visible: boolean; phaseIdx: number }>({ visible: false, phaseIdx: 0 });

  const handlePress = (i: number) => {
    const phase = phases[i];
    if (phase.number === currentPhaseNumber) return;
    if (phaseLocked[i]) {
      setSheet({ visible: true, phaseIdx: i });
      return;
    }
    router.replace(`/(tabs)/gameplan/${phase.number}` as any);
  };

  return (
    <>
      <View style={s.row}>
        {phases.map((phase, i) => {
          const status = gp.getStatus(i);
          const isCurrent = phase.number === currentPhaseNumber;
          const isLast = i === phases.length - 1;

          return (
            <View key={phase.number} style={s.step}>
              <Pressable
                onPress={() => handlePress(i)}
                disabled={isCurrent}
                style={s.nodeCol}
                hitSlop={8}
              >
                <View style={[
                  s.node,
                  status === 'done' && s.nodeDone,
                  isCurrent && s.nodeCurrent,
                  status === 'upcoming' && s.nodeLocked,
                ]}>
                  {status === 'done'
                    ? <Ionicons name="checkmark" size={13} color={C.background} />
                    : status === 'upcoming'
                    ? <Ionicons name="lock-closed" size={10} color={C.textDim} />
                    : <Text style={[s.nodeNum, isCurrent && s.nodeNumCurrent]}>{phase.number}</Text>
                  }
                </View>
                <Text
                  numberOfLines={1}
                  style={[s.label, isCurrent && s.labelCurrent, status === 'upcoming' && s.labelDim]}
                >
                  {phase.title}
                </Text>
              </Pressable>
              {!isLast && (
                <View style={[s.connector, status === 'done' && s.connectorDone]} />
              )}
            </View>
          );
        })}
      </View>

      <UpgradeSheet
        visible={sheet.visible}
        onClose={() => setSheet(v => ({ ...v, visible: false }))}
        requiredPhaseNumber={sheet.phaseIdx > 0 ? phases[sheet.phaseIdx - 1].number : 0}
        requiredPhaseName={sheet.phaseIdx > 0 ? phases[sheet.phaseIdx - 1].title : ''}
        phaseNumber={phases[sheet.phaseIdx]?.number ?? 0}
        phaseName={phases[sheet.phaseIdx]?.title ?? ''}
      />
    </>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    step: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
    nodeCol: { alignItems: 'center', width: 76, paddingVertical: 4 },
    node: {
      width: 34, height: 34, borderRadius: 17,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.border,
    },
    nodeDone: { backgroundColor: C.text, borderColor: C.text },
    nodeCurrent: { backgroundColor: 'transparent', borderWidth: 2.5, borderColor: C.primary },
    nodeLocked: { backgroundColor: 'transparent' },
    nodeNum: { fontSize: 13, fontWeight: '700', color: C.textDim },
    nodeNumCurrent: { color: C.primary },
    label: { fontSize: 12, color: C.textDim, marginTop: 6, textAlign: 'center', fontWeight: '500' },
    labelCurrent: { color: C.text, fontWeight: '800' },
    labelDim: { color: C.textDim },
    connector: { flex: 1, height: 2, backgroundColor: C.border, marginTop: 17, marginHorizontal: -8 },
    connectorDone: { backgroundColor: C.text, opacity: 0.4 },
  });
}
