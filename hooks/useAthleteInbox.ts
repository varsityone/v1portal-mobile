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
    division: string | null;
    profile_photo_url: string | null;
  } | null;
  preview: string | null;
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
        .select('id, coach_id, last_message_at, last_message_from, athlete_unread_count, coach:coach_accounts(full_name, school_name, position_coached, division, profile_photo_url)')
        .eq('athlete_id', athlete.id)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      const rows = ((data as unknown as AthleteConversationRow[]) ?? []).map(r => ({ ...r, preview: null as string | null }));

      // One batch query for every conversation's latest message, rather than
      // an N+1 — coach_athlete_conversations only tracks last_message_at/from,
      // not the content, so the preview line has to come from here.
      const ids = rows.map(r => r.id);
      if (ids.length > 0) {
        const { data: msgRows } = await supabase
          .from('coach_athlete_messages')
          .select('conversation_id, sender_type, content, created_at')
          .in('conversation_id', ids)
          .order('created_at', { ascending: false });

        const latestByConv = new Map<string, { sender_type: string; content: string }>();
        (msgRows ?? []).forEach((m: any) => {
          if (!latestByConv.has(m.conversation_id)) latestByConv.set(m.conversation_id, m);
        });
        rows.forEach(r => {
          const m = latestByConv.get(r.id);
          r.preview = m ? (m.sender_type === 'athlete' ? `You: ${m.content}` : m.content) : null;
        });
      }

      setConversations(rows);
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
