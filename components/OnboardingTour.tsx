import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '../constants/Fonts';

export interface TourStep {
  target: string;
  title: string;
  description: string;
}

export interface TourMeasurement { x: number; y: number; width: number; height: number }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  steps: TourStep[];
  /** Absolute screen-space measurements per step target, from measureInWindow. A
   *  missing entry means that target isn't on screen for this user/state —
   *  the step is skipped, matching web's OnboardingTour graceful-skip behavior. */
  targets: Record<string, TourMeasurement | undefined>;
}

const PAD = 8;
const POPOVER_W = 300;

// Matches web's components/OnboardingTour.tsx: a spotlight cutout (four dim
// bands framing the highlighted element, since RN has no CSS box-shadow
// cutout trick) + a card popover with step progress, title, description,
// and back/next/skip actions.
export default function OnboardingTour({ isOpen, onClose, steps, targets }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const { width: vw, height: vh } = Dimensions.get('window');

  // Skip past any step whose target isn't present on screen right now.
  useEffect(() => {
    if (!isOpen) return;
    if (stepIndex >= steps.length) { onClose(); return; }
    if (!targets[steps[stepIndex].target]) {
      if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
      else onClose();
    }
  }, [isOpen, stepIndex, steps, targets]);

  useEffect(() => {
    if (!isOpen) { fade.setValue(0); return; }
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [isOpen, stepIndex]);

  if (!isOpen) return null;

  const cur = steps[stepIndex];
  const box = targets[cur?.target];
  if (!box) return null;

  const hl = { top: box.y - PAD, left: box.x - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 };

  const popTop = Math.max(8, Math.min(hl.top + hl.height + 14, vh - 260));
  const popLeft = Math.max(8, Math.min(hl.left + hl.width / 2 - POPOVER_W / 2, vw - POPOVER_W - 8));

  const goNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex(i => i + 1);
    else onClose();
  };
  const goPrev = () => { if (stepIndex > 0) setStepIndex(i => i - 1); };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* Spotlight cutout: four dim bands framing the highlight box */}
      <View pointerEvents="none" style={[s.dim, { top: 0, left: 0, right: 0, height: Math.max(0, hl.top) }]} />
      <View pointerEvents="none" style={[s.dim, { top: hl.top + hl.height, left: 0, right: 0, bottom: 0 }]} />
      <View pointerEvents="none" style={[s.dim, { top: hl.top, left: 0, width: Math.max(0, hl.left), height: hl.height }]} />
      <View pointerEvents="none" style={[s.dim, { top: hl.top, left: hl.left + hl.width, right: 0, height: hl.height }]} />
      <View pointerEvents="none" style={[s.highlightBox, { top: hl.top, left: hl.left, width: hl.width, height: hl.height }]} />

      <Animated.View style={[s.popover, { top: popTop, left: popLeft, opacity: fade }]}>
        <View style={s.headerRow}>
          <Text style={s.stepLabel}>STEP {stepIndex + 1} OF {steps.length}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={s.skipText}>SKIP TOUR</Text>
          </Pressable>
        </View>

        <View style={s.progressRow}>
          {steps.map((_, i) => (
            <View key={i} style={[s.progressSeg, i <= stepIndex && s.progressSegFilled]} />
          ))}
        </View>

        <Text style={s.title}>{cur.title}</Text>
        <Text style={s.description}>{cur.description}</Text>

        <View style={s.actions}>
          {stepIndex > 0 && (
            <Pressable style={s.backBtn} onPress={goPrev}>
              <Text style={s.backBtnText}>← Back</Text>
            </Pressable>
          )}
          <Pressable style={s.nextBtn} onPress={goNext}>
            <Text style={s.nextBtnText}>{stepIndex === steps.length - 1 ? 'Done →' : 'Next →'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.72)' },
  highlightBox: {
    position: 'absolute', borderRadius: 14, borderWidth: 2, borderColor: '#fff',
  },
  popover: {
    position: 'absolute', width: POPOVER_W,
    backgroundColor: '#1d1f23', borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  stepLabel: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#fff', letterSpacing: 1.5 },
  skipText: { fontFamily: FontFamily.bodyBold, fontSize: 9, color: '#9a9da2', letterSpacing: 1 },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: 13 },
  progressSeg: { flex: 1, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressSegFilled: { backgroundColor: '#facc15' },
  title: { fontFamily: FontFamily.headline, fontSize: 16, color: '#fff', marginBottom: 6 },
  description: { fontFamily: FontFamily.body, fontSize: 12, color: '#c8c9cc', lineHeight: 18, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  backBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  backBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: '#c8c9cc' },
  nextBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center' },
  nextBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#000' },
});
