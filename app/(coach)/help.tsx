import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';

export default function HelpScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>SUPPORT</Text>
        <Text style={s.title}>Help</Text>
      </View>
      <Card><Text style={s.text}>Support resources for coaches coming soon.</Text></Card>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    text: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },
  });
}
