import { useSyncExternalStore } from 'react';

export type ProfileTable = 'athletes' | 'coach_accounts';
const photos = new Map<string, string | null>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function publishProfilePhoto(table: ProfileTable, id: string, url: string | null) {
  photos.set(`${table}:${id}`, url);
  listeners.forEach(listener => listener());
}

export function useProfilePhoto(table: ProfileTable, id: string | undefined, initial: string | null | undefined) {
  const key = `${table}:${id}`;
  return useSyncExternalStore(subscribe, () => photos.has(key) ? photos.get(key)! : initial ?? null,
    () => initial ?? null);
}
