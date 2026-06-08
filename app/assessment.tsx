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
import { Colors } from '../constants/Colors';

const ASSESSMENT_URL = 'https://v1portal.com/assessment';
const STORAGE_KEY = 'sb-swsjuxsbvfdejeuilhzk-auth-token';

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
        token_type: 'bearer',
        user: session.user,
      });

      // Inject into localStorage before the page hydrates so Supabase client picks it up
      setInjectedJs(`
        (function() {
          try {
            localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(tokenData)});
          } catch(e) {}
        })();
        true;
      `);
    });
  }, []);

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
        <Text style={styles.title}>V1 Assessment</Text>
        <View style={styles.backPlaceholder} />
      </View>

      {Platform.OS === 'web' ? (
        // On web preview just render an iframe — WebView isn't available
        <iframe
          src={ASSESSMENT_URL}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
          title="V1 Assessment"
        />
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={Colors.primary} size="large" />
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
    ...StyleSheet.absoluteFillObject,
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
});
