// lib/preSend.ts
// Which pre-send dialog a match message gets, same rules as web's
// app/dashboard/match/[matchId]/page.tsx: contact info is warned about
// first, then the first message in an empty thread gets the nudge.
export const CONTACT_INFO_PATTERN = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

export type PreSendVariant = 'nudge' | 'warn';

export function preSendVariant(content: string, messageCount: number): PreSendVariant | null {
  if (CONTACT_INFO_PATTERN.test(content)) return 'warn';
  if (messageCount === 0) return 'nudge';
  return null;
}
