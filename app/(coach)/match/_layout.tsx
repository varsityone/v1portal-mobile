import { Stack } from 'expo-router';
import { useColors } from '../../../context/ThemeContext';

export default function CoachMatchLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
