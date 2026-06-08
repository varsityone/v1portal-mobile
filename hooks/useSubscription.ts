import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type Plan = 'free' | 'pro' | 'elite';

export interface SubscriptionData {
  plan: Plan;
  isPremium: boolean;
  isElite: boolean;
  loading: boolean;
}

export function useSubscription(): SubscriptionData {
  const { session } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setPlan((data?.plan as Plan) ?? 'free');
        setLoading(false);
      });
  }, [session?.user?.id]);

  return {
    plan,
    isPremium: plan === 'pro' || plan === 'elite',
    isElite: plan === 'elite',
    loading,
  };
}
