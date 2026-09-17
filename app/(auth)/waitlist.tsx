import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { GRADIENT } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';

// Landed here because athletes.account_role came back 'athlete_waitlist' /
// 'parent_waitlist' from resolveHomeRoute -- see lib/resolveHomeRoute.ts.
// Matches web's app/onboarding/athlete-waitlist/page.tsx.
export default function WaitlistScreen() {
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  return (
    <View style={s.wrap}>
      <Image source={require('../../assets/logo-dark.png')} style={s.logo} resizeMode="contain" />

      <View style={s.iconWrap}>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconGradient}>
          <Ionicons name="body-outline" size={26} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={s.headline}>You're on the list.</Text>
      <Text style={s.blurb}>
        We're building out the coach network first so there's real recruiting activity waiting for you on day one. We'll email you as soon as athlete access opens up.
      </Text>

      {!!email && (
        <View style={s.emailCard}>
          <Text style={s.emailLabel}>We&apos;ll notify you at</Text>
          <Text style={s.emailValue}>{email}</Text>
        </View>
      )}
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
});
