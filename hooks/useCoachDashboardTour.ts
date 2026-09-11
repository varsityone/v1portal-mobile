import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { TourMeasurement, TourStep } from '../components/OnboardingTour';
import { consumeCoachTourRequest, hasSeenCoachTour, markCoachTourSeen, subscribeCoachTourRequest } from '../lib/coachTour';

const DASHBOARD_STEPS: TourStep[] = [
  { target: 'welcome', title: 'Your Coach Dashboard', description: 'Start here for your program’s recruiting activity. Use View Profile to see how your program appears to athletes.' },
  { target: 'find', title: 'Find Players', description: 'Explore athletes and swipe on players who fit your program. Mutual interest creates a match.' },
  { target: 'tools', title: 'Your Recruiting Tools', description: 'Use the Recruiting Map to target states, Messages to talk with matched athletes, and Saved Prospects to revisit your shortlist.' },
  { target: 'activity', title: 'Track Your Activity', description: 'Keep an eye on your matches, players reviewed, saved prospects, and unread messages.' },
  { target: 'compliance', title: 'Recruiting Calendar', description: 'Review the displayed recruiting period and open the compliance calendar for more details before planning outreach.' },
  { target: 'matches', title: 'Your Recent Matches', description: 'New mutual matches appear here. Open a match to continue the conversation. Replay this tour anytime from the menu or Settings.' },
];
const PENDING_STEPS: TourStep[] = [
  { target: 'welcome', title: 'Welcome, Coach', description: 'This is your program’s dashboard. Open Profile + Settings in the menu to update your program information and profile photo.' },
  { target: 'verification', title: 'Activate Your Program', description: 'Check your verification status here. Confirm your school email and wait for program review to unlock recruiting tools. You’ll get the full dashboard tour after verification.' },
];

export function useCoachDashboardTour(coachId: string | undefined, verified: boolean, ready: boolean) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffset = useRef(0);
  const refs = useRef<Record<string, View | null>>({});
  const measureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const measurementVersion = useRef(0);
  const [armed, setArmed] = useState(false);
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Record<string, TourMeasurement | null | undefined>>({});

  useFocusEffect(useCallback(() => {
    if (!coachId) return;
    let cancelled = false;
    const check = async () => {
      try {
        const forced = await consumeCoachTourRequest();
        const seen = await hasSeenCoachTour(coachId, verified);
        if (!cancelled && (forced || !seen)) setArmed(true);
      } catch (error) {
        console.warn('Unable to load coach tour preferences:', error);
      }
    };
    void check();
    const unsubscribe = subscribeCoachTourRequest(() => { void check(); });
    return () => {
      cancelled = true;
      unsubscribe();
      measurementVersion.current++;
      clearTimeout(measureTimer.current);
      setArmed(false);
      setOpen(false);
    };
  }, [coachId, verified]));

  useEffect(() => {
    if (!armed || !ready) return;
    const timer = setTimeout(() => {
      setTargets({});
      setOpen(true);
      setArmed(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [armed, ready]);

  const onStepChange = useCallback((target: string) => {
    const version = ++measurementVersion.current;
    clearTimeout(measureTimer.current);
    setTargets(previous => ({ ...previous, [target]: undefined }));
    const view = refs.current[target];
    if (!view) {
      setTargets(previous => ({ ...previous, [target]: null }));
      return;
    }
    view.measureInWindow((_x, y) => {
      if (version !== measurementVersion.current) return;
      scrollRef.current?.scrollTo({ y: Math.max(0, scrollOffset.current + y - 90), animated: true });
      measureTimer.current = setTimeout(() => {
        view.measureInWindow((x, y, width, height) => {
          if (version !== measurementVersion.current) return;
          setTargets(previous => ({ ...previous, [target]: width > 0 && height > 0 ? { x, y, width, height } : null }));
        });
      }, 500);
    });
  }, []);

  const close = useCallback(() => {
    measurementVersion.current++;
    clearTimeout(measureTimer.current);
    setOpen(false);
    if (coachId) void markCoachTourSeen(coachId, verified).catch(error => {
      console.warn('Unable to save coach tour preference:', error);
    });
  }, [coachId, verified]);

  return { scrollRef, scrollOffset, refs, open, targets, onStepChange, close, steps: verified ? DASHBOARD_STEPS : PENDING_STEPS };
}
