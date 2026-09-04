import { Stack } from 'expo-router';
import { useColors } from '../../../context/ThemeContext';
import { GameplanNavHeader } from '../../../components/GameplanNavHeader';

export default function GameplanLayout() {
  const C = useColors();
  return (
    <Stack
      screenOptions={{
        header: () => <GameplanNavHeader />,
        contentStyle: { backgroundColor: C.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
