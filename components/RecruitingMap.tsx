import { View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Path, Circle, G } from 'react-native-svg';
import { US_STATE_PATHS, DC_DOT, US_MAP_VIEWBOX } from '../lib/usStatePaths';
import { GRADIENT } from '../constants/Colors';

const GRADIENT_ID = 'recruiting-map-targeted-fill';

interface RecruitingMapProps {
  targetedStates: Set<string>;
  onToggleState: (state: string) => void;
}

// Ported from web's components/RecruitingMap.tsx -- same real state-boundary
// path data (lib/usStatePaths.ts), same brand-gradient fill for targeted
// states. Hover labels and prospect dots (which needed the browser's
// getBBox(), unavailable in react-native-svg) are dropped; tap-to-target is
// the core feature this screen was missing on mobile.
export default function RecruitingMap({ targetedStates, onToggleState }: RecruitingMapProps) {
  return (
    <View style={{ backgroundColor: '#232529', borderRadius: 16, overflow: 'hidden', padding: 12 }}>
      <Svg width="100%" height={220} viewBox={US_MAP_VIEWBOX}>
        <Defs>
          <SvgLinearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="100%">
            {GRADIENT.map((c, i) => (
              <Stop key={c} offset={`${(i / (GRADIENT.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </SvgLinearGradient>
        </Defs>
        <G>
          {Object.entries(US_STATE_PATHS).map(([abbr, shape]) => {
            const isTargeted = targetedStates.has(abbr);
            return (
              <Path
                key={abbr}
                d={shape.d}
                onPress={() => onToggleState(abbr)}
                fill={isTargeted ? `url(#${GRADIENT_ID})` : 'rgba(255,255,255,0.12)'}
                stroke={isTargeted ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.16)'}
                strokeWidth={isTargeted ? 1.2 : 0.6}
              />
            );
          })}
          <Circle
            cx={DC_DOT.cx}
            cy={DC_DOT.cy}
            r={DC_DOT.r}
            onPress={() => onToggleState('DC')}
            fill={targetedStates.has('DC') ? `url(#${GRADIENT_ID})` : 'rgba(255,255,255,0.12)'}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={1}
          />
        </G>
      </Svg>
    </View>
  );
}
