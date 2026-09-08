import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { registerForPushNotifications } from '../../lib/notifications';
import CoachDrawer from '../../components/CoachDrawer';
import { useColors } from '../../context/ThemeContext';
import { useTheme } from '../../context/ThemeContext';

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

export default function CoachDrawerLayout() {
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
        onPress={() => router.push('/(coach)/help' as any)}
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
        drawerContent={CoachDrawer}
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
        <Drawer.Screen name="index"                    options={{ title: 'Dashboard' }} />
        <Drawer.Screen name="match"                    options={{ title: 'Find Athletes', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="matches"                  options={{ title: 'My Matches', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="search"                   options={{ title: 'Recruit Search', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="saved"                    options={{ title: 'Saved Prospects', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="recruiting"               options={{ title: 'Recruiting', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="recruits/[id]"            options={{ title: 'Recruit', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="pipeline"                 options={{ title: 'Pipeline', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="messages"                 options={{ title: 'Messages', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="templates"                options={{ title: 'Templates', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="bulk-message"             options={{ title: 'Bulk Message', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="calendar"                 options={{ title: 'Calendar', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="analytics"                options={{ title: 'Analytics', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="profile"                  options={{ title: 'Profile', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="settings"                 options={{ title: 'Settings', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="notifications-settings"   options={{ title: 'Notifications', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="compliance"               options={{ title: 'Compliance', drawerItemStyle: { display: 'none' } }} />
        <Drawer.Screen name="help"                     options={{ title: 'Help', drawerItemStyle: { display: 'none' } }} />
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
