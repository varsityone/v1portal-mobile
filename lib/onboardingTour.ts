import AsyncStorage from '@react-native-async-storage/async-storage';

// Mirrors web's localStorage 'v1portal_tour_seen' flag (app/dashboard/page.tsx)
// for the auto-show-once behavior, plus a "force" flag so the drawer's
// "Dashboard Tour" button can manually replay it.
const SEEN_KEY = 'v1portal_tour_seen';
const FORCE_KEY = 'v1portal_tour_force';
const requestListeners = new Set<() => void>();

export async function hasSeenTour(): Promise<boolean> {
  return (await AsyncStorage.getItem(SEEN_KEY)) === 'true';
}

export async function markTourSeen(): Promise<void> {
  await AsyncStorage.setItem(SEEN_KEY, 'true');
}

export async function requestTour(): Promise<void> {
  await AsyncStorage.setItem(FORCE_KEY, 'true');
  requestListeners.forEach(listener => listener());
}

export async function consumeTourRequest(): Promise<boolean> {
  const v = await AsyncStorage.getItem(FORCE_KEY);
  if (v) await AsyncStorage.removeItem(FORCE_KEY);
  return !!v;
}

// A replay from the drawer must also reach an already-focused dashboard.
export function subscribeTourRequest(listener: () => void) {
  requestListeners.add(listener);
  return () => { requestListeners.delete(listener); };
}
