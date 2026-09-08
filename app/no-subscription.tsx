import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { TIER_GRADIENT, ThemeColors } from '../constants/Colors';
import { FontFamily } from '../constants/Fonts';
import { useColors } from '../context/ThemeContext';

const FEATURES = [
  'Full V1 Score breakdown',
  'Swipe every program (300+), every division',
  'No cap, unlimited swipes and matches',
  'Message coaches the moment you match',
  '3-6 month recruiting roadmap',
  'Progress tracking',
];

export default function NoSubscriptionScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Text style={s.eyebrow}>MATCH+ REQUIRED</Text>
      <Text style={s.title}>This area needs Match+.</Text>
      <Text style={s.subtitle}>
        Your subscription isn't active right now. Upgrade to unlock program matching, messaging, and your full recruiting gameplan.
      </Text>

      <View style={s.card}>
        <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.badge}>
          <Text style={s.badgeText}>Full Recruiting System</Text>
        </LinearGradient>
        <Text style={s.planName}>Match+</Text>

        <View style={s.featureList}>
          {FEATURES.map(f => (
            <View key={f} style={s.featureRow}>
              <View style={s.featureCheck}>
                <Ionicons name="checkmark" size={11} color="#a78bfa" />
              </View>
              <Text style={s.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={() => router.push('/(tabs)/upgrade' as any)}>
          <LinearGradient colors={TIER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaBtn}>
            <Text style={s.ctaText}>Upgrade to Match+</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push('/(tabs)' as any)} style={{ marginTop: 8 }}>
        <Text style={s.backLink}>← Back to dashboard</Text>
      </Pressable>
      <Pressable onPress={handleSignOut} style={{ marginTop: 18 }}>
        <Text style={s.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 24, paddingTop: 64, paddingBottom: 56, alignItems: 'center' },

    eyebrow: { fontFamily: FontFamily.bodyExtraBold, fontSize: 11, color: C.textDim, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 12, textAlign: 'center' },
    title: { fontFamily: FontFamily.statNumber, fontSize: 28, color: C.text, letterSpacing: -0.8, textAlign: 'center' },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginTop: 10, marginBottom: 32, maxWidth: 340 },

    card: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1.5, borderColor: '#C13584', padding: 22, backgroundColor: C.surface },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginBottom: 14 },
    badgeText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 9, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 },
    planName: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.textDim, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 18 },

    featureList: { gap: 9, marginBottom: 22 },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    featureCheck: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(80,26,255,0.15)', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    featureText: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18, color: C.textMuted },

    ctaBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    ctaText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },

    backLink: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    signOutText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
  });
}
