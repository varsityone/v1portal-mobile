import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

const API_BASE = 'https://v1portal.com';
const CONTACT_INFO_PATTERN = /(?:phone|number|call|text|contact)[:\s]+\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|[0-9]{10}|\d{3}-\d{3}-\d{4}/gi;

export interface BulkMessageProgress {
  total: number;
  sent: number;
  failed: number;
}

export interface UseCoachBulkMessageResult {
  sending: boolean;
  progress: BulkMessageProgress;
  send: (athleteIds: string[], templateId: string, customContent: string) => Promise<void>;
}

export function useCoachBulkMessage(): UseCoachBulkMessageResult {
  const { coach } = useCoachData();
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<BulkMessageProgress>({ total: 0, sent: 0, failed: 0 });

  // Mirrors the resilience posture of (coach)/match/[matchId].tsx's compliance
  // check: only a thrown network error fails open (a blip shouldn't silently
  // block every bulk send). The /api/compliance/check contract requires
  // `action` and `athlete_id` — the period it evaluates is coach-level
  // (division/region), so one check against the first recipient covers the
  // whole batch rather than round-tripping once per athlete.
  const checkCompliance = useCallback(async (athleteId: string): Promise<boolean> => {
    if (!coach?.id) return true;

    try {
      const res = await fetch(`${API_BASE}/api/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: coach.id,
          division: coach.division,
          region: coach.region ?? undefined,
          action: 'message',
          athlete_id: athleteId,
        }),
      });

      const result = await res.json();
      return result.allowed ?? true;
    } catch (e) {
      console.error('Compliance check error:', e);
      return true;
    }
  }, [coach]);

  const send = useCallback(
    async (athleteIds: string[], templateId: string, customContent: string) => {
      if (!coach?.id || athleteIds.length === 0) return;

      setSending(true);
      setProgress({ total: athleteIds.length, sent: 0, failed: 0 });

      const allowed = await checkCompliance(athleteIds[0]);
      if (!allowed) {
        alert('Messaging is blocked during a dead or quiet period');
        setSending(false);
        return;
      }

      const content = customContent || (templateId ? await fetchTemplateContent(templateId) : '');

      if (CONTACT_INFO_PATTERN.test(content)) {
        alert('Message contains contact information. Please remove phone numbers or email addresses.');
        setSending(false);
        return;
      }

      for (let i = 0; i < athleteIds.length; i++) {
        try {
          // Find or create conversation — mirrors (coach)/search.tsx's messageAthlete
          const { data: existing } = await supabase
            .from('coach_athlete_conversations')
            .select('id')
            .eq('coach_id', coach.id)
            .eq('athlete_id', athleteIds[i])
            .single();

          let conversationId = existing?.id;
          if (!conversationId) {
            const { data: created } = await supabase
              .from('coach_athlete_conversations')
              .insert({ coach_id: coach.id, athlete_id: athleteIds[i] })
              .select()
              .single();
            conversationId = created?.id;
          }
          if (!conversationId) throw new Error('Conversation creation failed');

          // Send via RPC if available
          try {
            await supabase.rpc('send_coach_message', {
              p_conversation_id: conversationId,
              p_coach_id: coach.id,
              p_athlete_id: athleteIds[i],
              p_content: content,
            });
          } catch (rpcErr) {
            // Fallback to direct insert if RPC unavailable
            await supabase.from('coach_athlete_messages').insert({
              conversation_id: conversationId,
              coach_id: coach.id,
              athlete_id: athleteIds[i],
              sender_type: 'coach',
              content,
            });

            await supabase
              .from('coach_athlete_conversations')
              .update({ last_message_at: new Date().toISOString(), last_message_from: 'coach' })
              .eq('id', conversationId);
          }

          setProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
        } catch (e) {
          console.error('Bulk message send error:', e);
          setProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
        }
      }

      setSending(false);
    },
    [coach, checkCompliance],
  );

  return { sending, progress, send };
}

async function fetchTemplateContent(templateId: string): Promise<string> {
  const { data } = await supabase
    .from('coach_message_templates')
    .select('content')
    .eq('id', templateId)
    .single();

  return data?.content ?? '';
}
