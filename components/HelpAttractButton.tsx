import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Matches web's components/DashboardShell.tsx .shell-help-btn exactly: rests
// at right:-34 (mostly off-screen, a sliver visible), slides to right:0 on
// web's :hover/:focus-visible, and — since touch has no hover — a periodic
// "attract" nudge is the only way a mobile user ever sees it slide fully
// into view. Every 3 minutes, animate out to right:0, hold 2.2s, animate
// back — same transition curve and rest/active positions as web's CSS.
const REST_RIGHT = -34;
const ACTIVE_RIGHT = 0;
const TRANSITION_MS = 220;
const ATTRACT_HOLD_MS = 2200;
const ATTRACT_INTERVAL_MS = 3 * 60 * 1000;

export default function HelpAttractButton({ onPress }: { onPress: () => void }) {
  const right = useRef(new Animated.Value(REST_RIGHT)).current;

  useEffect(() => {
    const easing = Easing.bezier(0.4, 0, 0.2, 1);
    const interval = setInterval(() => {
      Animated.timing(right, { toValue: ACTIVE_RIGHT, duration: TRANSITION_MS, easing, useNativeDriver: false }).start();
      setTimeout(() => {
        Animated.timing(right, { toValue: REST_RIGHT, duration: TRANSITION_MS, easing, useNativeDriver: false }).start();
      }, ATTRACT_HOLD_MS);
    }, ATTRACT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [right]);

  return (
    <Animated.View style={[s.btn, { right }]}>
      <Pressable onPress={onPress} style={s.pressable}>
        <LinearGradient
          colors={['#ff0000', '#ffbc00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.gradient}
        >
          <Ionicons name="help-circle-outline" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 110,
    width: 48,
    height: 48,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  pressable: { width: 48, height: 48 },
  gradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
});
