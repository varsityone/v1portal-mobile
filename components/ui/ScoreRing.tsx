import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { FontFamily } from '../../constants/Fonts';
import { ThemeColors } from '../../constants/Colors';
import { useColors } from '../../context/ThemeContext';

interface ScoreRingProps {
  score: number | null;
  size?: number;
}

// Matches web's conic-gradient V1 score ring (app/coach/search/page.tsx) as
// closely as SVG allows -- a progress arc swept from the top, colored by the
// same purple -> pink -> orange sweep, proportional to score/100.
export function ScoreRing({ score, size = 54 }: ScoreRingProps) {
  const C = useColors();
  const s = styles(C);
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(score ?? 0, 0), 100) / 100;
  const dashoffset = circumference * (1 - pct);

  if (score == null) {
    return (
      <View style={[s.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={s.dash}>—</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgLinearGradient id="scoreRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#82008F" />
            <Stop offset="50%" stopColor="#EA0C5F" />
            <Stop offset="100%" stopColor="#FF8820" />
          </SvgLinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#scoreRingGrad)" strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[s.num, { fontSize: size >= 50 ? 16 : 14 }]}>{score}</Text>
        <Text style={s.label}>V1 SCORE</Text>
      </View>
    </View>
  );
}

function styles(C: ThemeColors) {
  return StyleSheet.create({
    num: { fontFamily: FontFamily.headlineBold, color: C.text, lineHeight: undefined },
    label: { fontFamily: FontFamily.bodyBold, fontSize: 6.5, color: C.textDim, letterSpacing: 0.3, marginTop: 1 },
    fallback: { backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    dash: { fontFamily: FontFamily.headlineBold, fontSize: 16, color: C.textDim },
  });
}
