import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: W, height: H } = Dimensions.get('window');

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    icon: 'trophy'        as const,
    grad: ['#833AB4', '#5B2D8E'] as [string, string],
    glow: '#833AB4',
    phase: null,
    title: 'Your Official\nRecruiting Edge',
    body: 'The only platform built specifically for serious college football prospects to get discovered by the right coaches at the right programs.',
  },
  {
    id: '2',
    icon: 'analytics'     as const,
    grad: ['#6020ff', '#3ab7ed'] as [string, string],
    glow: '#3ab7ed',
    phase: 'Phase 1',
    title: 'Your V1 Score',
    body: 'Complete the V1OS assessment and receive a data-driven score that realistically ranks your college football recruiting level.',
  },
  {
    id: '3',
    icon: 'school'        as const,
    grad: ['#10b981', '#059669'] as [string, string],
    glow: '#10b981',
    phase: 'Phase 3',
    title: 'Program\nTargeting',
    body: '279 programs ranked and matched to your exact level — FBS, FCS, D2, D3, NAIA, and JUCO — so you stop guessing and start targeting.',
  },
  {
    id: '4',
    icon: 'mail'          as const,
    grad: ['#833AB4', '#E1306C'] as [string, string],
    glow: '#E1306C',
    phase: 'Phase 4',
    title: 'Coach\nOutreach',
    body: 'AI-powered email templates personalized to each coach and program. Track opens, replies, and every relationship in one place.',
  },
  {
    id: '5',
    icon: 'people'        as const,
    grad: ['#f1a10d', '#E1306C'] as [string, string],
    glow: '#f1a10d',
    phase: 'Phase 6',
    title: 'Coach\nTracker',
    body: 'Log every coach interaction — status, priority, next action, and notes — so no opportunity slips through the cracks.',
  },
];

type Slide = typeof SLIDES[0];

// ── Slide component ───────────────────────────────────────────────────────────

function SlideItem({ item }: { item: Slide }) {
  return (
    <View style={[sl.slide, { width: W }]}>
      {/* Icon card */}
      <View style={sl.iconWrap}>
        {/* Glow behind card */}
        <View style={[sl.glow, { shadowColor: item.glow }]} />
        <LinearGradient
          colors={item.grad}
          style={sl.iconCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={item.icon} size={64} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </View>

      {/* Text */}
      <View style={sl.textBlock}>
        {item.phase && (
          <View style={[sl.phasePill, { backgroundColor: item.grad[0] + '28' }]}>
            <Text style={[sl.phaseText, { color: item.grad[0] }]}>{item.phase}</Text>
          </View>
        )}
        {!item.phase && (
          <View style={sl.brandRow}>
            <Text style={sl.brandText}>V1PORTAL</Text>
          </View>
        )}
        <Text style={sl.title}>{item.title}</Text>
        <Text style={sl.body}>{item.body}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router  = useRouter();
  const flatRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const finish = async () => {
    await AsyncStorage.setItem('v1portal_onboarding_seen', '1');
    router.replace('/(tabs)');
  };

  const goNext = () => {
    if (isLast) { finish(); return; }
    const next = index + 1;
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  const currentSlide = SLIDES[index];

  return (
    <View style={sl.root}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        onMomentumScrollEnd={e => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        renderItem={({ item }) => <SlideItem item={item} />}
        style={sl.list}
      />

      {/* Dot indicators */}
      <View style={sl.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              sl.dot,
              i === index
                ? [sl.dotActive, { backgroundColor: currentSlide.grad[0] }]
                : sl.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={sl.btnRow}>
        {!isLast ? (
          <Pressable style={sl.skipBtn} onPress={finish}>
            <Text style={sl.skipTxt}>Skip</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}

        <Pressable onPress={goNext} style={sl.nextPressable}>
          <LinearGradient
            colors={currentSlide.grad}
            style={sl.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={sl.nextTxt}>{isLast ? 'Get Started' : 'Next'}</Text>
            <Ionicons name={isLast ? 'rocket' : 'arrow-forward'} size={16} color="#fff" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sl = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    flex: 1,
  },

  // Slide
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 36,
    paddingBottom: 20,
  },

  // Icon
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 48,
    elevation: 0,
  },
  iconCard: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },

  // Text
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  phasePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  phaseText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandRow: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    color: Colors.primary,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Dots
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 24,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.border,
  },

  // Buttons
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  skipBtn: {
    width: 60,
    paddingVertical: 12,
  },
  skipTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDim,
  },
  nextPressable: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 100,
  },
  nextTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});
