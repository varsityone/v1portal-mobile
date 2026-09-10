import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="document-text" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Last updated June 2026</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.body}>
          By using V1Portal you agree to these Terms. V1Portal is a mutual-matching
          platform connecting high school football athletes with college coaches — a
          guidance and connection tool, not a guarantee of any recruiting outcome,
          offer, or scholarship.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Subscriptions</Text>
        <Text style={styles.body}>
          Match+ auto-renews monthly until canceled. If you subscribed through this
          app, your payment is charged to your Apple ID and renews unless canceled at
          least 24 hours before the end of the current period — manage or cancel
          anytime in your device's Settings → [your name] → Subscriptions. If you
          subscribed on the web, manage your subscription from Settings → Manage
          Subscription.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Account Deletion</Text>
        <Text style={styles.body}>
          You can permanently delete your account and personal data anytime from
          Settings → Delete Account, right in the app. No need to contact support.
        </Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Full Terms</Text>
        <Text style={styles.body}>
          For the complete Terms of Service — including NCAA compliance, prohibited
          uses, liability, and governing law — see the full document:
        </Text>

        <Pressable
          style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
          onPress={() => Linking.openURL('https://v1portal.com/terms')}
        >
          <Ionicons name="open-outline" size={16} color={Colors.primary} />
          <Text style={styles.linkText}>v1portal.com/terms</Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [styles.contactBtn, pressed && { opacity: 0.8 }]}
        onPress={() => Linking.openURL('mailto:support@v1portal.com')}
      >
        <Text style={styles.contactText}>Questions? support@v1portal.com</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.background },
  container: { paddingHorizontal: 20, paddingBottom: 48 },

  topBar: {
    paddingTop: 56,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: { alignItems: 'center', gap: 8, paddingVertical: 20, marginBottom: 8 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: `${Colors.primary}18`,
    borderWidth: 1,
    borderColor: `${Colors.primary}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, letterSpacing: 0.3, textTransform: 'uppercase' },
  body: { fontSize: 14, color: Colors.textMuted, lineHeight: 22 },
  divider: { height: 1, backgroundColor: Colors.border },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  linkText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },

  contactBtn: { alignSelf: 'center', paddingVertical: 8 },
  contactText: { fontSize: 13, color: Colors.textMuted, textDecorationLine: 'underline' },
});
