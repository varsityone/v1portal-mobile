import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// expo-notifications has no web support — guard all calls
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerForPushNotifications(session: Session): Promise<string | null> {
  // Expo push tokens only work on physical devices
  if (!Device.isDevice) {
    return null;
  }

  // Android requires an explicit notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'V1Portal',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#006AFF',
      sound: 'default',
    });
  }

  // Check existing permission, request if not yet granted
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // projectId is required for Expo push tokens (populated by `eas init`)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn('[notifications] EAS projectId is not set — push tokens require `eas init`');
    return null;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    // Persist token so the server can send pushes to this device
    const userId = session.user.id;
    await supabase
      .from('athletes')
      .update({ expo_push_token: token })
      .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`);

    return token;
  } catch (err) {
    console.error('[notifications] Failed to get push token:', err);
    return null;
  }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  seconds: number,
  data?: Record<string, unknown>,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}

// ─── Routing ──────────────────────────────────────────────────────────────────

export type NotificationScreen = '/(tabs)' | '/(tabs)/outreach' | '/(tabs)/gameplan' | '/(tabs)/profile';

export function getRouteFromNotification(
  notification: Notifications.Notification,
): NotificationScreen {
  const data = notification.request.content.data as Record<string, unknown>;
  switch (data?.screen as string | undefined) {
    case 'outreach': return '/(tabs)/outreach';
    case 'gameplan': return '/(tabs)/gameplan';
    case 'profile':  return '/(tabs)/profile';
    default:         return '/(tabs)';
  }
}

export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigate: (route: NotificationScreen) => void,
): void {
  navigate(getRouteFromNotification(response.notification));
}
