import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useAthleteData } from '../hooks/useAthleteData';
import LoadingScreen from '../components/LoadingScreen';
import { getRecruitingLevelBand, RECRUITING_LEVEL_BANDS, RecruitingLevelBand } from '../lib/recruitingLevels';
import { FontFamily } from '../constants/Fonts';

// The app's primary CTA gradient (Sign In, Start Assessment).
const CTA_GRADIENT = ['#ff0000', '#aa00ff'] as const;
const GOLD = '#d9a84e';
const GOLD_HI = '#fbe7b0';
const BG = '#0a0a0b';
const SLIDE_MS = 3000;
const SLIDE_COUNT = 3;

// Same 5-segment strip and thresholds as components/ScoreAnimator.tsx.
const TIERS = ['Dev', 'Emrg', 'Comp', 'Cont', 'Elite'];
const TIER_THRESHOLDS = [45, 55, 65, 75, 85];
function tierIndex(score: number) {
  let idx = 0;
  TIER_THRESHOLDS.forEach((t, i) => { if (score >= t) idx = i; });
  return idx;
}

// Shown once, right after the embedded assessment submits: three full-screen
// beats (score, level, where you fit) the athlete taps through like stories,
// then Continue to Dashboard.
export default function ScoreRevealScreen() {
  const router = useRouter();
  const { athlete, assessment, loading } = useAthleteData();
  const score = assessment?.v1_score ?? athlete?.v1_score;

  useEffect(() => {
    if (!loading && score == null) router.replace('/(tabs)');
  }, [loading, score]);

  if (loading || score == null) return <LoadingScreen />;

  const rounded = Math.round(score);
  const rawLevel = assessment?.recruiting_level as unknown;
  const level =
    typeof rawLevel === 'string' ? rawLevel
    : (rawLevel as { level?: string } | null)?.level ?? athlete?.recruiting_level ?? getRecruitingLevelBand(rounded).level;
  // Describe the level the athlete is actually shown, falling back to the
  // score's band if the stored label isn't one of the canonical bands.
  const band = RECRUITING_LEVEL_BANDS.find(b => b.level === level) ?? getRecruitingLevelBand(rounded);

  return <Story score={rounded} level={level} band={band} onContinue={() => router.replace('/(tabs)')} />;
}

function Story({ score, level, band, onContinue }: { score: number; level: string; band: RecruitingLevelBand; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const bars = useRef(Array.from({ length: SLIDE_COUNT }, () => new Animated.Value(0))).current;
  const fades = useRef(Array.from({ length: SLIDE_COUNT }, (_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(false));
  }, []);

  const goTo = useCallback((next: number) => {
    const i = Math.max(0, Math.min(SLIDE_COUNT - 1, next));
    if (timer.current) clearTimeout(timer.current);
    bars.forEach((b, k) => { b.stopAnimation(); b.setValue(k < i ? 1 : 0); });
    fades.forEach((f, k) => Animated.timing(f, { toValue: k === i ? 1 : 0, duration: 350, useNativeDriver: true }).start());
    setIndex(i);
    if (reduceMotion) { bars[i].setValue(1); return; }
    const last = i === SLIDE_COUNT - 1;
    Animated.timing(bars[i], { toValue: 1, duration: last ? 900 : SLIDE_MS, easing: Easing.linear, useNativeDriver: false }).start();
    if (!last) timer.current = setTimeout(() => goTo(i + 1), SLIDE_MS);
  }, [bars, fades, reduceMotion]);

  useEffect(() => {
    if (reduceMotion === null) return;
    goTo(0);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [reduceMotion]);

  if (reduceMotion === null) return <View style={{ flex: 1, backgroundColor: BG }} />;
  const animate = !reduceMotion;

  return (
    <View style={s.root}>
      {[0, 1, 2].map(i => (
        <Animated.View key={i} pointerEvents={index === i ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { opacity: fades[i] }]}>
          {i === 0 && <ScoreSlide score={score} active={index === 0} animate={animate} insets={insets} />}
          {i === 1 && <LevelSlide score={score} level={level} band={band} active={index === 1} animate={animate} insets={insets} />}
          {i === 2 && <FitSlide band={band} active={index === 2} animate={animate} insets={insets} onContinue={onContinue} />}
        </Animated.View>
      ))}

      {/* Tap left to go back, right to advance. Stops short of the bottom so
          the last slide's Continue button stays tappable. */}
      <Pressable accessible={false} style={[s.tap, { left: 0, width: '30%', top: insets.top + 60, bottom: insets.bottom + 110 }]} onPress={() => index > 0 && goTo(index - 1)} />
      <Pressable accessible={false} style={[s.tap, { right: 0, width: '70%', top: insets.top + 60, bottom: insets.bottom + 110 }]} onPress={() => index < SLIDE_COUNT - 1 && goTo(index + 1)} />

      <View style={[s.bars, { top: insets.top + 10 }]} pointerEvents="none">
        {bars.map((b, i) => (
          <View key={i} style={s.bar}>
            <Animated.View style={[s.barFill, { width: b.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
        ))}
      </View>
      {index < SLIDE_COUNT - 1 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Skip to where you fit" onPress={() => goTo(SLIDE_COUNT - 1)} hitSlop={12} style={[s.skip, { top: insets.top + 24 }]}>
          <Text style={s.skipText}>SKIP</Text>
        </Pressable>
      )}
    </View>
  );
}

type Insets = { top: number; bottom: number };

function Glow({ cx, cy, rx, ry, color, opacity }: { cx: string; cy: string; rx: string; ry: string; color: string; opacity: number }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="g" cx={cx} cy={cy} rx={rx} ry={ry} fx={cx} fy={cy}>
          <Stop offset="0" stopColor={color} stopOpacity={opacity} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#g)" />
    </Svg>
  );
}

function ScoreSlide({ score, active, animate, insets }: { score: number; active: boolean; animate: boolean; insets: Insets }) {
  const [shown, setShown] = useState(animate ? 0 : score);
  const slam = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (!animate) { setShown(score); return; }
    setShown(0);
    const counter = new Animated.Value(0);
    const id = counter.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(counter, { toValue: score, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (!finished) return;
      setBurst(b => b + 1);
      Animated.sequence([
        Animated.timing(slam, { toValue: 1.22, duration: 90, useNativeDriver: true }),
        Animated.spring(slam, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]).start();
      Animated.sequence([6, -6, 4, -4, 2, 0].map(v => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }))).start();
    });
    return () => { counter.stopAnimation(); counter.removeListener(id); };
  }, [active]);

  return (
    <Animated.View style={[s.slide, s.center, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40, transform: [{ translateX: shake }] }]}>
      <Glow cx="50%" cy="48%" rx="70%" ry="45%" color="#ff3c14" opacity={0.22} />
      <Text style={s.kick}>YOUR V1 SCORE</Text>
      <View style={s.bigWrap}>
        <Animated.Text style={[s.big, { transform: [{ scale: slam }] }]}>{shown}</Animated.Text>
        {burst > 0 && <Sparks key={burst} color="#ff8a4a" />}
      </View>
      <Text style={[s.para, { textAlign: 'center' }]}>Built from your physical, production, intangibles and academic profile.</Text>
    </Animated.View>
  );
}

function LevelSlide({ score, level, band, active, animate, insets }: { score: number; level: string; band: RecruitingLevelBand; active: boolean; animate: boolean; insets: Insets }) {
  const words = useMemo(() => level.split(/\s+/).filter(Boolean), [level]);
  const rise = useRef(words.map(() => new Animated.Value(animate ? 0 : 1))).current;
  const [lit, setLit] = useState(animate ? -1 : tierIndex(score));

  useEffect(() => {
    if (!active || !animate) return;
    rise.forEach(v => v.setValue(0));
    setLit(-1);
    Animated.stagger(140, rise.map(v => Animated.timing(v, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }))).start();
    const target = tierIndex(score);
    const timers = Array.from({ length: target + 1 }, (_, i) => setTimeout(() => setLit(i), 600 + i * 110));
    return () => timers.forEach(clearTimeout);
  }, [active]);

  return (
    <View style={[s.slide, { justifyContent: 'center', paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}>
      <Glow cx="0%" cy="40%" rx="80%" ry="50%" color={GOLD} opacity={0.14} />
      <Text style={s.kick}>YOUR RECRUITING LEVEL</Text>
      <View style={s.levelBlock}>
        {words.map((w, i) => (
          <Animated.Text
            key={`${w}-${i}`}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[s.levelWord, { opacity: rise[i], transform: [{ translateY: rise[i].interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}
          >
            {w}
          </Animated.Text>
        ))}
      </View>
      <View style={s.tiers}>
        {TIERS.map((t, i) => (
          <View key={t} style={s.tierCol}>
            <View style={[s.tierBar, i <= lit && s.tierBarOn]} />
            <Text style={[s.tierLabel, i === lit && s.tierLabelOn]}>{t.toUpperCase()}</Text>
          </View>
        ))}
      </View>
      <Text style={s.para}>{band.description}</Text>
    </View>
  );
}

// "G5 FBS (AAC, Sun Belt, ...)" reads as a big row name plus a small tag.
function splitTarget(target: string) {
  const m = target.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { name: m[1], tag: m[2].toUpperCase() } : { name: target, tag: 'TARGET' };
}

function FitSlide({ band, active, animate, insets, onContinue }: { band: RecruitingLevelBand; active: boolean; animate: boolean; insets: Insets; onContinue: () => void }) {
  const rows = useMemo(() => band.targets.map(splitTarget), [band]);
  const slide = useRef(rows.map(() => new Animated.Value(animate ? 0 : 1))).current;
  const cta = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!active || !animate) return;
    slide.forEach(v => v.setValue(0));
    cta.setValue(0);
    Animated.parallel([
      Animated.stagger(120, slide.map(v => Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }))),
      Animated.timing(cta, { toValue: 1, duration: 450, delay: 700, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return (
    <View style={[s.slide, { paddingTop: insets.top + 110, paddingBottom: insets.bottom + 28 }]}>
      <Text style={s.kick}>WHERE YOU FIT</Text>
      <View style={s.rows}>
        {rows.map((r, i) => (
          <Animated.View key={r.name} style={[s.row, { opacity: slide[i], transform: [{ translateX: slide[i].interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}>
            <Text style={s.rowName} numberOfLines={1} adjustsFontSizeToFit>{r.name}</Text>
            <Text style={s.rowTag} numberOfLines={2}>{r.tag}</Text>
          </Animated.View>
        ))}
      </View>
      <Animated.View style={{ marginTop: 'auto', opacity: cta, transform: [{ translateY: cta.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <Pressable accessibilityRole="button" onPress={onContinue}>
          <LinearGradient colors={CTA_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
            <Text style={s.ctaText}>Continue to Dashboard</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// One burst of glowing sparks from the center of its parent, on the native
// driver. Each spark is a short streak pointed along its flight path.
const SPARK_COUNT = 36;
function Sparks({ color }: { color: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const sparks = useMemo(() => Array.from({ length: SPARK_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 110 + Math.random() * 150;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    return { angle, dx, dy, len: 10 + Math.random() * 14, drop: 40 + Math.random() * 50 };
  }), []);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, []);

  return (
    <View pointerEvents="none" style={s.sparkOrigin}>
      {sparks.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', width: p.len, height: 2, borderRadius: 1, backgroundColor: color,
            shadowColor: color, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 },
            opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              // Streak falls a little as it flies out.
              { translateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.dy * 0.75 + p.drop * 0.25, p.dy + p.drop] }) },
              { rotate: `${p.angle}rad` },
            ],
          }}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  slide: { flex: 1, paddingHorizontal: 24 },
  center: { justifyContent: 'center', alignItems: 'center' },
  tap: { position: 'absolute', zIndex: 5 },
  bars: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 4, zIndex: 6 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: '#fff' },
  skip: { position: 'absolute', right: 18, zIndex: 7 },
  skipText: { fontFamily: FontFamily.mono, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.55)' },
  kick: { fontFamily: FontFamily.mono, fontSize: 11, letterSpacing: 2.4, color: 'rgba(255,255,255,0.55)' },
  bigWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 20 },
  big: { fontFamily: FontFamily.statNumber, fontSize: 200, lineHeight: 200, letterSpacing: -10, color: '#fff' },
  sparkOrigin: { position: 'absolute', left: '50%', top: '50%', width: 0, height: 0, alignItems: 'center', justifyContent: 'center' },
  para: { fontFamily: FontFamily.body, fontSize: 15, lineHeight: 22, color: '#c9cbd0', maxWidth: 320 },
  levelBlock: { marginTop: 16, marginBottom: 6 },
  levelWord: { fontFamily: FontFamily.headline, fontSize: 64, lineHeight: 66, color: '#fff', textTransform: 'uppercase' },
  tiers: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 22 },
  tierCol: { flex: 1, alignItems: 'center', gap: 6 },
  tierBar: { height: 3, borderRadius: 2, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' },
  tierBarOn: { backgroundColor: GOLD },
  tierLabel: { fontFamily: FontFamily.mono, fontSize: 9, letterSpacing: 0.6, color: 'rgba(255,255,255,0.28)' },
  tierLabelOn: { color: GOLD_HI, fontFamily: FontFamily.monoBold },
  rows: { marginTop: 18 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rowName: { flexShrink: 1, fontFamily: FontFamily.headlineBold, fontSize: 34, lineHeight: 36, color: '#fff', textTransform: 'uppercase' },
  rowTag: { maxWidth: '45%', textAlign: 'right', fontFamily: FontFamily.mono, fontSize: 10, letterSpacing: 1.2, color: GOLD },
  cta: { borderRadius: 100, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 16, color: '#fff' },
});
