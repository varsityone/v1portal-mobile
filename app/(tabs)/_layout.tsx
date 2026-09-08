import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { registerForPushNotifications } from '../../lib/notifications';
import AppDrawer from '../../components/AppDrawer';
import LoadingScreen from '../../components/LoadingScreen';
import HelpAttractButton from '../../components/HelpAttractButton';
import { useColors } from '../../context/ThemeContext';
import { useTheme } from '../../context/ThemeContext';

// ─── Header logo ──────────────────────────────────────────────────────────────

function HeaderLogo() {
  const { theme: scheme } = useTheme();
  return (
    <Image
      source={
        scheme === 'light'
          ? require('../../assets/logo-light.png')
          : require('../../assets/logo-dark.png')
      }
      style={{ height: 26, width: 120 }}
      resizeMode="contain"
    />
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function DrawerLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const { theme: scheme } = useTheme();
  const C = useColors();

  const headerBg    = C.background;
  const headerBorder = scheme === 'light' ? 'rgba(0,0,0,0.08)' : C.border;
  const iconColor   = scheme === 'light' ? '#1a1b1d' : C.textMuted;
  const drawerBg    = scheme === 'light' ? '#f0f0f0' : C.background;

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/login');
    }
    if (!loading && session) {
      registerForPushNotifications(session).catch(() => {});
    }
  }, [session, loading]);

  if (loading) return <LoadingScreen />;

  if (!session) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HelpAttractButton onPress={() => router.push('/help' as any)} />

      <Drawer
        drawerContent={AppDrawer}
        screenOptions={{
          headerShown: true,
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: headerBg,
            borderBottomWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          } as any,
          headerTintColor: iconColor,
          drawerStyle: { backgroundColor: drawerBg, width: 280 },
          drawerType: 'front',
          overlayColor: 'rgba(0,0,0,0.5)',
          sceneStyle: {
            backgroundColor: scheme === 'light' ? '#f0f0f0' : C.background,
          },
        }}
      >
        <Drawer.Screen name="results"          options={{ title: 'My V1 Score' }} />
        <Drawer.Screen name="match"            options={{ title: 'Program Matches' }} />
        <Drawer.Screen name="messages"         options={{ title: 'Messages', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="calendar"         options={{ title: 'Calendar', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="analytics"        options={{ title: 'Analytics', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="profile"          options={{ title: 'Build Profile', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="edit-profile"     options={{ title: 'Edit Profile', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="settings"         options={{ title: 'Settings', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="upgrade"          options={{ title: 'Upgrade', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="index"            options={{ title: 'Dashboard', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="gameplan"         options={{ title: 'Gameplan', drawerItemStyle: { display: 'none' }, headerShown: false }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

