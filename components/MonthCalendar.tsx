import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { FontFamily } from '../constants/Fonts';

type Event = { id: string; title: string; event_date: string };

export function MonthCalendar({ events, onSelectDate }: {
  events: Event[];
  onSelectDate?: (date: Date, events: Event[]) => void;
}) {
  const C = useColors();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const first = month.getDay();
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((first + total) / 7) * 7;
  const now = new Date();
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 12, marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={12} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <Text accessibilityRole="header" style={{ color: C.text, fontFamily: FontFamily.bodyBold, fontSize: 17 }}>{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={12} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <Ionicons name="chevron-forward" size={22} color={C.text} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <Text key={day} style={{ width: '14.2857%', textAlign: 'center', color: C.textMuted, fontSize: 11, marginBottom: 8 }}>{day}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: cellCount }, (_, i) => {
          const day = i - first + 1;
          if (day < 1 || day > total) return <View key={i} style={{ width: '14.2857%', minHeight: 76 }} />;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daily = events.filter(event => event.event_date === iso);
          const today = date.toDateString() === now.toDateString();
          return <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${date.toLocaleDateString('en-US')}, ${daily.length} events`} onPress={() => onSelectDate?.(date, daily)} disabled={!onSelectDate} style={{ width: '14.2857%', minHeight: 76, padding: 3, borderWidth: 0.5, borderColor: C.border, backgroundColor: today ? C.surfaceAlt : 'transparent' }}>
            <Text style={{ textAlign: 'center', color: today ? C.primary : C.text, fontFamily: FontFamily.bodyBold, fontSize: 13, marginBottom: 4 }}>{day}</Text>
            {daily.slice(0, 2).map(event => <Text key={event.id} numberOfLines={1} style={{ color: C.primary, fontSize: 9, marginBottom: 2 }}>{event.title}</Text>)}
            {daily.length > 2 && <Text style={{ color: C.textMuted, fontSize: 9 }}>+{daily.length - 2} more</Text>}
          </Pressable>;
        })}
      </View>
    </View>
  );
}
