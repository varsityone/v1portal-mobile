import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';

export default function SettingsScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login' as any);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>ACCOUNT</Text>
        <Text style={s.title}>Settings</Text>
      </View>

      <View style={{ gap: 10 }}>
        <Card>
          <Pressable style={s.menuItem} onPress={() => router.push('/(coach)/profile' as any)}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.menuLabel}>Edit Profile</Text>
              <Text style={s.menuSub}>Name, division, coaching info</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textDim} />
          </Pressable>
        </Card>

        <Card>
          <Pressable style={s.menuItem} onPress={() => router.push('/(coach)/notifications-settings' as any)}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.menuLabel}>Notifications</Text>
              <Text style={s.menuSub}>Email & push preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textDim} />
          </Pressable>
        </Card>

        <Card>
          <Pressable style={s.menuItem} onPress={() => router.push('/(coach)/compliance' as any)}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.menuLabel}>Compliance Calendar</Text>
              <Text style={s.menuSub}>NCAA recruiting rules</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textDim} />
          </Pressable>
        </Card>

        <Card>
          <Pressable style={[s.menuItem, s.dangerMenu]} onPress={handleSignOut}>
            <Text style={[s.menuLabel, s.dangerText]}>Sign Out</Text>
          </Pressable>
        </Card>
      </View>

      <Text style={s.version}>V1Portal Coach · v3.4.2</Text>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    menuLabel: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    menuSub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: 2 },
    dangerMenu: { justifyContent: 'center' },
    dangerText: { color: C.error },
    version: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 40 },
  });
}
