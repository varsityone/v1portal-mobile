import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface ConversationRow {
  id: string;
  athlete_id: string;
  last_message_at: string;
  last_message_from: string | null;
  coach_unread_count: number;
  athlete: {
    full_name: string | null;
    position: string | null;
    v1_score: number | null;
    profile_photo_url: string | null;
  } | null;
}

export interface UseCoachInboxResult {
  conversations: ConversationRow[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useCoachInbox(): UseCoachInboxResult {
  const { coach } = useCoachData();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_athlete_conversations')
        .select('id, athlete_id, last_message_at, last_message_from, coach_unread_count, athlete:athletes(full_name, position, v1_score, profile_photo_url)')
        .eq('coach_id', coach.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations((data as ConversationRow[]) ?? []);
    } catch (e) {
      console.error('Inbox fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { conversations, loading, refresh: fetch };
}
