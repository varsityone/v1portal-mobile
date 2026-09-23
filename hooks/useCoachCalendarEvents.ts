import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface CalendarEvent {
  id: string;
  coach_id: string;
  athlete_id: string | null;
  title: string;
  event_type: 'contact' | 'visit' | 'game' | 'quiet';
  event_date: string;
  description: string | null;
  created_at: string;
}

export interface UseCoachCalendarEventsResult {
  events: CalendarEvent[];
  loading: boolean;
  create: (title: string, type: string, date: string, athleteId: string | null, notes?: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCoachCalendarEvents(): UseCoachCalendarEventsResult {
  const { coach } = useCoachData();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coach?.id || !coach.verified) { setLoading(false); return; }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('recruiting_calendar_events')
        .select('*')
        .eq('coach_id', coach.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents((data ?? []) as CalendarEvent[]);
    } catch (e) {
      console.error('Calendar events fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, coach?.verified]);

  const create = useCallback(
    async (title: string, type: string, date: string, athleteId: string | null, notes?: string) => {
      if (!coach?.id || !coach.verified) throw new Error('A verified coach account is required.');

      try {
        const { data, error } = await supabase
          .from('recruiting_calendar_events')
          .insert([
            {
              coach_id: coach.id,
              athlete_id: athleteId,
              title,
              event_type: type,
              event_date: date,
              description: notes ?? null,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        if (data) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
      } catch (e) {
        console.error('Calendar event create error:', e);
        throw e;
      }
    },
    [coach?.id, coach?.verified],
  );

  const delete_ = useCallback(async (id: string) => {
    if (!coach?.id) throw new Error('A verified coach account is required.');
    try {
      const { data, error } = await supabase.from('recruiting_calendar_events').delete().eq('id', id).eq('coach_id', coach.id).select('id').single();
      if (error || !data) throw error ?? new Error('Event was not deleted.');
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (e) {
      console.error('Calendar event delete error:', e);
      throw e;
    }
  }, [coach?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { events, loading, create, delete: delete_, refresh: fetch };
}
