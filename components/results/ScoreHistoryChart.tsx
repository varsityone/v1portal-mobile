import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Line, Circle } from 'react-native-svg';
import { smoothPath } from '../../lib/chartUtils';
import { useColors } from '../../context/ThemeContext';
import { FontFamily } from '../../constants/Fonts';

export interface ScoreHistoryPoint {
  date: string;
  score: number;
}

interface ScoreHistoryChartProps {
  data: ScoreHistoryPoint[];
}

const W = 800;
const H = 160;
const PX = 4;
const PY = 12;

export default function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
  const C = useColors();
  const [tip, setTip] = useState<{ i: number; x: number; y: number; date: string; score: number } | null>(null);

  const pts = data.map((d, i) => ({
    x: PX + (i / (data.length - 1)) * (W - PX * 2),
    y: PY + (1 - Math.max(0, Math.min(100, d.score)) / 100) * (H - PY * 2),
    date: d.date,
    score: d.score,
  }));

  const line = smoothPath(pts);
  const area = `${line} L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;

  return (
    <View style={{ marginVertical: 4 }}>
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={160}>
        <Defs>
          <LinearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffd000" stopOpacity={0.35} />
            <Stop offset="100%" stopColor="#ffd000" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="scoreLineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="red" />
            <Stop offset="100%" stopColor="#ffd000" />
          </LinearGradient>
        </Defs>

        {[0.25, 0.5, 0.75].map(t => (
          <Line
            key={t}
            x1={PX} y1={PY + t * (H - PY * 2)}
            x2={W - PX} y2={PY + t * (H - PY * 2)}
            stroke={C.border} strokeWidth={1}
          />
        ))}

        {tip && (
          <Line x1={tip.x} y1={PY} x2={tip.x} y2={H - PY} stroke={C.border2} strokeWidth={1.5} strokeDasharray="4 3" />
        )}

        <Path d={area} fill="url(#scoreAreaGrad)" />
        <Path d={line} fill="none" stroke="url(#scoreLineGrad)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 3} fill={i === pts.length - 1 ? '#ffd000' : 'red'} />
        ))}

        {pts.map((p, i) => (
          <Circle
            key={`hit-${i}`}
            cx={p.x} cy={p.y} r={14}
            fill="transparent"
            onPress={() => setTip(tip?.i === i ? null : { i, x: p.x, y: p.y, date: p.date, score: p.score })}
          />
        ))}
      </Svg>

      {tip && (
        <View
          style={[
            s.tooltip,
            { backgroundColor: C.surfaceAlt, borderColor: C.border2, left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` },
          ]}
          pointerEvents="none"
        >
          <Text style={[s.tooltipScore, { color: C.text }]}>{tip.score}</Text>
          <Text style={[s.tooltipDate, { color: C.textDim }]}>{tip.date}</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    transform: [{ translateX: -30 }, { translateY: -50 }],
  },
  tooltipScore: { fontFamily: FontFamily.statNumber, fontSize: 14 },
  tooltipDate: { fontFamily: FontFamily.body, fontSize: 10, marginTop: 1 },
});
