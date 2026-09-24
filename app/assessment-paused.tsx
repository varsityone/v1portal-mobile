import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
export default function AssessmentPaused() {
  const router = useRouter();
  return <View style={{ flex: 1, backgroundColor: '#17191c', padding: 28, justifyContent: 'center', gap: 24 }}>
    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>Complete your assessment</Text>
    <Text style={{ color: '#bbb', fontSize: 16 }}>Your dashboard will be ready after you complete your V1 Assessment. Open the assessment to continue.</Text>
    <Pressable accessibilityRole="button" onPress={() => router.replace('/assessment')}><Text style={{ color: '#ff9400', fontSize: 20 }}>Continue Assessment →</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()}><Text style={{ color: '#bbb', fontSize: 16 }}>Sign Out</Text></Pressable>
  </View>;
}
