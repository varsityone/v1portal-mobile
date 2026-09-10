import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useCoachData } from '../../hooks/useCoachData';
import { GRADIENT, ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';

function Section({ title, sub, children, C, s }: { title: string; sub?: string; children: React.ReactNode; C: ThemeColors; s: ReturnType<typeof createStyles> }) {
  return (
    <View style={[s.section, { backgroundColor: C.surface }]}>
      <Text style={[s.sectionTitle, { color: C.text }]}>{title}</Text>
      {sub ? <Text style={[s.sectionSub, { color: C.textDim }]}>{sub}</Text> : null}
      {children}
    </View>
  );
}

function Row({ label, value, onPress, cta, C, s }: { label: string; value?: string | null; onPress: () => void; cta: string; C: ThemeColors; s: ReturnType<typeof createStyles> }) {
  return (
    <View style={[s.row, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowLabel, { color: C.text }]}>{label}</Text>
        {value ? <Text style={[s.rowValue, { color: C.textDim }]} numberOfLines={1}>{value}</Text> : null}
      </View>
      <Pressable style={[s.rowBtn, { borderColor: C.border2 }]} onPress={onPress}>
        <Text style={[s.rowBtnText, { color: C.text }]}>{cta}</Text>
      </Pressable>
    </View>
  );
}

export default function CoachSettingsScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { session, signOut } = useAuth();
  const { coach } = useCoachData();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <Text style={[s.title, { color: C.text }]}>Settings</Text>
      <Text style={[s.subtitle, { color: C.textMuted }]}>Manage your account and how V1Portal reaches you.</Text>

      <Section title="Account" C={C} s={s}>
        <View style={{ gap: 10 }}>
          <Row label="Email Address" value={coach?.school_email ?? session?.user?.email} cta="Edit" onPress={() => router.push('/(coach)/profile/edit' as any)} C={C} s={s} />
          <Row label="Program Profile" value={coach?.school_name ?? 'Not set'} cta="Edit" onPress={() => router.push('/(coach)/profile/edit' as any)} C={C} s={s} />
        </View>
      </Section>

      <Section title="Notifications" sub="Choose which emails and push alerts you get from V1Portal." C={C} s={s}>
        <Pressable onPress={() => router.push('/(coach)/notifications-settings' as any)}>
          <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.pillBtn}>
            <Text style={s.pillBtnText}>Notification Preferences →</Text>
          </LinearGradient>
        </Pressable>
      </Section>

      <Section title="Recruiting Compliance" C={C} s={s}>
        <Pressable style={[s.pillBtnOutline, { borderColor: C.border2 }]} onPress={() => router.push('/(coach)/compliance' as any)}>
          <Text style={[s.pillBtnOutlineText, { color: C.text }]}>View Compliance Calendar →</Text>
        </Pressable>
      </Section>

      <Section title="Support" C={C} s={s}>
        <View style={{ gap: 10 }}>
          <Row label="Help & Support" onPress={() => router.push('/(coach)/help' as any)} cta="View" C={C} s={s} />
          <Row label="Share Feedback" onPress={() => router.push('/(coach)/help?subject=feedback' as any)} cta="View" C={C} s={s} />
        </View>
      </Section>

      <Section title="Legal" C={C} s={s}>
        <View style={{ gap: 10 }}>
          <Row label="Terms of Service" onPress={() => router.push('/terms' as any)} cta="View" C={C} s={s} />
          <Row label="Privacy Policy" onPress={() => router.push('/privacy' as any)} cta="View" C={C} s={s} />
        </View>
      </Section>

      <Pressable style={s.signOutBtn} onPress={handleSignOut}>
        <Text style={s.signOutBtnText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    title: { fontFamily: FontFamily.statNumber, fontSize: 26, marginBottom: 4 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, marginBottom: 20 },

    section: { borderRadius: 14, padding: 20, marginBottom: 14 },
    sectionTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 14, marginBottom: 4 },
    sectionSub: { fontFamily: FontFamily.body, fontSize: 12, marginBottom: 14, lineHeight: 18 },

    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 8, borderWidth: 1, gap: 12 },
    rowLabel: { fontFamily: FontFamily.body, fontSize: 13 },
    rowValue: { fontFamily: FontFamily.body, fontSize: 12, marginTop: 2 },
    rowBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
    rowBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12 },

    pillBtn: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100 },
    pillBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    pillBtnOutline: { alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 100, borderWidth: 1 },
    pillBtnOutlineText: { fontFamily: FontFamily.bodySemi, fontSize: 12 },

    signOutBtn: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginTop: 8 },
    signOutBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#ef4444' },
  });
}
