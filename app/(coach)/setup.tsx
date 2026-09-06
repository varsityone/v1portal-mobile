import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';

export default function SetupScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();

  const steps = [
    { title: 'Complete Profile', desc: 'Add your coaching info' },
    { title: 'Set Recruiting Needs', desc: 'Select positions and levels' },
    { title: 'Configure Settings', desc: 'Notification and privacy settings' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>GETTING STARTED</Text>
        <Text style={s.title}>Coach Setup</Text>
      </View>

      <View style={{ gap: 12 }}>
        {steps.map((step, i) => (
          <Card key={i}>
            <Text style={s.stepNum}>Step {i + 1}</Text>
            <Text style={s.stepTitle}>{step.title}</Text>
            <Text style={s.stepDesc}>{step.desc}</Text>
          </Card>
        ))}
      </View>

      <Pressable style={s.btn} onPress={() => router.push('/(coach)/profile/edit' as any)}>
        <Text style={s.btnText}>Start Setup</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    stepNum: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim, marginBottom: 4 },
    stepTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    stepDesc: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, marginTop: 4 },
    btn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    btnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
  });
}
