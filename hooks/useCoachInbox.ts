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
  preview: string | null;
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
      const rows = ((data as unknown as ConversationRow[]) ?? []).map(r => ({ ...r, preview: null as string | null }));

      // One batch query for every conversation's latest message, rather than
      // an N+1 -- coach_athlete_conversations only tracks last_message_at/from,
      // not the content, so the preview line has to come from here. Mirrors
      // useAthleteInbox.ts's identical pattern.
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
          r.preview = m ? (m.sender_type === 'coach' ? `You: ${m.content}` : m.content) : null;
        });
      }

      setConversations(rows);
    } catch (e) {
      console.error('Coach inbox fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { conversations, loading, refresh: fetch };
}
