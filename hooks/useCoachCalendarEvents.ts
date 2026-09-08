import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface CalendarEvent {
  id: string;
  coach_id: string;
  athlete_id: string;
  title: string;
  event_type: 'contact' | 'visit' | 'game' | 'quiet';
  event_date: string;
  notes: string | null;
  created_at: string;
}

export interface UseCoachCalendarEventsResult {
  events: CalendarEvent[];
  loading: boolean;
  create: (title: string, type: string, date: string, athleteId: string, notes?: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCoachCalendarEvents(): UseCoachCalendarEventsResult {
  const { coach } = useCoachData();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coach?.id) return;
    setLoading(true);

    try {
      const { data } = await supabase
        .from('recruiting_calendar_events')
        .select('*')
        .eq('coach_id', coach.id)
        .order('event_date', { ascending: true });

      setEvents((data ?? []) as CalendarEvent[]);
    } catch (e) {
      console.error('Calendar events fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id]);

  const create = useCallback(
    async (title: string, type: string, date: string, athleteId: string, notes?: string) => {
      if (!coach?.id) return;

      try {
        const { data } = await supabase
          .from('recruiting_calendar_events')
          .insert([
            {
              coach_id: coach.id,
              athlete_id: athleteId,
              title,
              event_type: type,
              event_date: date,
              notes: notes ?? null,
            },
          ])
          .select()
          .single();

        if (data) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
      } catch (e) {
        console.error('Calendar event create error:', e);
        throw e;
      }
    },
    [coach?.id],
  );

  const delete_ = useCallback(async (id: string) => {
    try {
      await supabase.from('recruiting_calendar_events').delete().eq('id', id);
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('Calendar event delete error:', e);
      throw e;
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { events, loading, create, delete: delete_, refresh: fetch };
}
