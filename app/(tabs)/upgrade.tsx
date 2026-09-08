import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { getCurrentOffering, purchasePackage, restorePurchases, hasActiveEntitlement } from '../../lib/purchases';
import { useAthleteData } from '../../hooks/useAthleteData';
import { TIER_GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

const FEATURES = [
  'Full V1 Score breakdown',
  'Swipe every program (300+), every division',
  'No cap — unlimited swipes and matches',
  'Message coaches the moment you match',
  '3–6 month recruiting roadmap',
  'Progress tracking',
];

export default function UpgradeScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { athlete, assessment, refresh } = useAthleteData();

  const [pkg, setPkg] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    let mounted = true;
    getCurrentOffering()
      .then(offering => {
        if (!mounted) return;
        setPkg(offering?.availablePackages?.[0] ?? null);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  // Poll until the RevenueCat webhook has flipped subscription_status on the
  // athletes row (usually a second or two), then drop the user back in.
  const waitForUnlock = async () => {
    setActivating(true);
    for (let i = 0; i < 6; i++) {
      const a = await refresh();
      if (a?.subscription_status === 'active') {
        setActivating(false);
        router.replace('/(tabs)/match');
        return;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    setActivating(false);
    router.replace('/(tabs)/match');
    Alert.alert(
      "You're all set",
      "Your purchase went through — it can take a minute to unlock. Pull to refresh if you don't see it right away."
    );
  };

  const handlePurchase = async () => {
    if (!pkg || purchasing) return;
    setPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      setPurchasing(false);
      if (hasActiveEntitlement(info)) await waitForUnlock();
    } catch (err: any) {
      setPurchasing(false);
      if (!err?.userCancelled) {
        Alert.alert('Purchase failed', 'Something went wrong completing your purchase. Please try again.');
      }
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const info = await restorePurchases();
      setRestoring(false);
      if (hasActiveEntitlement(info)) {
        await waitForUnlock();
      } else {
        Alert.alert('No purchases found', "We couldn't find an active Match+ subscription for this account.");
      }
    } catch {
      setRestoring(false);
      Alert.alert('Restore failed', 'Something went wrong restoring your purchases. Please try again.');
    }
  };

  if (activating) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={C.text} size="large" />
        <Text style={[s.body, { marginTop: 16 }]}>Activating Match+…</Text>
      </SafeAreaView>
    );
  }

  const score = athlete?.v1_score != null ? Math.round(Number(athlete.v1_score)) : null;
  const rl = assessment?.recruiting_level;
  const levelLabel = typeof rl === 'object' && rl !== null
    ? (rl as any).level ?? (rl as any).projected ?? ''
    : (rl as string) ?? '';
  const position = athlete?.position || '';
  const gradYear = athlete?.graduation_year || '';
  const firstName = athlete?.full_name?.split(' ')[0] || 'Athlete';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      {/* Header */}
      <Text style={s.eyebrow}>Unlock Your Recruiting Gameplan</Text>
      <Text style={s.title}>
        {score ? `Your V1 Score is ${score}.` : `Hey ${firstName},`}
      </Text>
      <Text style={s.titleAccent}>Here's how to use it.</Text>
      {score && levelLabel ? (
        <Text style={s.metaLine}>
          {position && gradYear ? `${position} · Class of ${gradYear} · ` : ''}{levelLabel}
        </Text>
      ) : null}
      <Text style={s.subtitle}>
        Your score shows where you stand. The plan below shows you what to do next — and puts you in front of the coaches who are looking for someone exactly like you.
      </Text>

      {/* Pricing card */}
      <View style={[s.card, { backgroundColor: C.surface }]}>
        <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.badge}>
          <Text style={s.badgeText}>Full Recruiting System</Text>
        </LinearGradient>

        <Text style={[s.planName, { color: C.textDim }]}>Match+</Text>

        {loading ? (
          <ActivityIndicator color={C.textMuted} style={{ marginVertical: 12 }} />
        ) : pkg ? (
          <>
            <Text style={[s.price, { color: C.text }]}>{pkg.product.priceString}</Text>
            <Text style={[s.period, { color: C.textDim }]}>per month · cancel anytime</Text>
          </>
        ) : (
          <Text style={[s.body, { marginVertical: 12 }]}>Subscriptions aren't available right now.</Text>
        )}

        <Text style={[s.description, { color: C.textMuted }]}>
          Your complete recruiting system — every program, every division, and a real roadmap.
        </Text>

        {pkg && (
          <Pressable onPress={handlePurchase} disabled={purchasing}>
            <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaBtn}>
              {purchasing ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Start Match+</Text>}
            </LinearGradient>
          </Pressable>
        )}

        <View style={s.featureList}>
          {FEATURES.map(f => (
            <View key={f} style={s.featureRow}>
              <View style={s.featureCheck}>
                <Ionicons name="checkmark" size={11} color="#a78bfa" />
              </View>
              <Text style={[s.featureText, { color: C.textMuted }]}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {pkg && (
        <>
          <Text style={s.fineprint}>
            Renews monthly at {pkg.product.priceString} until canceled. Cancel anytime in your device's
            subscription settings. Payment is charged to your {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} account at confirmation.
          </Text>

          <Pressable onPress={handleRestore} disabled={restoring} style={{ marginTop: 18 }}>
            <Text style={s.restoreText}>{restoring ? 'Restoring…' : 'Restore Purchases'}</Text>
          </Pressable>

          <View style={s.legalRow}>
            <Pressable onPress={() => Linking.openURL('https://v1portal.com/terms')}>
              <Text style={s.legalLink}>Terms of Use</Text>
            </Pressable>
            <Text style={s.legalDot}>·</Text>
            <Pressable onPress={() => Linking.openURL('https://v1portal.com/privacy')}>
              <Text style={s.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </>
      )}

      <Pressable onPress={() => router.push('/(tabs)' as any)} style={{ marginTop: 24 }}>
        <Text style={s.backLink}>← Back to dashboard</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 24, paddingTop: 40, paddingBottom: 56, alignItems: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    body: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center' },

    eyebrow: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12, textAlign: 'center' },
    title: { fontFamily: FontFamily.statNumber, fontSize: 28, color: C.text, letterSpacing: -0.8, textAlign: 'center' },
    titleAccent: { fontFamily: FontFamily.statNumber, fontSize: 28, letterSpacing: -0.8, color: '#C13584', textAlign: 'center' },
    metaLine: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, marginTop: 8, textAlign: 'center' },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 32, maxWidth: 340 },

    card: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1.5, borderColor: '#C13584', padding: 22, marginBottom: 24 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginBottom: 14 },
    badgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 9, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 },
    planName: { fontFamily: FontFamily.bodyBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    price: { fontFamily: FontFamily.statNumber, fontSize: 34, letterSpacing: -0.9, lineHeight: 38 },
    period: { fontFamily: FontFamily.body, fontSize: 11, marginBottom: 16 },
    description: { fontFamily: FontFamily.body, fontSize: 13, lineHeight: 19, marginBottom: 20 },
    ctaBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 20 },
    ctaText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },

    featureList: { gap: 9 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    featureCheck: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(80,26,255,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    featureText: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18 },

    fineprint: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: 16, maxWidth: 320 },
    restoreText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textMuted },
    legalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
    legalLink: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textDecorationLine: 'underline' },
    legalDot: { color: C.textDim, fontSize: 11 },
    backLink: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
  });
}
