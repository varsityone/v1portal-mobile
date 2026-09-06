import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../context/ThemeContext';
import { FontFamily } from '../constants/Fonts';
import { ThemeColors } from '../constants/Colors';

interface ScoreAnimatorProps {
  finalScore: number;
  duration?: number;
  recruitingLevel?: string;
}

export default function ScoreAnimator({ finalScore, duration = 2000, recruitingLevel = '' }: ScoreAnimatorProps) {
  const C = useColors();
  const animValue = useRef(new Animated.Value(0)).current;
  const displayScore = useRef(0);
  const s = StyleSheet.create(createStyles(C));

  useEffect(() => {
    displayScore.current = 0;
    animValue.setValue(0);

    const listener = animValue.addListener(({ value }) => {
      displayScore.current = Math.round(value);
    });

    Animated.timing(animValue, {
      toValue: finalScore,
      duration,
      useNativeDriver: false,
    }).start();

    return () => animValue.removeListener(listener);
  }, [finalScore, duration, animValue]);

  return (
    <View style={s.container}>
      <Text style={s.eyebrow}>V1 SCORE</Text>
      <AnimatedText
        value={animValue}
        style={s.scoreValue}
      />
      {recruitingLevel && (
        <Text style={s.levelText}>{recruitingLevel}</Text>
      )}
    </View>
  );
}

function AnimatedText({ value, style }: { value: Animated.Value; style: any }) {
  return (
    <Animated.Text
      style={[
        style,
        {
          transform: [
            {
              scale: value.interpolate({
                inputRange: [0, 100],
                outputRange: [0.8, 1],
              }),
            },
          ],
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

function createStyles(C: ThemeColors) {
  return {
    container: {
      alignItems: 'center',
      paddingVertical: 24,
      backgroundColor: C.surface,
      borderRadius: 16,
      marginBottom: 16,
    },
    eyebrow: {
      fontFamily: FontFamily.mono,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: C.textDim,
      marginBottom: 8,
    },
    scoreValue: {
      fontFamily: FontFamily.headline,
      fontSize: 80,
      fontWeight: '900',
      color: C.primary,
      lineHeight: 80,
      letterSpacing: -2,
      marginBottom: 8,
    },
    levelText: {
      fontFamily: FontFamily.body,
      fontSize: 13,
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginTop: 4,
    },
  };
}
