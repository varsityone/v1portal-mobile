import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';
import { FontFamily } from '../../constants/Fonts';

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; desc: string }[] = [
  { icon: 'bar-chart-outline', title: 'Full score breakdown', desc: 'Production %, physical %, academic % & intangibles' },
  { icon: 'school-outline', title: 'Up to 25 matched programs', desc: 'Schools at your level actively recruiting your position' },
  { icon: 'call-outline', title: 'Verified coach contacts', desc: 'Direct lines to recruiting coordinators' },
  { icon: 'mail-outline', title: 'Coach outreach templates', desc: 'Position-specific emails that get responses' },
];

interface UpsellCardProps {
  onUpgrade: () => void;
}

export default function UpsellCard({ onUpgrade }: UpsellCardProps) {
  const C = useColors();
  return (
    <View style={[s.card, { backgroundColor: C.surface }]}>
      <Text style={[s.title, { color: C.text }]}>Want the full picture?</Text>
      <Text style={[s.sub, { color: C.textDim }]}>Your score and tier are set. Here's what unlocks with Match+.</Text>
      <View style={s.list}>
        {FEATURES.map(item => (
          <View key={item.title} style={s.row}>
            <Ionicons name={item.icon} size={18} color={C.text} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.rowTitle, { color: C.text }]}>{item.title}</Text>
              <Text style={[s.rowDesc, { color: C.textDim }]}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable onPress={onUpgrade}>
        <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          <Text style={s.btnText}>Upgrade to Match+ →</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 24, marginBottom: 24 },
  title: { fontFamily: FontFamily.statNumber, fontSize: 15, marginBottom: 4 },
  sub: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18, marginBottom: 16 },
  list: { gap: 14, marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, marginBottom: 2 },
  rowDesc: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18 },
  btn: { alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  btnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
});
