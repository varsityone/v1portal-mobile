import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DEFAULT_PROFILE_IMAGE } from '../constants/ProfileImage';

export default function SwipeCardBackground({ uri }: { uri?: string | null }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={uri ? { uri } : DEFAULT_PROFILE_IMAGE}
        resizeMode="cover"
        style={styles.photo}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.48)', 'rgba(0,0,0,0.88)', '#000000']}
        locations={[0, 0.32, 0.58, 0.82, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Explicit dimensions override the intrinsic size of bundled placeholders.
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
});
