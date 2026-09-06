import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCoachData } from '../../../hooks/useCoachData';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Avatar } from '../../../components/ui/Avatar';
import { Card } from '../../../components/ui/Card';

export default function CoachProfileScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach } = useCoachData();

  if (!coach) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </Pressable>
        <Text style={s.title}>My Profile</Text>
        <Pressable onPress={() => router.push('/(coach)/profile/edit' as any)} hitSlop={8}>
          <Ionicons name="pencil" size={20} color={C.primary} />
        </Pressable>
      </View>

      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Avatar uri={coach.profile_photo_url} name={coach.full_name} size={80} />
        <Text style={s.name}>{coach.full_name ?? 'Coach'}</Text>
        <Text style={s.school}>{coach.school_name}</Text>
        {coach.verified && <Text style={s.verified}>✓ Verified Coach</Text>}
      </Card>

      <View style={{ gap: 12, marginTop: 20 }}>
        <Card bordered>
          <View style={s.row}>
            <Text style={s.label}>Division</Text>
            <Text style={s.value}>{coach.division ?? '—'}</Text>
          </View>
        </Card>

        <Card bordered>
          <View style={s.row}>
            <Text style={s.label}>Title</Text>
            <Text style={s.value}>{coach.title ?? '—'}</Text>
          </View>
        </Card>

        <Card bordered>
          <View style={s.row}>
            <Text style={s.label}>Position Coached</Text>
            <Text style={s.value}>{coach.position_coached ?? '—'}</Text>
          </View>
        </Card>

        {coach.years_coaching != null && (
          <Card bordered>
            <View style={s.row}>
              <Text style={s.label}>Years Coaching</Text>
              <Text style={s.value}>{coach.years_coaching}</Text>
            </View>
          </Card>
        )}

        {coach.bio && (
          <Card bordered>
            <View>
              <Text style={s.label}>Bio</Text>
              <Text style={[s.value, { marginTop: 8 }]}>{coach.bio}</Text>
            </View>
          </Card>
        )}

        <Pressable
          style={({ pressed }) => [s.button, pressed && { opacity: 0.7 }]}
          onPress={() => router.push('/(coach)/profile/edit' as any)}
        >
          <Ionicons name="pencil" size={16} color="#fff" />
          <Text style={s.buttonText}>Edit Profile</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text },
    name: { fontFamily: FontFamily.headlineBold, fontSize: 20, color: C.text, marginTop: 12 },
    school: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginTop: 4 },
    verified: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.success, marginTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textDim },
    value: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },
    button: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    buttonText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
  });
}
