import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';

interface Message {
  id: string;
  sender_type: 'coach' | 'athlete';
  content: string;
  created_at: string;
}

export default function AthleteMessageThreadScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { athlete, loading: athleteLoading } = useAthleteData();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [coachId, setCoachId] = useState('');
  const [coachName, setCoachName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (athleteLoading || !athlete?.id || !conversationId) return;

    async function load() {
      setLoading(true);
      try {
        const athleteId = athlete!.id;
        const { data: conv } = await supabase
          .from('coach_athlete_conversations')
          .select('id, coach_id, athlete_id')
          .eq('id', conversationId as string)
          .eq('athlete_id', athleteId)
          .single();

        if (!conv) { router.back(); return; }

        setCoachId(conv.coach_id);

        const { data: coach } = await supabase
          .from('coach_accounts')
          .select('full_name, school_name')
          .eq('id', conv.coach_id)
          .single();

        setCoachName(coach?.full_name ?? coach?.school_name ?? 'Coach');

        const { data: msgs } = await supabase
          .from('coach_athlete_messages')
          .select('id, sender_type, content, created_at')
          .eq('conversation_id', conversationId as string)
          .order('created_at', { ascending: true });

        setMessages((msgs as Message[]) ?? []);

        await supabase
          .from('coach_athlete_conversations')
          .update({ athlete_unread_count: 0 })
          .eq('id', conversationId as string);
      } catch (e) {
        console.error('Load thread error:', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [athleteLoading, athlete?.id, conversationId]);

  const handleSend = async () => {
    if (!text.trim() || !athlete?.id || !coachId || !conversationId || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');

    try {
      const { data: msg, error } = await supabase
        .from('coach_athlete_messages')
        .insert({
          conversation_id: conversationId as string,
          coach_id: coachId,
          athlete_id: athlete.id,
          sender_type: 'athlete',
          content,
        })
        .select('id, sender_type, content, created_at')
        .single();

      if (error) throw error;

      await supabase
        .from('coach_athlete_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_from: 'athlete',
          coach_unread_count: 0,
        })
        .eq('id', conversationId as string);

      if (msg) {
        setMessages(m => [...m, msg as Message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error('Send error:', e);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  if (athleteLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>{coachName}</Text>
        <View style={{ width: 28 }} />
      </View>

      {messages.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubble-outline" size={44} color={C.textDim} style={{ opacity: 0.5 }} />
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyBody}>Start the conversation by sending a message.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.messages}
          renderItem={({ item }) => (
            <View style={[s.messageBubble, item.sender_type === 'athlete' ? s.bubbleRight : s.bubbleLeft]}>
              <Text style={[s.messageText, item.sender_type === 'athlete' ? s.messageTextRight : s.messageTextLeft]}>
                {item.content}
              </Text>
              <Text style={[s.messageTime, item.sender_type === 'athlete' ? s.messageTimeRight : s.messageTimeLeft]}>
                {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={s.inputWrap}>
        <TextInput
          style={s.input}
          placeholder="Type a message…"
          placeholderTextColor={C.textDim}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable onPress={handleSend} disabled={!text.trim() || sending} hitSlop={8}>
          <Ionicons name="send" size={20} color={text.trim() ? C.primary : C.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text, marginTop: 16, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center' },
    messages: { paddingHorizontal: 16, paddingVertical: 12 },
    messageBubble: { marginBottom: 12, maxWidth: '85%' },
    bubbleLeft: { alignSelf: 'flex-start', backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleRight: { alignSelf: 'flex-end', backgroundColor: C.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    messageText: { fontFamily: FontFamily.body, fontSize: 14 },
    messageTextLeft: { color: C.text },
    messageTextRight: { color: '#fff' },
    messageTime: { fontFamily: FontFamily.body, fontSize: 11, marginTop: 4 },
    messageTimeLeft: { color: C.textDim },
    messageTimeRight: { color: 'rgba(255,255,255,0.7)' },
    inputWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: C.border },
    input: { flex: 1, backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontFamily: FontFamily.body, fontSize: 14, color: C.text },
  });
}
