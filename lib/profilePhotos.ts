import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

export type ProfileTable = 'athletes' | 'coach_accounts';
const photos = new Map<string, string | null>();
const listeners = new Set<() => void>();
const revisions = new Map<string, number>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function publishProfilePhoto(table: ProfileTable, id: string, url: string | null) {
  const key = `${table}:${id}`;
  revisions.set(key, (revisions.get(key) ?? 0) + 1);
  photos.set(key, url);
  listeners.forEach(listener => listener());
}

export function useProfilePhoto(table: ProfileTable, id: string | undefined, initial: string | null | undefined) {
  const key = `${table}:${id}`;
  return useSyncExternalStore(subscribe, () => photos.has(key) ? photos.get(key)! : initial ?? null,
    () => initial ?? null);
}

// Reconcile long-lived drawers with the saved profile (including edits made
// elsewhere). A slow read must never replace a more recent upload/removal.
export async function refreshProfilePhoto(table: ProfileTable, id: string): Promise<void> {
  const key = `${table}:${id}`;
  const revision = (revisions.get(key) ?? 0) + 1;
  revisions.set(key, revision);
  const { data, error } = await supabase.from(table)
    .select('profile_photo_url').eq('id', id).single();
  if (error) throw error;
  if (data && revisions.get(key) === revision) {
    publishProfilePhoto(table, id, data.profile_photo_url);
  }
}
