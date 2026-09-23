import type { SupabaseClient } from '@supabase/supabase-js';

export const GAMEPLAN_REQUIRED = ['full_name', 'phone', 'bio', 'position', 'graduation_year', 'height', 'weight', 'high_school', 'city', 'gpa', 'ncaa_id', 'hudl_link', 'guardian_name', 'guardian_relationship', 'guardian_phone', 'guardian_email'] as const;
export function gameplanCompletion(fields: Record<string, string>, testsNotTaken: boolean) {
  const hasTestStatus = testsNotTaken || !!(fields.sat_score?.trim() || fields.act_score?.trim());
  const count = GAMEPLAN_REQUIRED.filter(key => !!fields[key]?.trim()).length + Number(hasTestStatus);
  const total = GAMEPLAN_REQUIRED.length + 1;
  return { count, total, complete: count === total, hasTestStatus };
}
export async function saveGameplanProfile(db: SupabaseClient, athleteId: string, fields: Record<string, string>, testsNotTaken: boolean) {
  const updates: Record<string, string | number | boolean | null> = { test_scores_not_taken: testsNotTaken };
  for (const [key, value] of Object.entries(fields)) updates[key] = value.trim() || null;
  for (const key of ['gpa', 'sat_score', 'act_score', 'graduation_year']) {
    if (updates[key] !== null) {
      const number = Number(updates[key]);
      if (!Number.isFinite(number)) throw new Error(`${key.replace(/_/g, ' ')} must be a number.`);
      updates[key] = number;
    }
  }
  if (testsNotTaken) { updates.sat_score = null; updates.act_score = null; }
  const { data, error } = await db.from('athletes').update(updates).eq('id', athleteId).select('id').single();
  if (error) throw error;
  if (!data) throw new Error('Your profile was not saved. Please retry.');
  return data;
}
