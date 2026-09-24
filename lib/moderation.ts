import { supabase } from './supabase';

// Same reasons and endpoints as web's lib/moderation.ts and /api/moderation.
export const REPORT_REASONS = [
  'Harassment or bullying',
  'Inappropriate or sexual content',
  'Spam or scam',
  'Pretending to be someone else',
  'Something else',
] as const;

export type ReportContext = 'message' | 'match_message' | 'profile';

async function post(path: string, body: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in again to continue.');
  const res = await fetch(`https://v1portal.com/api/moderation/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Something went wrong. Please try again.');
}

// targetId is coach_accounts.id when an athlete reports, athletes.id when a coach reports.
export function reportUser(targetId: string, context: ReportContext, reason: string, block: boolean) {
  return post('report', { target_id: targetId, context, reason, block });
}

export function blockUser(targetId: string) {
  return post('block', { target_id: targetId });
}
