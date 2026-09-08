import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../../context/ThemeContext';
import { FontFamily } from '../../constants/Fonts';
import ScoreHistoryChart, { ScoreHistoryPoint } from './ScoreHistoryChart';

interface ScoreHistoryCardProps {
  history: ScoreHistoryPoint[];
}

export default function ScoreHistoryCard({ history }: ScoreHistoryCardProps) {
  const C = useColors();
  return (
    <View style={[s.card, { backgroundColor: C.surface }]}>
      <Text style={[s.eyebrow, { color: C.textDim }]}>Score Over Time</Text>
      <Text style={[s.sub, { color: C.textDim }]}>Every scored assessment, tracked.</Text>
      <ScoreHistoryChart data={history} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 24, marginBottom: 24 },
  eyebrow: { fontFamily: FontFamily.bodyBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 4 },
  sub: { fontFamily: FontFamily.body, fontSize: 12, marginBottom: 8 },
});
