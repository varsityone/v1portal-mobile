import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// The app's single branded full-screen loading state — a beating logo mark
// over a gradient progress bar. Used anywhere the app would otherwise show
// a bare spinner with nothing else on screen (initial route resolution,
// auth-session gates), so a loading moment never looks like an unbranded
// generic spinner.
export default function LoadingScreen() {
  const beat = useRef(new Animated.Value(1)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Heartbeat: two quick thumps then a pause
    Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1.22, duration: 110, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: 110, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1.13, duration: 90, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1, duration: 90, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(800),
      ])
    ).start();

    // Progress bar: fast to 75%, then eases to 100%
    Animated.sequence([
      Animated.timing(barWidth, { toValue: 0.75, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(barWidth, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <Animated.Image
        source={require('../assets/varsityone-logo-mark-white.png')}
        style={[s.logo, { transform: [{ scale: beat }] }]}
        resizeMode="contain"
      />
      <View style={s.barWrap}>
        <Animated.View style={[s.bar, {
          width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }]}>
          <LinearGradient
            colors={['#833AB4', '#E1306C']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050507',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 80, height: 80 },
  barWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bar: { height: '100%' },
});
