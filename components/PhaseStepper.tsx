import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GameplanPhases } from '../hooks/useGameplanPhases';
import { ThemeColors, SIGNAL_GRADIENT, FLAME_GRADIENT, phaseTrailSlices } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';
import { useColors } from '../context/ThemeContext';
import { UpgradeSheet } from './UpgradeSheet';

interface PhaseStepperProps {
  currentPhaseNumber: number;
  gp: GameplanPhases;
}

const NODE_SIZE = 34;
const COL_PAD_TOP = 4;
const CONNECTOR_TOP = COL_PAD_TOP + NODE_SIZE / 2 - 1; // node's vertical center, minus half the line's own height

/**
 * Compact horizontal step tracker for a phase's own screen — lets you jump
 * straight to any reached phase without backing out to the Gameplan list
 * first. Each step is an equal-width column; the connector is drawn as an
 * absolute line (left: 50%, width: 100%) through the node's vertical center
 * rather than as a flex sibling — a flex-sibling connector pushes the node
 * off-center the moment its own width isn't perfectly symmetric, which was
 * exactly the bug in the first pass of this layout.
 */
export function PhaseStepper({ currentPhaseNumber, gp }: PhaseStepperProps) {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { phases, phaseLocked, phaseComplete } = gp;
  const trail = useMemo(() => phaseTrailSlices(phaseComplete), [phaseComplete]);

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
            <View key={phase.number} style={s.stepCol}>
              {!isLast && (
                status === 'done'
                  ? <LinearGradient colors={(trail[i]?.connectorColors ?? SIGNAL_GRADIENT) as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.connectorAbs} />
                  : <View style={[s.connectorAbs, s.connectorLine]} />
              )}

              <Pressable
                onPress={() => handlePress(i)}
                disabled={isCurrent}
                style={s.nodeWrap}
                hitSlop={8}
              >
                {status === 'done' ? (
                  <LinearGradient colors={(trail[i]?.nodeColors ?? SIGNAL_GRADIENT) as unknown as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.node}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </LinearGradient>
                ) : isCurrent ? (
                  <PulsingCurrentNode number={phase.number} s={s} />
                ) : (
                  <View style={[s.node, s.nodeLocked]}>
                    <Ionicons name="lock-closed" size={10} color={C.textDim} />
                  </View>
                )}
              </Pressable>
              <Text
                numberOfLines={1}
                style={[s.label, isCurrent && s.labelCurrent, status === 'upcoming' && s.labelDim]}
              >
                {phase.title}
              </Text>
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

// Matches web's .gpl-node.current pulse animation — a soft flame-gradient
// glow ring that breathes in and out on a 2.6s loop.
function PulsingCurrentNode({ number, s }: { number: number; s: ReturnType<typeof createStyles> }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.08] });

  return (
    <View style={s.currentWrap}>
      <Animated.View style={[s.currentGlow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />
      <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.currentBorder}>
        <View style={s.currentInner}>
          <Text style={s.nodeNumCurrent}>{number}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row' },
    stepCol: { flex: 1, alignItems: 'center', paddingTop: COL_PAD_TOP },
    connectorAbs: { position: 'absolute', top: CONNECTOR_TOP, left: '50%', width: '100%', height: 2 },
    connectorLine: { backgroundColor: C.border },
    nodeWrap: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' },
    node: {
      width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.border,
    },
    nodeLocked: { backgroundColor: 'transparent', opacity: 0.6 },
    nodeNumCurrent: { fontFamily: FontFamily.monoBold, fontSize: 13, color: C.text },
    currentWrap: { width: NODE_SIZE, height: NODE_SIZE, alignItems: 'center', justifyContent: 'center' },
    currentGlow: { position: 'absolute', width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, backgroundColor: FLAME_GRADIENT[1] },
    currentBorder: { width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2, padding: 2.5, alignItems: 'center', justifyContent: 'center' },
    currentInner: { flex: 1, width: '100%', borderRadius: NODE_SIZE / 2 - 2, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' },
    label: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 6, textAlign: 'center', paddingHorizontal: 2 },
    labelCurrent: { fontFamily: FontFamily.bodyExtraBold, color: C.text },
    labelDim: { color: C.textDim },
  });
}
