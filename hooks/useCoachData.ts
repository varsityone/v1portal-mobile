import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface Coach {
  id: string;
  user_id: string;
  full_name: string | null;
  school_name: string | null;
  school_email: string | null;
  title: string | null;
  division: string | null;
  region: string | null;
  verified: boolean | null;
  verified_at: string | null;
  email_verified: boolean | null;
  needs_review: boolean | null;
  position_coached: string | null;
  position_needs: string[] | null;
  level_bands: string[] | null;
  min_score: number | null;
  bio: string | null;
  profile_photo_url: string | null;
  phone: string | null;
  phone_public: boolean | null;
  twitter: string | null;
  years_coaching: number | null;
  previous_stops: string | null;
  program_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoachData {
  coach: Coach | null;
  loading: boolean;
  isSetupComplete: boolean;
  refresh: () => Promise<Coach | null>;
}

export function useCoachData(): CoachData {
  const { session } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (): Promise<Coach | null> => {
    if (!session?.user) return null;
    setLoading(true);

    const { data } = await supabase
      .from('coach_accounts')
      .select('id, user_id, full_name, school_name, school_email, title, division, region, verified, verified_at, email_verified, needs_review, position_coached, position_needs, level_bands, min_score, bio, profile_photo_url, phone, phone_public, twitter, years_coaching, previous_stops, program_id, created_at, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    setCoach((data as Coach) ?? null);
    setLoading(false);
    return (data as Coach) ?? null;
  }, [session?.user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    coach,
    loading,
    isSetupComplete: !!coach?.position_coached,
    refresh: fetchData,
  };
}
