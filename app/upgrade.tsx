import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = '#F59E0B';

type PlanKey = 'free' | 'pro' | 'elite';

interface Tier {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  badge?: string;
  accentColor: string;
  features: string[];
  checkoutUrl?: string;
}

const TIERS: Tier[] = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    accentColor: Colors.textMuted,
    features: [
      'V1 Score assessment',
      'Phase 1: Know Reality',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$97',
    period: '/month',
    accentColor: Colors.primary,
    features: [
      'Everything in Free',
      'Phases 1 – 4 unlocked',
      '20 program matches',
      'Outreach pipeline',
      'Profile completion tools',
    ],
    checkoutUrl: 'https://v1portal.com/pricing',
  },
  {
    key: 'elite',
    name: 'Elite',
    price: '$297',
    period: '/month',
    badge: 'Most Popular',
    accentColor: GOLD,
    features: [
      'Everything in Pro',
      'All 6 phases unlocked',
      'Unlimited program matches',
      'Elite pipeline & momentum board',
      'Task manager & recruiting tracker',
      'Priority support',
    ],
    checkoutUrl: 'https://v1portal.com/pricing',
  },
];

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View style={[toast.root, { opacity }]} pointerEvents="none">
      <Text style={toast.text}>{message}</Text>
    </Animated.View>
  );
}

const toast = StyleSheet.create({
  root: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    alignSelf: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 320,
  },
  text: {
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 19,
  },
});

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  isActive,
  isSelected,
  onSelect,
}: {
  tier: Tier;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isElite = tier.key === 'elite';

  return (
    <Pressable
      onPress={tier.key === 'free' ? undefined : onSelect}
      style={({ pressed }) => [
        card.root,
        isSelected && { borderColor: tier.accentColor, borderWidth: 2 },
        isElite && card.eliteRoot,
        pressed && tier.key !== 'free' && { opacity: 0.88 },
      ]}
    >
      {/* Badge */}
      {tier.badge ? (
        <View style={[card.badge, { backgroundColor: tier.accentColor }]}>
          <Text style={card.badgeText}>{tier.badge}</Text>
        </View>
      ) : null}

      {/* Header */}
      <View style={card.header}>
        <View style={[card.dot, { backgroundColor: tier.accentColor }]} />
        <Text style={[card.name, isElite && { color: GOLD }]}>{tier.name}</Text>
      </View>

      {/* Features */}
      <View style={card.features}>
        {tier.features.map(f => (
          <View key={f} style={card.featureRow}>
            <Ionicons
              name="checkmark-circle"
              size={15}
              color={tier.accentColor}
            />
            <Text style={card.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      {isActive ? (
        <View style={[card.cta, card.ctaCurrent]}>
          <Ionicons name="checkmark" size={15} color={Colors.textMuted} />
          <Text style={card.ctaCurrentText}>Current Plan</Text>
        </View>
      ) : tier.key === 'free' ? (
        <View style={[card.cta, card.ctaDisabled]}>
          <Text style={card.ctaDisabledText}>Free</Text>
        </View>
      ) : (
        <View style={[card.cta, { backgroundColor: tier.accentColor }]}>
          <Text style={card.ctaText}>Subscribe at v1portal.com</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.white} />
        </View>
      )}
    </Pressable>
  );
}

const card = StyleSheet.create({
  root: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 20,
    gap: 14,
    position: 'relative',
  },
  eliteRoot: {
    backgroundColor: '#1A1500',
  },
  badge: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  price: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -1.5,
    lineHeight: 40,
  },
  period: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  features: { gap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 14, color: Colors.textMuted, flex: 1, lineHeight: 19 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
    marginTop: 2,
  },
  ctaCurrent: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaCurrentText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  ctaDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  ctaDisabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDim,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.2,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [currentPlan, setCurrentPlan] = useState<PlanKey>('free');
  const [selectedTier, setSelectedTier] = useState<PlanKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 4000);
  }, []);

  const fetchPlan = useCallback(async () => {
    if (!userId) return;

    // Try subscriptions table first, fall back to athletes.subscription_tier
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (sub?.plan) {
      const plan = (sub.plan as string).toLowerCase() as PlanKey;
      setCurrentPlan(plan === 'pro' || plan === 'elite' ? plan : 'free');
      return;
    }

    // Fallback: athletes.subscription_tier
    const { data: ath } = await supabase
      .from('athletes')
      .select('subscription_tier, subscription_status')
      .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
      .maybeSingle();

    if (ath?.subscription_tier && ath.subscription_status === 'active') {
      const tier = (ath.subscription_tier as string).toLowerCase() as PlanKey;
      setCurrentPlan(tier === 'pro' || tier === 'elite' ? tier : 'free');
    }
  }, [userId]);

  useEffect(() => {
    fetchPlan();
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [fetchPlan]);

  const handleSelect = async (tier: Tier) => {
    if (tier.key === 'free' || !tier.checkoutUrl) return;
    setSelectedTier(tier.key);
    setLoading(true);

    try {
      const result = await WebBrowser.openBrowserAsync(tier.checkoutUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        controlsColor: tier.accentColor,
        toolbarColor: Colors.background,
        showTitle: true,
      });

      // Browser dismissed — refresh subscription status regardless of result
      if (result.type === 'dismiss' || result.type === 'cancel') {
        await fetchPlan();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = () => {
    showToast('Contact support at support@v1portal.com to restore your purchase.');
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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
            <Ionicons name="trophy" size={28} color={GOLD} />
          </View>
          <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
          <Text style={styles.heroSubtitle}>
            Choose the plan that fits your recruiting goals. Upgrade or downgrade anytime.
          </Text>
        </View>

        {/* Tier cards */}
        <View style={styles.cards}>
          {TIERS.map(tier => (
            <TierCard
              key={tier.key}
              tier={tier}
              isActive={currentPlan === tier.key}
              isSelected={selectedTier === tier.key}
              onSelect={() => handleSelect(tier)}
            />
          ))}
        </View>

        {/* Trust signals */}
        <View style={styles.trustRow}>
          {[
            { icon: 'lock-closed-outline' as const, label: 'Secure payment' },
            { icon: 'refresh-outline' as const, label: 'Cancel anytime' },
            { icon: 'shield-checkmark-outline' as const, label: '30-day guarantee' },
          ].map(item => (
            <View key={item.label} style={styles.trustItem}>
              <Ionicons name={item.icon} size={14} color={Colors.textMuted} />
              <Text style={styles.trustText}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Manage subscription */}
        <Pressable
          style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.6 }]}
          onPress={() => WebBrowser.openBrowserAsync('https://v1portal.com/dashboard')}
        >
          <Text style={styles.restoreText}>Manage Subscription</Text>
        </Pressable>

        <Text style={styles.legalText}>
          Subscriptions are managed at v1portal.com. By subscribing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>

      <Toast message={toastMsg} visible={toastVisible} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 0,
  },

  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
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

  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
    marginBottom: 8,
  },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#1A1300',
    borderWidth: 1,
    borderColor: `${GOLD}44`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  cards: { gap: 20, paddingBottom: 4, marginBottom: 28 },

  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { fontSize: 12, color: Colors.textMuted },

  restoreBtn: { alignSelf: 'center', paddingVertical: 10, marginBottom: 16 },
  restoreText: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline' },

  legalText: {
    fontSize: 11,
    color: Colors.textDim,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 20,
  },
});
