import AsyncStorage from '@react-native-async-storage/async-storage';

const FORCE_KEY = 'v1portal_coach_tour_force';
const listeners = new Set<() => void>();
const seenKey = (coachId: string, verified: boolean) =>
  `v1portal_coach_tour_seen:${coachId}:${verified ? 'dashboard' : 'verification'}`;

export async function hasSeenCoachTour(coachId: string, verified: boolean) {
  return (await AsyncStorage.getItem(seenKey(coachId, verified))) === 'true';
}
export async function markCoachTourSeen(coachId: string, verified: boolean) {
  await AsyncStorage.setItem(seenKey(coachId, verified), 'true');
}
export async function requestCoachTour() {
  await AsyncStorage.setItem(FORCE_KEY, 'true');
  listeners.forEach(listener => listener());
}
export async function consumeCoachTourRequest() {
  const requested = await AsyncStorage.getItem(FORCE_KEY);
  if (requested) await AsyncStorage.removeItem(FORCE_KEY);
  return !!requested;
}
export function subscribeCoachTourRequest(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
