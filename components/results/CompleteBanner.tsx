import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FontFamily } from '../../constants/Fonts';

interface CompleteBannerProps {
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function CompleteBanner({ isPremium, onUpgrade }: CompleteBannerProps) {
  const router = useRouter();

  return (
    <View style={s.card}>
      <Text style={s.title}>Assessment Complete — Phase 1 of 3</Text>
      <Text style={s.body}>
        {isPremium
          ? 'Your full score breakdown is unlocked. Build your profile next.'
          : 'Your score and tier are set. Upgrade to Match+ to see your full breakdown and matched programs.'}
      </Text>
      <View style={s.row}>
        {!isPremium && (
          <Pressable onPress={onUpgrade}>
            <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
              <Text style={s.btnText}>Upgrade to Match+ →</Text>
            </LinearGradient>
          </Pressable>
        )}
        <Pressable onPress={() => router.push('/(tabs)' as any)}>
          <LinearGradient colors={['red', '#ffd000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btn}>
            <Text style={s.btnText}>Go to Dashboard</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 8, padding: 26, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center' },
  title: { fontFamily: FontFamily.statNumber, fontSize: 17, color: '#000', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: FontFamily.body, fontSize: 13, color: '#666', marginBottom: 18, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  btn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100 },
  btnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 13, color: '#fff' },
});
