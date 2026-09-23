import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCoachData } from './useCoachData';

export interface MessageTemplate {
  id: string;
  coach_id: string;
  title: string;
  category: string;
  content: string;
  created_at: string;
}

export interface UseCoachTemplatesResult {
  templates: MessageTemplate[];
  loading: boolean;
  create: (title: string, category: string, content: string) => Promise<void>;
  update: (id: string, title: string, category: string, content: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCoachTemplates(): UseCoachTemplatesResult {
  const { coach } = useCoachData();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!coach?.id || !coach.verified) { setLoading(false); return; }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('coach_message_templates')
        .select('*')
        .eq('coach_id', coach.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data ?? []) as MessageTemplate[]);
    } catch (e) {
      console.error('Templates fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [coach?.id, coach?.verified]);

  const create = useCallback(
    async (title: string, category: string, content: string) => {
      if (!coach?.id || !coach.verified) throw new Error('A verified coach account is required.');

      try {
        const { data, error } = await supabase
          .from('coach_message_templates')
          .insert([{ coach_id: coach.id, title, category, content }])
          .select()
          .single();

        if (error) throw error;
        if (data) setTemplates(prev => [data, ...prev]);
      } catch (e) {
        console.error('Template create error:', e);
        throw e;
      }
    },
    [coach?.id, coach?.verified],
  );

  const update = useCallback(async (id: string, title: string, category: string, content: string) => {
    try {
      const { error } = await supabase
        .from('coach_message_templates')
        .update({ title, category, content })
        .eq('id', id);

      if (error) throw error;
      setTemplates(prev => prev.map(t => (t.id === id ? { ...t, title, category, content } : t)));
    } catch (e) {
      console.error('Template update error:', e);
      throw e;
    }
  }, []);

  const delete_ = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('coach_message_templates').delete().eq('id', id);
      if (error) throw error;
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error('Template delete error:', e);
      throw e;
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { templates, loading, create, update, delete: delete_, refresh: fetch };
}
