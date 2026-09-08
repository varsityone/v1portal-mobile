import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../context/ThemeContext';
import { FontFamily } from '../../constants/Fonts';

export default function RetakeCard() {
  const router = useRouter();
  const C = useColors();

  return (
    <View style={[s.card, { backgroundColor: C.surface }]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: C.text }]}>Retake Assessment</Text>
        <Text style={[s.body, { color: C.textDim }]}>
          Updated your stats, film, or academics? Retake to get a fresh V1 Score.
        </Text>
      </View>
      <Pressable onPress={() => router.push('/assessment?retake=true' as any)}>
        <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
          <Ionicons name="refresh" size={14} color="#fff" />
          <Text style={s.btnText}>Retake</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  title: { fontFamily: FontFamily.statNumber, fontSize: 14, marginBottom: 4 },
  body: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 18 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: '#fff' },
});
