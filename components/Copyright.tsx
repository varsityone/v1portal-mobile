import { StyleSheet, Text, View } from 'react-native';
import { FontFamily } from '../constants/Fonts';
import { useColors } from '../context/ThemeContext';

// Mirrors web's components/Copyright.js.
export default function Copyright() {
  const C = useColors();
  return (
    <View style={s.wrap}>
      <Text style={[s.line, { color: C.textDim }]}>
        V1Portal® uses patented-pending V1OS AI-powered technology and may make mistakes. Please double-check important details such as dates, stats and personal information for accuracy.
      </Text>
      <Text style={[s.line, { color: C.textDim }]}>
        © {new Date().getFullYear()} V1Portal®. All rights reserved. A registered trademark of VarsityOne Group LLC
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 16 },
  line: { fontFamily: FontFamily.body, fontSize: 11, lineHeight: 16, textAlign: 'center' },
});
