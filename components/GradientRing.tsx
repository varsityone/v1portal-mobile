import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface GradientRingProps {
  size: number;
  strokeWidth: number;
  /** 0-100. The completed arc, drawn in `colors`; the remainder is `trackColor`. */
  progress: number;
  colors: readonly string[];
  trackColor: string;
  children?: React.ReactNode;
}

// SVG has no direct equivalent of CSS conic-gradient, so this approximates
// web's sweep rings (the Gameplan tracker ring, Phase 1's score gauge, the
// Choose Your Level score badge) with a stroked circle colored by a linear
// gradient across the brand stops — reads as "the gradient ring" even though
// the transition follows the bounding box rather than the sweep angle, which
// is the standard technique for gradient progress rings in RN.
export default function GradientRing({ size, strokeWidth, progress, colors, trackColor, children }: GradientRingProps) {
  const gradId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));
  const dash = (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {colors.map((c, i) => (
              <Stop key={i} offset={`${(i / (colors.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </SvgLinearGradient>
        </Defs>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {clamped > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${dash}, ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />
        )}
      </Svg>
      {children != null && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      )}
    </View>
  );
}
