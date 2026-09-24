import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAthleteData } from '../hooks/useAthleteData';
import ScoreAnimator from '../components/ScoreAnimator';
import LoadingScreen from '../components/LoadingScreen';
import { getRecruitingLevelBand } from '../lib/recruitingLevels';
import { FontFamily } from '../constants/Fonts';
import { GRADIENT } from '../constants/Colors';

// The app's primary CTA gradient (Sign In, Start Assessment).
const CTA_GRADIENT = ['#ff0000', '#aa00ff'] as const;
const SCORE_DURATION = 2200;
const CONFETTI_COUNT = 36;

// Shown once, right after the embedded assessment submits, so the athlete
// gets a moment with their V1 Score and level before the dashboard.
export default function ScoreRevealScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { athlete, assessment, loading } = useAthleteData();

  const reveal = useRef(new Animated.Value(0)).current;

  const score = assessment?.v1_score ?? athlete?.v1_score;
  const hasScore = score != null;

  useEffect(() => {
    if (loading) return;
    if (!hasScore) { router.replace('/(tabs)'); return; }
    Animated.timing(reveal, { toValue: 1, duration: 500, delay: SCORE_DURATION, useNativeDriver: true }).start();
  }, [loading, hasScore]);

  if (loading || !hasScore) return <LoadingScreen />;

  const rounded = Math.round(score);
  const band = getRecruitingLevelBand(rounded);
  const rawLevel = assessment?.recruiting_level as unknown;
  const level =
    typeof rawLevel === 'string' ? rawLevel
    : (rawLevel as { level?: string } | null)?.level ?? athlete?.recruiting_level ?? band.level;
  const firstName = athlete?.full_name?.trim().split(/\s+/)[0];

  const revealStyle = {
    opacity: reveal,
    transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.eyebrow}>ASSESSMENT COMPLETE</Text>
        <Text style={s.headline}>{firstName ? `Your V1 Score is in, ${firstName}.` : 'Your V1 Score is in.'}</Text>

        <ScoreAnimator finalScore={rounded} duration={SCORE_DURATION} recruitingLevel={level} />

        <Animated.View style={revealStyle}>
          <View style={s.card}>
            <Text style={s.cardLabel}>WHAT THIS MEANS</Text>
            <Text style={s.cardBody}>{band.description}</Text>
            <Text style={[s.cardLabel, { marginTop: 18 }]}>REALISTIC TARGETS</Text>
            <View style={s.pills}>
              {band.targets.map(t => (
                <View key={t} style={s.pill}><Text style={s.pillText}>{t}</Text></View>
              ))}
            </View>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')}>
            <LinearGradient colors={CTA_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.cta}>
              <Text style={s.ctaText}>Continue to Dashboard</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <Confetti />
    </View>
  );
}

// One burst from the top of the screen, in the brand gradient's colors. Uses
// the built-in Animated API on the native driver, so no extra dependency.
function Confetti() {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    color: GRADIENT[i % GRADIENT.length],
    startX: width / 2 + (Math.random() - 0.5) * 60,
    driftX: (Math.random() - 0.5) * width * 1.1,
    fallY: height * (0.55 + Math.random() * 0.45),
    spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 540),
    size: 6 + Math.random() * 6,
    delay: Math.random() * 250,
    round: i % 3 === 0,
    progress: new Animated.Value(0),
  })), [width, height]);

  useEffect(() => {
    Animated.parallel(pieces.map(p => Animated.timing(p.progress, {
      toValue: 1, duration: 2600, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }))).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', top: -20, left: p.startX,
            width: p.size, height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? p.size / 2 : 2, backgroundColor: p.color,
            opacity: p.progress.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.driftX] }) },
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.fallY] }) },
              { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#17191c' },
  content: { paddingHorizontal: 20 },
  eyebrow: { fontFamily: FontFamily.eyebrow, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  headline: { fontFamily: FontFamily.headline, fontSize: 38, lineHeight: 40, color: '#fff', marginBottom: 20 },
  card: {
    backgroundColor: '#1d1f23', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    padding: 20, marginBottom: 20,
  },
  cardLabel: { fontFamily: FontFamily.mono, fontSize: 10, letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', marginBottom: 8 },
  cardBody: { fontFamily: FontFamily.body, fontSize: 15, lineHeight: 22, color: '#fff' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', paddingVertical: 6, paddingHorizontal: 12 },
  pillText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: '#fff' },
  cta: { borderRadius: 100, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 16, color: '#fff' },
});
