import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { GRADIENT } from '../../constants/Colors';

interface GradientCheckProps {
  size?: number;
  id?: string;
}

// Bold checkmark filled with the brand gradient -- no circle backing,
// replacing the old gradient-circle-plus-black-check "verified" badge.
export function GradientCheck({ size = 15, id = 'gradient-check' }: GradientCheckProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Defs>
        <SvgLinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          {GRADIENT.map((c, i) => (
            <Stop key={c} offset={`${(i / (GRADIENT.length - 1)) * 100}%`} stopColor={c} />
          ))}
        </SvgLinearGradient>
      </Defs>
      <Path d="M5 13l4 4L19 7" stroke={`url(#${id})`} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
