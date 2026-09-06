import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { supabase } from '../lib/supabase';
import { resolveHomeRoute } from '../lib/resolveHomeRoute';
import { Colors } from '../constants/Colors';

const COACH_SETUP_URL = 'https://v1portal.com/coach/setup';
const COOKIE_KEY = 'sb-swsjuxsbvfdejeuilhzk-auth-token';

// Same pattern as app/assessment.tsx: rather than reimplementing web's
// 4-step coach setup wizard (school search, division mapping, min_score
// derivation, the compliance disclosure modal) natively, embed the real
// web page and inject the mobile session into it. Guarantees the setup
// flow a coach completes on mobile is byte-for-byte the same one they'd
// get on web — no drift, no second copy of the business logic to maintain.
export default function CoachSetupScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const [injectedJs, setInjectedJs] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setInjectedJs(''); return; }

      const tokenData = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: Math.max(0, (session.expires_at ?? 0) - Math.floor(Date.now() / 1000)),
        token_type: 'bearer',
        user: session.user,
      });

      setInjectedJs(`
        (function() {
          try {
            var KEY = ${JSON.stringify(COOKIE_KEY)};
            var tokenData = ${JSON.stringify(tokenData)};
            var encoded = encodeURIComponent(tokenData);
            var maxAge = 3600;
            if (encoded.length <= 3600) {
              document.cookie = KEY + '=' + encoded + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
            } else {
              var size = 3600;
              for (var i = 0; i * size < encoded.length; i++) {
                document.cookie = KEY + '.' + i + '=' + encoded.slice(i * size, (i + 1) * size) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
              }
            }
            try { localStorage.setItem(KEY, tokenData); } catch(e) {}
          } catch(e) {}
        })();
        true;
      `);
    });
  }, []);

  const goHome = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    router.replace((session?.user?.id ? await resolveHomeRoute(session.user.id) : '/(tabs)') as any);
  };

  if (injectedJs === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Program Setup</Text>
        <View style={styles.backPlaceholder} />
      </View>

      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Ionicons name="phone-portrait-outline" size={52} color={Colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.webFallbackTitle}>Use the Mobile App</Text>
          <Text style={styles.webFallbackBody}>
            Coach setup must be completed in the V1Portal mobile app. Open it on your iOS or Android device to finish setting up your program.
          </Text>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          )}
          {error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Could not load setup.</Text>
              <Pressable onPress={() => { setError(false); setLoading(true); webRef.current?.reload(); }}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              ref={webRef}
              source={{ uri: COACH_SETUP_URL }}
              injectedJavaScriptBeforeContentLoaded={injectedJs}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
              onNavigationStateChange={(navState) => {
                // Setup submits and redirects to /coach -> /dashboard on
                // completion. Once we see that, drop back into the native
                // app — resolveHomeRoute will now find the real
                // coach_accounts row and land on the coach dashboard.
                if (navState.url.includes('/coach') || navState.url.includes('/dashboard')) {
                  goHome();
                }
              }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 80,
  },
  backText: {
    color: Colors.text,
    fontSize: 16,
  },
  backPlaceholder: {
    width: 80,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  retryText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 10,
  },
  webFallbackTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  webFallbackBody: {
    color: Colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
  },
});
