import { useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';
import { deliverBulkMessages, BulkMessageProgress, BulkMessageResult } from '../lib/bulkMessageDelivery';
export type { BulkMessageProgress, BulkMessageResult } from '../lib/bulkMessageDelivery';

export function useCoachBulkMessage() {
  const { coach } = useCoachData();
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const [progress, setProgress] = useState<BulkMessageProgress>({ total: 0, sent: 0, failed: 0 });
  const send = useCallback(async (athleteIds: string[], templateId: string, customContent: string): Promise<BulkMessageResult> => {
    if (!coach?.id || !coach.verified) throw new Error('A verified coach account is required.');
    if (busy.current) throw new Error('Messages are already being sent.');
    busy.current = true; setSending(true);
    setProgress({ total: new Set(athleteIds).size, sent: 0, failed: 0 });
    try {
      let content = customContent.trim();
      if (!content && templateId) {
        const { data, error } = await supabase.from('coach_message_templates').select('content').eq('id', templateId).eq('coach_id', coach.id).single();
        if (error) throw error;
        content = data?.content ?? '';
      }
      return await deliverBulkMessages({ db: supabase, coach: { id: coach.id, verified: !!coach.verified }, athleteIds, content, onProgress: setProgress,
        checkCompliance: async athleteId => {
          const response = await fetch('https://v1portal.com/api/compliance/check', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ coach_id: coach.id, division: coach.division, region: coach.region, action: 'message', athlete_id: athleteId }),
          });
          if (!response.ok) throw new Error('Could not check the recruiting contact period. Please try again.');
          return (await response.json()).allowed === true;
        },
      });
    } finally { busy.current = false; setSending(false); }
  }, [coach]);
  return { sending, progress, send };
}
