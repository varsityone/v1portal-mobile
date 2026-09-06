import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';

export default function TargetingScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const targets = [
    { division: 'FBS', schools: 15, match: 2 },
    { division: 'FCS', schools: 32, match: 8 },
    { division: 'D2', schools: 48, match: 12 },
    { division: 'D3', schools: 62, match: 18 },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>RECRUITING</Text>
        <Text style={s.title}>Targeting</Text>
      </View>

      <View style={{ gap: 10 }}>
        {targets.map((t, i) => (
          <Card key={i}>
            <Text style={s.division}>{t.division}</Text>
            <Text style={s.stat}>{t.schools} schools</Text>
            <Text style={s.match}>{t.match} matches</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },
    division: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text },
    stat: { fontFamily: FontFamily.headline, fontSize: 24, fontWeight: '900', color: C.primary, marginVertical: 4 },
    match: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
  });
}
