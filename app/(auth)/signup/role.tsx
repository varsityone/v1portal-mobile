import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '../../../constants/Fonts';
import { ROLE_BLURBS, type AccountRole } from '../../../lib/roleStorage';

// Matches web's app/(auth)/signup/role/page.tsx exactly: dark page, radial
// purple/green glow blobs, a 2x2 tile grid (each role its own gradient/
// solid fill), checkmark badge on the selected tile, blurb preview, and a
// single "Continue" pill that's disabled until a role is picked.

const ROLES: { id: AccountRole; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: string }[] = [
  { id: 'athlete', label: "I'm the Athlete", icon: 'body' },
  { id: 'parent', label: "I'm a Parent", icon: 'people' },
  { id: 'coach', label: "I'm a Coach", icon: 'clipboard' },
  { id: 'flag_football', label: 'Flag Football (Girls)', icon: 'flag', badge: 'Waitlist' },
];

export default function RolePickerScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);

  const continueToSignup = () => {
    if (!selectedRole) return;
    router.push({ pathname: '/(auth)/signup', params: { role: selectedRole } });
  };

  return (
    <View style={s.root}>
      <View style={[s.glow, s.glowTop]} />
      <View style={[s.glow, s.glowBottom]} />

      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        <Image source={require('../../../assets/logo-dark.png')} style={s.logo} resizeMode="contain" />

        <View style={s.card}>
          <Pressable style={s.closeBtn} onPress={() => router.replace('/(auth)/login')} hitSlop={10}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
          </Pressable>
          <Text style={s.title}>Who's setting this up?</Text>
          <Text style={s.sub}>This helps us personalize your experience from the start.</Text>

          <View style={s.grid}>
            {ROLES.map(role => {
              const isSelected = selectedRole === role.id;
              const tile = (
                <>
                  {isSelected && (
                    <View style={[s.check, role.id === 'coach' && s.checkCoach]}>
                      <Ionicons name="checkmark" size={12} color={role.id === 'coach' ? '#501af0' : '#fff'} />
                    </View>
                  )}
                  <Ionicons
                    name={role.icon}
                    size={28}
                    color={role.id === 'coach' ? '#C0007A' : '#fff'}
                  />
                  <Text style={[s.tileLabel, role.id === 'coach' && s.tileLabelCoach]}>{role.label}</Text>
                  {role.badge && (
                    <View style={s.badge}><Text style={s.badgeText}>{role.badge}</Text></View>
                  )}
                </>
              );

              if (role.id === 'coach') {
                return (
                  <Pressable key={role.id} style={[s.tile, s.tileCoach, isSelected && s.tileSelected]} onPress={() => setSelectedRole(role.id)}>
                    {tile}
                  </Pressable>
                );
              }

              const gradientColors: [string, string] =
                role.id === 'athlete' ? ['red', '#ffd000']
                : role.id === 'parent' ? ['#000000', '#2d2d2d']
                : ['#ff0056', '#b600ff'];

              return (
                <Pressable key={role.id} style={[s.tile, isSelected && s.tileSelected]} onPress={() => setSelectedRole(role.id)}>
                  <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  {tile}
                </Pressable>
              );
            })}
          </View>

          {selectedRole && (
            <Text style={s.blurb}>{ROLE_BLURBS[selectedRole]}</Text>
          )}

          <Pressable
            style={[s.continueBtn, selectedRole && s.continueBtnActive]}
            disabled={!selectedRole}
            onPress={continueToSignup}
          >
            <Text style={[s.continueBtnText, selectedRole && s.continueBtnTextActive]}>
              {selectedRole ? 'Continue →' : 'Select who you are to continue'}
            </Text>
          </Pressable>
        </View>

        <Text style={s.footer}>
          Already have an account?{' '}
          <Text style={s.footerLink} onPress={() => router.replace('/(auth)/login')}>Log in</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e0e0e' },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.4 },
  glowTop: { backgroundColor: 'rgba(80,26,255,0.12)', top: -100, left: -100 },
  glowBottom: { backgroundColor: 'rgba(113,255,126,0.08)', bottom: -80, right: -80 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 40 },
  logo: { height: 28, width: 140, alignSelf: 'center', marginBottom: 24 },

  card: { backgroundColor: '#0e0e0e', borderRadius: 24, padding: 24, gap: 12 },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  title: { fontFamily: FontFamily.headline, fontSize: 22, color: '#fff', textAlign: 'center' },
  sub: { fontFamily: FontFamily.body, fontSize: 13, color: '#9a9da2', textAlign: 'center', marginBottom: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '47%', flexGrow: 1, position: 'relative', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 18, paddingVertical: 24, paddingHorizontal: 12, minHeight: 120,
  },
  tileCoach: { backgroundColor: '#ffffff' },
  tileSelected: { transform: [{ translateY: -3 }] },
  tileLabel: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff', textAlign: 'center' },
  tileLabelCoach: { color: '#C0007A' },
  check: {
    position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },
  checkCoach: { backgroundColor: 'rgba(80,26,255,0.1)' },
  badge: { backgroundColor: '#fff', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  badgeText: { fontFamily: FontFamily.bodyBold, fontSize: 8.5, color: '#dc01a7', letterSpacing: 0.5, textTransform: 'uppercase' },

  blurb: { fontFamily: FontFamily.body, fontSize: 12.5, color: '#fff', lineHeight: 19, textAlign: 'center', paddingHorizontal: 4 },

  continueBtn: { backgroundColor: '#303238', borderRadius: 100, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  continueBtnActive: { backgroundColor: '#fff' },
  continueBtnText: { fontFamily: FontFamily.headline, fontSize: 15, color: '#9a9da2' },
  continueBtnTextActive: { color: '#000' },

  footer: { textAlign: 'center', fontFamily: FontFamily.body, fontSize: 13, color: '#9a9da2', marginTop: 20 },
  footerLink: { fontFamily: FontFamily.bodyBold, color: '#fff' },
});
