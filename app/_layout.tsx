import 'react-native-url-polyfill/auto';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { handleNotificationResponse, getRouteFromNotification, NotificationScreen } from '../lib/notifications';
import { Colors } from '../constants/Colors';

// ─── Branded loading screen ───────────────────────────────────────────────────

function LoadingScreen() {
  const beat     = useRef(new Animated.Value(1)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Heartbeat: two quick thumps then a pause
    Animated.loop(
      Animated.sequence([
        Animated.timing(beat, { toValue: 1.22, duration: 110, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1,    duration: 110, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1.13, duration: 90,  easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(beat, { toValue: 1,    duration: 90,  easing: Easing.in(Easing.ease),  useNativeDriver: true }),
        Animated.delay(800),
      ])
    ).start();

    // Progress bar: fast to 75%, then eases to 100%
    Animated.sequence([
      Animated.timing(barWidth, { toValue: 0.75, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(barWidth, { toValue: 1,    duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <View style={ls.root}>
      <Animated.Image
        source={require('../assets/logo-mark.png')}
        style={[ls.logo, { transform: [{ scale: beat }] }]}
        resizeMode="contain"
      />
      <View style={ls.barWrap}>
        <Animated.View style={[ls.bar, {
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

const ls = StyleSheet.create({
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

// ─── In-app notification banner ───────────────────────────────────────────────

interface BannerData {
  title: string;
  body: string;
}

function NotificationBanner({
  banner,
  onDismiss,
}: {
  banner: BannerData | null;
  onDismiss: () => void;
}) {
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (banner) {
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 5,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: -120,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [banner]);

  // Always render so the slide-out animation can play
  return (
    <Animated.View
      pointerEvents={banner ? 'auto' : 'none'}
      style={[bn.root, { transform: [{ translateY: slideY }], opacity }]}
    >
      <View style={bn.content}>
        <View style={bn.iconBox}>
          <Ionicons name="notifications" size={15} color={Colors.white} />
        </View>
        <View style={bn.text}>
          <Text style={bn.title} numberOfLines={1}>{banner?.title ?? ''}</Text>
          {banner?.body ? (
            <Text style={bn.body} numberOfLines={2}>{banner.body}</Text>
          ) : null}
        </View>
        <Pressable style={bn.close} onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={15} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const bn = StyleSheet.create({
  root: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 16,
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: Colors.white, marginBottom: 1 },
  body: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },
  close: { padding: 4 },
});

// ─── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBanner = useCallback((title: string, body: string) => {
    setBanner({ title, body });
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setBanner(null), 5000);
  }, []);

  const dismissBanner = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setBanner(null);
  }, []);

  // ── Bootstrap: check auth + onboarding on first mount ─────────────────────
  useEffect(() => {
    async function bootstrap() {
      const start = Date.now();
      const { data: { session } } = await supabase.auth.getSession();
      const seen = await AsyncStorage.getItem('v1portal_onboarding_seen');

      // Always show loader at least 2s so the animation is visible
      const elapsed = Date.now() - start;
      if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));

      if (!session) {
        router.replace('/(auth)/login');
      } else if (!seen) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
      setAppReady(true);
    }
    bootstrap();
  }, []);

  useEffect(() => {
    // ── Deep link handler (auth callbacks) ──────────────────────────────────

    const handleDeepLink = async (url: string) => {
      const parsed = Linking.parse(url);
      const params = parsed.queryParams ?? {};

      const code = params.code as string | undefined;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) router.replace('/(tabs)');
        return;
      }

      const token_hash = params.token_hash as string | undefined;
      const type = params.type as string | undefined;
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'recovery' | 'magiclink' | 'email',
        });
        if (!error) {
          if (type === 'recovery') {
            router.push('/(auth)/reset-password');
          } else {
            router.replace('/(tabs)');
          }
        }
      }
    };

    Linking.getInitialURL().then(url => { if (url) handleDeepLink(url); });
    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    // ── Auth state ──────────────────────────────────────────────────────────

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/(auth)/login');
      }
      if (event === 'SIGNED_IN') {
        // Show loading screen during post-login transition
        setAppReady(false);
        const seen = await AsyncStorage.getItem('v1portal_onboarding_seen');
        await new Promise(r => setTimeout(r, 1500));
        if (!seen) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)');
        }
        setAppReady(true);
      }
    });

    // ── Notification listeners (native only — expo-notifications has no web support) ──

    let foregroundSub: Notifications.Subscription | undefined;
    let responseSub: Notifications.Subscription | undefined;

    if (Platform.OS !== 'web') {
      foregroundSub = Notifications.addNotificationReceivedListener(notification => {
        const title = notification.request.content.title ?? 'V1Portal';
        const body  = notification.request.content.body  ?? '';
        showBanner(title, body);
      });

      responseSub = Notifications.addNotificationResponseReceivedListener(response => {
        handleNotificationResponse(response, (route: NotificationScreen) => {
          router.push(route);
        });
      });

      Notifications.getLastNotificationResponseAsync().then(response => {
        if (response) {
          handleNotificationResponse(response, (route: NotificationScreen) => {
            router.push(route);
          });
        }
      });
    }

    return () => {
      linkSub.remove();
      authSub.unsubscribe();
      foregroundSub?.remove();
      responseSub?.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!appReady) return <LoadingScreen />;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      </Stack>
      <NotificationBanner banner={banner} onDismiss={dismissBanner} />
    </View>
  );
}
