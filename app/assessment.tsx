import { useEffect, useRef, useState } from 'react';
import {
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
import { Colors } from '../constants/Colors';
import LoadingScreen from '../components/LoadingScreen';

const ASSESSMENT_URL = 'https://v1portal.com/assessment';
const COOKIE_KEY = 'sb-swsjuxsbvfdejeuilhzk-auth-token';

export default function AssessmentScreen() {
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

      // The web app uses @supabase/ssr createBrowserClient which stores sessions
      // in cookies (URL-encoded JSON), not localStorage. Inject both for compatibility.
      //
      // Chunking must split the RAW string first and URL-encode each piece
      // independently — never slice an already-encodeURIComponent'd string at a
      // fixed offset. That can (and reliably does, for a session this size) land
      // mid-%XX escape sequence; @supabase/ssr's cookie reader silently falls
      // back to the raw undecoded chunk when decodeURIComponent throws on it,
      // which corrupts the rejoined session JSON and made every read of this
      // cookie look like "no session" to the web app.
      setInjectedJs(`
        (function() {
          try {
            var KEY = ${JSON.stringify(COOKIE_KEY)};
            var tokenData = ${JSON.stringify(tokenData)};
            var maxAge = 3600;
            var rawChunkSize = 2500;
            if (tokenData.length <= rawChunkSize) {
              document.cookie = KEY + '=' + encodeURIComponent(tokenData) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
            } else {
              for (var i = 0; i * rawChunkSize < tokenData.length; i++) {
                var piece = tokenData.slice(i * rawChunkSize, (i + 1) * rawChunkSize);
                document.cookie = KEY + '.' + i + '=' + encodeURIComponent(piece) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
              }
            }
            // localStorage fallback
            try { localStorage.setItem(KEY, tokenData); } catch(e) {}
          } catch(e) {}
        })();
        true;
      `);
    });
  }, []);

  if (injectedJs === null) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        // Web preview can't inject auth into a cross-origin iframe.
        // The assessment must be completed in the native mobile app.
        <View style={styles.webFallback}>
          <Ionicons name="phone-portrait-outline" size={52} color={Colors.primary} style={{ marginBottom: 16 }} />
          <Text style={styles.webFallbackTitle}>Use the Mobile App</Text>
          <Text style={styles.webFallbackBody}>
            The V1 Assessment must be completed in the V1Portal mobile app. Open it on your iOS or Android device to take your assessment.
          </Text>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <LoadingScreen />
            </View>
          )}
          {error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Could not load the assessment.</Text>
              <Pressable onPress={() => { setError(false); setLoading(true); webRef.current?.reload(); }}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </Pressable>
            </View>
          ) : (
            <WebView
              ref={webRef}
              source={{ uri: ASSESSMENT_URL }}
              injectedJavaScriptBeforeContentLoaded={injectedJs}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
              onNavigationStateChange={(navState) => {
                const url = navState.url;
                // Assessment is done — bring user back into the native app
                if (
                  url.includes('/assessment-complete') ||
                  url.includes('/funnel/recruiting') ||
                  url.includes('/dashboard')
                ) {
                  // Only a real submission gets the score reveal; Save & Exit
                  // also lands on /dashboard, including mid-retake when an
                  // older score already exists.
                  const submitted = !url.includes('/dashboard');
                  void (async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) { router.replace('/(auth)/login'); return; }
                    const { data, error } = await supabase.from('athletes').select('v1_score').or(`user_id.eq.${session.user.id},linked_user_id.eq.${session.user.id}`).maybeSingle();
                    router.replace(!error && data?.v1_score != null ? (submitted ? '/score-reveal' : '/(tabs)') : '/assessment-paused');
                  })();
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
    zIndex: 10,
    backgroundColor: '#000000',
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
