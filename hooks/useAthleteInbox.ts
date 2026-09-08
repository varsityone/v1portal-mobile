import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAthleteData } from './useAthleteData';

export interface AthleteConversationRow {
  id: string;
  coach_id: string;
  last_message_at: string;
  last_message_from: string | null;
  athlete_unread_count: number;
  coach: {
    full_name: string | null;
    school_name: string | null;
    position_coached: string | null;
    profile_photo_url: string | null;
  } | null;
}

export interface UseAthleteInboxResult {
  conversations: AthleteConversationRow[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useAthleteInbox(): UseAthleteInboxResult {
  const { athlete } = useAthleteData();
  const [conversations, setConversations] = useState<AthleteConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!athlete?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_athlete_conversations')
        .select('id, coach_id, last_message_at, last_message_from, athlete_unread_count, coach:coach_accounts(full_name, school_name, position_coached, profile_photo_url)')
        .eq('athlete_id', athlete.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations((data as unknown as AthleteConversationRow[]) ?? []);
    } catch (e) {
      console.error('Athlete inbox fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [athlete?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { conversations, loading, refresh: fetch };
}
