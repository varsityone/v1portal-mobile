import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface SubscriptionData {
  hasActiveSubscription: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionData {
  const { session } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setHasActiveSubscription(false);
      setLoading(false);
      return;
    }

    const userId = session.user.id;

    supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data: sub }) => {
        if (sub?.plan) {
          setHasActiveSubscription(true);
          setLoading(false);
          return;
        }

        supabase
          .from('athletes')
          .select('subscription_status')
          .or(`user_id.eq.${userId},linked_user_id.eq.${userId}`)
          .maybeSingle()
          .then(({ data: ath }) => {
            setHasActiveSubscription(ath?.subscription_status === 'active');
            setLoading(false);
          });
      });
  }, [session?.user?.id]);

  return { hasActiveSubscription, loading };
}
