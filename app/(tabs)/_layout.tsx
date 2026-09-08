import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { registerForPushNotifications } from '../../lib/notifications';
import AppDrawer from '../../components/AppDrawer';
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!session) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Pressable
        style={floatStyles.btn}
        onPress={() => router.push('/help' as any)}
      >
        <LinearGradient
          colors={['#ff0000', '#ffbc00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={floatStyles.gradient}
        >
          <Ionicons name="help-circle-outline" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>

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
        <Drawer.Screen name="gameplan"         options={{ title: 'Gameplan', drawerItemStyle: { display: 'none' } }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

// Matches web's actual DOM (element.style, confirmed via inspector):
// position:fixed; right:-12px; bottom:110px; width/height:48px;
// border-radius:8px 0 0 8px; background:linear-gradient(130deg, red, #ffbc00);
// box-shadow: -2px 4px 12px rgba(0,0,0,0.2). Rounded on the left edge only —
// a tab, not a circle.
const floatStyles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 110,
    right: -12,
    width: 48,
    height: 48,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  gradient: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
});
