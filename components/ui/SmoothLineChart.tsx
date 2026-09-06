import { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { ThemeColors } from '../../constants/Colors';

export interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

interface SmoothLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  showDots?: boolean;
  showGrid?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  theme: ThemeColors;
}

export function SmoothLineChart({
  data,
  color = '#8B5CF6',
  height = 240,
  showDots = true,
  showGrid = true,
  xAxisLabel = '',
  yAxisLabel = '',
  theme,
}: SmoothLineChartProps) {
  const width = Dimensions.get('window').width - 40;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const s = useMemo(() => StyleSheet.create({
    container: { width, height, backgroundColor: theme.surface, borderRadius: 12, padding: 16 },
    svgContainer: { alignItems: 'center', justifyContent: 'center' },
  }), [width, height, theme]);

  if (!data || data.length === 0) {
    return <View style={s.container}><Text style={{ color: theme.textMuted }}>No data</Text></View>;
  }

  // Calculate Y-axis range
  const yValues = data.map(d => d.y);
  const minY = Math.min(...yValues, 0);
  const maxY = Math.max(...yValues, 100);
  const yRange = maxY - minY || 1;

  // Create smooth path using Catmull-Rom spline
  const points = data.map((d, i) => ({
    x: (i / Math.max(data.length - 1, 1)) * graphWidth + padding,
    y: height - padding - ((d.y - minY) / yRange) * graphHeight,
  }));

  // Generate SVG path with Catmull-Rom smoothing
  const generateSmoothPath = () => {
    if (points.length < 2) return '';

    let path = `M${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];

      // Control points for Catmull-Rom
      const p0 = i > 0 ? points[i - 1] : curr;
      const p3 = i < points.length - 2 ? points[i + 2] : next;

      const cp1x = curr.x + (next.x - p0.x) / 6;
      const cp1y = curr.y + (next.y - p0.y) / 6;
      const cp2x = next.x - (p3.x - curr.x) / 6;
      const cp2y = next.y - (p3.y - curr.y) / 6;

      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }

    return path;
  };

  return (
    <View style={s.container}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {showGrid && (
          <>
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
              <Line
                key={`grid-${i}`}
                x1={padding}
                y1={padding + pct * graphHeight}
                x2={padding + graphWidth}
                y2={padding + pct * graphHeight}
                stroke={theme.border}
                strokeWidth="0.5"
              />
            ))}
          </>
        )}

        {/* Y-axis label */}
        {yAxisLabel && (
          <SvgText x={12} y={padding + graphHeight / 2} fill={theme.textMuted} fontSize="11" textAnchor="middle">
            {yAxisLabel}
          </SvgText>
        )}

        {/* Line path */}
        <Path d={generateSmoothPath()} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* Gradient under curve (optional enhancement) */}
        <Path
          d={generateSmoothPath() + ` L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`}
          fill={color}
          opacity="0.1"
        />

        {/* Data point dots */}
        {showDots &&
          points.map((pt, i) => (
            <Circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r="3" fill={color} />
          ))}

        {/* X-axis */}
        <Line x1={padding} y1={height - padding} x2={padding + graphWidth} y2={height - padding} stroke={theme.border} strokeWidth="1" />

        {/* Y-axis */}
        <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={theme.border} strokeWidth="1" />

        {/* X-axis label */}
        {xAxisLabel && (
          <SvgText x={padding + graphWidth / 2} y={height - 8} fill={theme.textMuted} fontSize="11" textAnchor="middle">
            {xAxisLabel}
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
