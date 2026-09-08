import { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Mirrors web's app/dashboard/settings/notifications/page.tsx — legacy link,
// notification preferences now live inline on the main Settings screen.
export default function NotificationsSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/settings' as any);
  }, []);
  return null;
}
