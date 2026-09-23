import type { SupabaseClient } from '@supabase/supabase-js';

export interface BulkMessageProgress { total: number; sent: number; failed: number }
export interface BulkMessageResult { sent: number; failedIds: string[] }
const CONTACT_INFO_PATTERN = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export async function deliverBulkMessages({ db, coach, athleteIds, content, checkCompliance, onProgress }: {
  db: SupabaseClient;
  coach: { id: string; verified: boolean };
  athleteIds: string[];
  content: string;
  checkCompliance: (athleteId: string) => Promise<boolean>;
  onProgress?: (progress: BulkMessageProgress) => void;
}): Promise<BulkMessageResult> {
  if (!coach?.id || !coach.verified) throw new Error('A verified coach account is required.');
  const recipients = [...new Set(athleteIds)];
  if (!recipients.length) throw new Error('Select at least one prospect.');
  const message = content.trim();
  if (!message) throw new Error('Enter a message before sending.');
  if (CONTACT_INFO_PATTERN.test(message)) throw new Error('Remove phone numbers and email addresses before sending.');
  if (!await checkCompliance(recipients[0])) throw new Error('Messaging is not allowed during the current recruiting period.');
  const result: BulkMessageResult = { sent: 0, failedIds: [] };
  for (const athleteId of recipients) {
    try {
      const { data: existing, error: lookupError } = await db.from('coach_athlete_conversations')
        .select('id').eq('coach_id', coach.id).eq('athlete_id', athleteId).maybeSingle();
      if (lookupError) throw lookupError;
      let conversationId = existing?.id;
      if (!conversationId) {
        const { data: created, error } = await db.from('coach_athlete_conversations')
          .insert({ coach_id: coach.id, athlete_id: athleteId }).select().single();
        if (error) throw error;
        conversationId = created?.id;
      }
      if (!conversationId) throw new Error('Conversation could not be created.');
      const { error } = await db.rpc('send_coach_message', {
        p_conversation_id: conversationId, p_coach_id: coach.id,
        p_athlete_id: athleteId, p_content: message,
      });
      if (error) throw error;
      result.sent += 1;
    } catch {
      result.failedIds.push(athleteId);
    }
    onProgress?.({ total: recipients.length, sent: result.sent, failed: result.failedIds.length });
  }
  return result;
}
