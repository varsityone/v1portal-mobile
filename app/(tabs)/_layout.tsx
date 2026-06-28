import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
          end={{ x: 1, y: 0 }}
          style={floatStyles.gradient}
        >
          <Ionicons name="help-circle" size={15} color="#fff" />
          <Text style={floatStyles.label}>Questions</Text>
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
        <Drawer.Screen name="index"            options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="gameplan"         options={{ title: 'My V1 Score', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="programs"         options={{ title: 'Program Targeting', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="outreach"         options={{ title: 'Outreach', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="coaches"          options={{ title: 'Coach Tracker', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="calendar"         options={{ title: 'Calendar', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="analytics"        options={{ title: 'Analytics', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="profile"          options={{ title: 'Build Profile', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="edit-profile"     options={{ title: 'Edit Profile', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="settings"         options={{ title: 'Profile Settings', drawerItemStyle: { display: 'none' } }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const floatStyles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 999,
    borderRadius: 100,
    shadowColor: '#ff6000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingRight: 16,
    paddingLeft: 12,
    borderRadius: 100,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
