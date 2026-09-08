import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { resolveHomeRoute } from '../lib/resolveHomeRoute';
import LoadingScreen from '../components/LoadingScreen';

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session) {
      resolveHomeRoute(session.user.id).then(route => router.replace(route as any));
    } else {
      router.replace('/(auth)/login');
    }
  }, [session, loading]);

  return <LoadingScreen />;
}
