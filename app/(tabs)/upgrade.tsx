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
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

const BENEFITS = [
  'Unlimited swipes across every division, not just your level',
  'See every program that matches your V1 Score',
  'Message coaches the moment you match',
  'Reach-program heads-up so you know your odds before you send',
];

export default function UpgradeScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { refresh } = useAthleteData();

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
      const athlete = await refresh();
      if (athlete?.subscription_status === 'active') {
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.iconWrap}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Ionicons name="heart" size={28} color="#fff" />
      </View>

      <Text style={s.title}>Unlock Match+</Text>
      <Text style={s.subtitle}>Swipe every division, not just your own.</Text>

      <View style={s.benefits}>
        {BENEFITS.map(b => (
          <View key={b} style={s.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={C.success} />
            <Text style={s.benefitText}>{b}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={C.textMuted} style={{ marginVertical: 24 }} />
      ) : pkg ? (
        <>
          <Pressable style={s.ctaWrap} onPress={handlePurchase} disabled={purchasing}>
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {purchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.ctaText}>Subscribe — {pkg.product.priceString}/mo</Text>
            )}
          </Pressable>

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
      ) : (
        <Text style={s.body}>Subscriptions aren't available right now. Please try again shortly.</Text>
      )}
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 28, paddingTop: 40, paddingBottom: 56, alignItems: 'center' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 18 },
    title: { fontFamily: FontFamily.headline, fontSize: 30, color: C.text, textAlign: 'center' },
    subtitle: { fontFamily: FontFamily.body, fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 28 },
    body: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center' },

    benefits: { width: '100%', gap: 14, marginBottom: 32 },
    benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    benefitText: { flex: 1, fontFamily: FontFamily.bodySemi, fontSize: 14, color: C.text, lineHeight: 20 },

    ctaWrap: { width: '100%', borderRadius: 100, paddingVertical: 17, alignItems: 'center', overflow: 'hidden' },
    ctaText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, color: '#fff' },
    fineprint: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: 16, marginTop: 14, maxWidth: 320 },

    restoreText: { fontFamily: FontFamily.bodySemi, fontSize: 13, color: C.textMuted },
    legalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20 },
    legalLink: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textDecorationLine: 'underline' },
    legalDot: { color: C.textDim, fontSize: 11 },
  });
}
