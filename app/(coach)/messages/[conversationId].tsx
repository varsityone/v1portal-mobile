import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { ThemeColors, PINK_RED } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { EmptyState } from '../../../components/ui/EmptyState';

interface Message {
  id: string;
  sender_type: 'coach' | 'athlete';
  content: string;
  created_at: string;
  message_type?: 'text' | 'image' | 'voice';
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_duration?: number | null;
}

export default function MessageThreadScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [athleteName, setAthleteName] = useState('');
  const [athleteMeta, setAthleteMeta] = useState('');
  const [athleteId, setAthleteId] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (coachLoading || !coach?.id || !conversationId) return;

    async function load() {
      setLoading(true);
      try {
        const coachId = coach.id!;
        supabase.from('coach_accounts').update({ last_active_at: new Date().toISOString() }).eq('id', coachId);
        const { data: conv } = await supabase
          .from('coach_athlete_conversations')
          .select('id, coach_id, athlete_id')
          .eq('id', conversationId as string)
          .eq('coach_id', coachId)
          .single();

        if (!conv) { router.back(); return; }

        setAthleteId(conv.athlete_id);

        const { data: athlete } = await supabase
          .from('athletes')
          .select('full_name, position, v1_score')
          .eq('id', conv.athlete_id)
          .single();

        setAthleteName(athlete?.full_name ?? 'Unknown');
        setAthleteMeta([athlete?.position, athlete?.v1_score != null ? `V1: ${athlete.v1_score}` : null].filter(Boolean).join(' · '));

        const { data: msgs } = await supabase
          .from('coach_athlete_messages')
          .select('id, sender_type, content, created_at, message_type, attachment_url, attachment_name, attachment_duration')
          .eq('conversation_id', conversationId as string)
          .order('created_at', { ascending: true });

        setMessages((msgs as Message[]) ?? []);

        await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId as string, p_reader_type: 'coach' });
      } catch (e) {
        console.error('Load thread error:', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [coachLoading, coach?.id, conversationId]);

  const handleSend = async () => {
    if (!text.trim() || !coach?.id || !conversationId || !athleteId || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');

    try {
      const { data: msg } = await supabase.rpc('send_coach_message', {
        p_conversation_id: conversationId as string,
        p_coach_id: coach.id,
        p_athlete_id: athleteId,
        p_content: content,
      });

      if (msg) {
        setMessages(m => [...m, msg as any]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error('Send error:', e);
      setText(content);
    } finally {
      setSending(false);
    }
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={PINK_RED} size="large" /></View>;
  }

  if (!messages.length) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={28} color={C.text} />
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.headerTitle}>{athleteName}</Text>
            {athleteMeta ? <Text style={s.headerMeta}>{athleteMeta}</Text> : null}
          </View>
          <View style={{ width: 28 }} />
        </View>
        <View style={s.empty}>
          <Ionicons name="chatbubble-outline" size={44} color={C.textDim} style={{ opacity: 0.5 }} />
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptyBody}>Start the conversation by sending a message.</Text>
        </View>
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
            <Ionicons name="send" size={20} color={text.trim() ? PINK_RED : C.textDim} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>{athleteName}</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={s.messages}
        renderItem={({ item }) => {
          const isRight = item.sender_type === 'coach';
          const textStyle = isRight ? s.messageTextRight : s.messageTextLeft;
          return (
            <View style={[s.messageBubble, isRight ? s.bubbleRight : s.bubbleLeft]}>
              {item.message_type === 'image' ? (
                <Pressable onPress={() => item.attachment_url && Linking.openURL(item.attachment_url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="image" size={15} color={isRight ? '#fff' : C.text} />
                  <Text style={textStyle}>{item.attachment_name || 'Photo'}</Text>
                </Pressable>
              ) : item.message_type === 'voice' ? (
                <Pressable onPress={() => item.attachment_url && Linking.openURL(item.attachment_url)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="mic" size={15} color={isRight ? '#fff' : C.text} />
                  <Text style={textStyle}>Voice message{item.attachment_duration ? ` · ${Math.floor(item.attachment_duration)}s` : ''}</Text>
                </Pressable>
              ) : (
                <Text style={[s.messageText, textStyle]}>{item.content}</Text>
              )}
              <Text style={[s.messageTime, isRight ? s.messageTimeRight : s.messageTimeLeft]}>
                {new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
        scrollEnabled
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

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
          <Ionicons name="send" size={20} color={text.trim() ? PINK_RED : C.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
    headerTitle: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text },
    headerMeta: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 2 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text, marginTop: 16, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center' },
    messages: { paddingHorizontal: 16, paddingVertical: 12 },
    messageBubble: { marginBottom: 12, maxWidth: '85%' },
    bubbleLeft: { alignSelf: 'flex-start', backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleRight: { alignSelf: 'flex-end', backgroundColor: PINK_RED, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
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
