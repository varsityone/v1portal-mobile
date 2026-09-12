import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useColors } from '../context/ThemeContext';

interface RecruitingPeriod {
  id: string;
  division: string;
  region: string | null;
  period_type: string;
  start_date: string;
  end_date: string;
  description: string | null;
  academic_year: string | null;
}
const DIVISIONS = ['D1_FBS', 'D1_FCS', 'D2', 'D3', 'NAIA', 'NJCAA'];
const LABELS: Record<string, string> = { D1_FBS: 'NCAA D1 FBS', D1_FCS: 'NCAA D1 FCS', D2: 'NCAA D2', D3: 'NCAA D3', NAIA: 'NAIA', NJCAA: 'NJCAA' };
const PERIODS: Record<string, { label: string; color: string }> = {
  dead: { label: 'Dead Period', color: '#ef4444' },
  quiet: { label: 'Quiet Period', color: '#f59e0b' },
  evaluation: { label: 'Evaluation Period', color: '#3b82f6' },
  contact: { label: 'Contact Period', color: '#22c55e' },
  signing: { label: 'Signing Period', color: '#8b5cf6' },
  open: { label: 'Open Recruiting', color: '#22c55e' },
};
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function CoachRecruitingDates({ division, region }: { division?: string | null; region?: string | null }) {
  const C = useColors();
  const [selected, setSelected] = useState(division || 'D1_FBS');
  const [periods, setPeriods] = useState<RecruitingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    void (async () => {
      try {
        const result = await supabase.from('recruiting_calendars')
          .select('id, division, region, period_type, start_date, end_date, description, academic_year')
          .eq('division', selected).gte('end_date', today).order('start_date', { ascending: true });
        if (result.error) throw result.error;
        if (!cancelled) setPeriods((result.data ?? []).filter(period => !period.region || !region || selected !== division || period.region === region));
      } catch {
        if (!cancelled) { setError(true); setPeriods([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, division, region, retry]);

  return (
    <View style={{ marginTop: 24, gap: 12 }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>Division Dates</Text>
      <Text style={{ color: C.textMuted, fontSize: 13 }}>Current and upcoming periods from the recruiting calendar.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {DIVISIONS.map(value => (
          <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: selected === value }} onPress={() => setSelected(value)}
            style={{ borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: selected === value ? '#E1306C' : C.surface }}>
            <Text style={{ color: selected === value ? '#fff' : C.text, fontSize: 12 }}>{LABELS[value]}</Text>
          </Pressable>
        ))}
      </View>
      {loading ? <Text style={{ color: C.textMuted }}>Loading division dates…</Text> : error ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: C.textMuted }}>Could not load division dates.</Text>
          <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={{ color: C.text }}>Try again</Text></Pressable>
        </View>
      ) : periods.length === 0 ? <Text style={{ color: C.textMuted }}>No current or upcoming dates are listed for this division.</Text> : periods.map(period => {
        const config = PERIODS[period.period_type] ?? { label: period.period_type, color: C.textMuted };
        return (
          <View key={period.id} style={{ backgroundColor: C.surface, borderRadius: 12, padding: 16, borderLeftWidth: 3, borderLeftColor: config.color, gap: 6 }}>
            <Text style={{ color: config.color, fontSize: 12, fontWeight: '700' }}>{config.label}</Text>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>{formatDate(period.start_date)} – {formatDate(period.end_date)}</Text>
            {!!period.description && <Text style={{ color: C.textMuted, fontSize: 13, lineHeight: 19 }}>{period.description}</Text>}
            {!!period.region && <Text style={{ color: C.textMuted, fontSize: 12 }}>{period.region}</Text>}
          </View>
        );
      })}
    </View>
  );
}
