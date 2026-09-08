import 'react-native-url-polyfill/auto';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  BigShouldersDisplay_700Bold,
  BigShouldersDisplay_800ExtraBold,
  BigShouldersDisplay_900Black,
} from '@expo-google-fonts/big-shoulders-display';
import {
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import {
  JetBrainsMono_600SemiBold,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { DMSans_900Black } from '@expo-google-fonts/dm-sans';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { supabase } from '../lib/supabase';
import { configurePurchases } from '../lib/purchases';
import { resolveHomeRoute } from '../lib/resolveHomeRoute';
import { handleNotificationResponse, getRouteFromNotification, NotificationScreen } from '../lib/notifications';
import { Colors } from '../constants/Colors';
import { ThemeProvider } from '../context/ThemeContext';
import LoadingScreen from '../components/LoadingScreen';

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

  const [fontsLoaded] = useFonts({
    BigShouldersDisplay_700Bold,
    BigShouldersDisplay_800ExtraBold,
    BigShouldersDisplay_900Black,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
    DMSans_900Black,
    SpaceGrotesk_700Bold,
  });

  const showBanner = useCallback((title: string, body: string) => {
    setBanner({ title, body });
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setBanner(null), 5000);
  }, []);

  const dismissBanner = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setBanner(null);
  }, []);

  // ── Bootstrap: check auth on first mount ──────────────────────────────────
  const bootstrapped = useRef(false);
  useEffect(() => {
    // Guard against React 18 Strict Mode's dev-only double-invoke of effects —
    // two concurrent getSession() calls on the same GoTrueClient at cold boot
    // can deadlock its internal storage lock.
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    async function bootstrap() {
      const start = Date.now();
      const { data: { session } } = await supabase.auth.getSession();
      const seen = await AsyncStorage.getItem('v1portal_onboarding_seen');
      if (session?.user?.id) configurePurchases(session.user.id);

      // Always show loader at least 2s so the animation is visible
      const elapsed = Date.now() - start;
      if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));

      if (!session) {
        router.replace('/(auth)/login');
      } else if (!seen) {
        router.replace('/onboarding');
      } else {
        router.replace(await resolveHomeRoute(session.user.id) as any);
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
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.user?.id) router.replace(await resolveHomeRoute(data.user.id) as any);
        return;
      }

      const token_hash = params.token_hash as string | undefined;
      const type = params.type as string | undefined;
      if (token_hash && type) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as 'recovery' | 'magiclink' | 'email',
        });
        if (!error) {
          if (type === 'recovery') {
            router.push('/(auth)/reset-password');
          } else if (data.user?.id) {
            router.replace(await resolveHomeRoute(data.user.id) as any);
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
        setAppReady(false);
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.user?.id) configurePurchases(s.user.id);
        const seen = await AsyncStorage.getItem('v1portal_onboarding_seen');
        await new Promise(r => setTimeout(r, 1500));
        if (!seen) {
          router.replace('/onboarding');
        } else {
          const dest = s?.user?.id ? await resolveHomeRoute(s.user.id) : '/(tabs)';
          router.replace(dest as any);
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

  if (!appReady || !fontsLoaded) return <LoadingScreen />;

  return (
    <ThemeProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack>
        <NotificationBanner banner={banner} onDismiss={dismissBanner} />
      </View>
    </ThemeProvider>
  );
}
