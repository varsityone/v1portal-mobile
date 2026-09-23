import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { FontFamily } from '../../constants/Fonts';
import { FLAG_FOOTBALL_ACK_STORAGE_KEY } from '../../lib/resolveHomeRoute';

// One-time landing shown right after a flag_football_waitlist signup --
// matches web's app/onboarding/flag-football-waitlist/page.tsx copy. Not a
// persistent gate: tapping through marks it acknowledged (see
// lib/resolveHomeRoute.ts) so later app launches go straight to /(tabs),
// the same way web lets these accounts freely reach /dashboard afterward.
export default function FlagFootballWaitlistScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const continueToApp = async () => {
    await AsyncStorage.setItem(FLAG_FOOTBALL_ACK_STORAGE_KEY, '1');
    router.replace('/(tabs)');
  };

  return (
    <View style={s.wrap}>
      <Image source={require('../../assets/logo-dark.png')} style={s.logo} resizeMode="contain" />

      <View style={s.iconWrap}>
        <LinearGradient colors={['#833AB4', '#C13584', '#E1306C', '#FCAF45']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconGradient}>
          <Ionicons name="flag" size={26} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={s.headline}>You're on the list.</Text>
      <Text style={s.blurb}>
        College flag football is growing fast and we're building something for it. When V1Portal launches flag football recruiting support, you'll be the first to know.
      </Text>

      {!!email && (
        <View style={s.emailCard}>
          <Text style={s.emailLabel}>We&apos;ll notify you at</Text>
          <Text style={s.emailValue}>{email}</Text>
        </View>
      )}

      <Pressable style={s.continueBtn} onPress={continueToApp}>
        <Text style={s.continueBtnText}>Go to Dashboard</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  logo: { height: 24, width: 130, marginBottom: 12 },
  iconWrap: { marginBottom: 4 },
  iconGradient: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  headline: { fontFamily: FontFamily.headline, fontSize: 30, color: '#fff', textAlign: 'center', letterSpacing: -0.3 },
  blurb: { fontFamily: FontFamily.body, fontSize: 13, color: '#9a9da2', textAlign: 'center', lineHeight: 20, maxWidth: 320 },
  emailCard: { backgroundColor: '#18191d', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, marginTop: 8 },
  emailLabel: { fontFamily: FontFamily.mono, fontSize: 10, color: '#6b6d70', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  emailValue: { fontFamily: FontFamily.bodyBold, fontSize: 13.5, color: '#fff' },
  continueBtn: { marginTop: 8, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 100, backgroundColor: '#18191d', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  continueBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
});
