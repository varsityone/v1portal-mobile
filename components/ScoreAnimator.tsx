import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../constants/Fonts';
import { getRecruitingLevelBand } from '../lib/recruitingLevels';

interface ScoreAnimatorProps {
  finalScore: number;
  duration?: number;
  recruitingLevel?: string;
}

const TIERS = ['Dev', 'Emrg', 'Comp', 'Cont', 'Elite'];

// Canonical bands (lib/recruitingLevels.ts) collapsed from 6 into this
// 5-segment strip — matches web's components/ScoreAnimator.tsx exactly.
const TIER_THRESHOLDS = [45, 55, 65, 75, 85];

function getActiveTierIndex(score: number): number {
  let idx = 0;
  for (let i = 0; i < TIER_THRESHOLDS.length; i++) {
    if (score >= TIER_THRESHOLDS[i]) idx = i;
  }
  return idx;
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
}

function scoreColor(val: number, max: number): string {
  const t = Math.min(val / max, 1);
  const stops: [number, [number, number, number]][] = [
    [0, [0, 106, 255]],
    [0.5, [0, 180, 255]],
    [1.0, [0, 255, 30]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [s0, c0] = stops[i];
    const [s1, c1] = stops[i + 1];
    if (t <= s1) return lerpColor(c0, c1, (t - s0) / (s1 - s0));
  }
  return '#006aff';
}

export default function ScoreAnimator({ finalScore, duration = 2000, recruitingLevel }: ScoreAnimatorProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuad = 1 - Math.pow(1 - progress, 2);
      setDisplayScore(Math.round(finalScore * easeOutQuad));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayScore(finalScore);
        setIsAnimating(false);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [finalScore, duration]);

  const activeTierIndex = getActiveTierIndex(displayScore);
  const numColor = isAnimating ? scoreColor(displayScore, 99.9) : '#ffffff';

  return (
    <LinearGradient
      colors={['red', '#ffd000']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.container}
    >
      <Text style={s.eyebrow}>V1 SCORE</Text>

      <View style={s.middle}>
        <Text style={[s.scoreValue, { color: numColor }]}>{displayScore}</Text>
        <Text style={[s.levelText, { opacity: isAnimating ? 0.5 : 1 }]}>
          {recruitingLevel || getRecruitingLevelBand(displayScore).level}
        </Text>
      </View>

      <View style={s.tierRow}>
        {TIERS.map((t, i) => (
          <View key={t} style={s.tierCol}>
            <View style={[s.tierBar, { backgroundColor: i <= activeTierIndex ? '#ffffff' : 'rgba(255,255,255,0.1)' }]} />
            <Text style={[s.tierLabel, { color: i === activeTierIndex ? '#ffffff' : 'rgba(255,255,255,0.28)' }, i === activeTierIndex && s.tierLabelActive]}>
              {t}
            </Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 10,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  middle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  scoreValue: {
    fontFamily: FontFamily.statNumber,
    fontSize: 88,
    lineHeight: 88,
    letterSpacing: -5,
  },
  levelText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 13,
    color: '#ffffff',
    marginTop: 14,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tierRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 22,
    alignSelf: 'stretch',
  },
  tierCol: { flex: 1, alignItems: 'center' },
  tierBar: {
    height: 3,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginBottom: 5,
  },
  tierLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    letterSpacing: 0.3,
  },
  tierLabelActive: {
    fontFamily: FontFamily.bodyExtraBold,
  },
});
