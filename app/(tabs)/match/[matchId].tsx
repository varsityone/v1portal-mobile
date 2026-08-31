import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { useAuth } from '../../../hooks/useAuth';
import { GRADIENT, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';

const API_BASE = 'https://v1portal.com';

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'athlete' | 'coach';
  content: string;
  status: 'sent' | 'queued' | 'blocked';
  queued_until: string | null;
  created_at: string;
}

interface CoachParty {
  full_name: string | null;
  school_name: string | null;
  division: string | null;
  position_coached: string | null;
  profile_photo_url: string | null;
}

export default function MatchThreadScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { athlete } = useAthleteData();
  const { session } = useAuth();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [otherParty, setOtherParty] = useState<CoachParty | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${API_BASE}/api/match/message?match_id=${matchId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setMessages(await res.json());
  }, [matchId, session?.access_token]);

  useEffect(() => {
    if (!athlete?.id || !matchId) return;
    async function init() {
      const { data: matchData } = await supabase
        .from('mutual_matches')
        .select('coach_id')
        .eq('id', matchId)
        .single();
      if (!matchData) { router.back(); return; }

      const { data: coachData } = await supabase
        .from('coach_accounts')
        .select('full_name, school_name, division, position_coached, profile_photo_url')
        .eq('id', matchData.coach_id)
        .single();
      setOtherParty(coachData);

      await loadMessages();
      setLoading(false);
    }
    init();
  }, [athlete?.id, matchId, loadMessages, router]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending || !athlete?.id) return;
    setSending(true);
    setInput('');
    try {
      const res = await fetch(`${API_BASE}/api/match/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          match_id: matchId,
          sender_id: athlete.id,
          sender_type: 'athlete',
          content,
          queue_until: null,
        }),
      });
      if (res.ok) await loadMessages();
    } catch {
      // Message just won't send — user can retry.
    }
    setSending(false);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <Ionicons name="chatbubble-outline" size={26} color={C.textDim} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.root}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </Pressable>
          {otherParty?.profile_photo_url ? (
            <Image source={{ uri: otherParty.profile_photo_url }} style={s.avatar} />
          ) : (
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerName} numberOfLines={1}>{otherParty?.school_name}</Text>
            <Text style={s.headerSub} numberOfLines={1}>{otherParty?.division} · {otherParty?.position_coached}</Text>
          </View>
          <View style={s.matchedBadge}>
            <Text style={s.matchedBadgeText}>MATCHED</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No messages yet. Say something.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === athlete?.id;
            return (
              <View style={[s.bubbleRow, isMe && { justifyContent: 'flex-end' }]}>
                <View style={isMe ? s.bubbleMeWrap : s.bubbleThemWrap}>
                  {isMe && <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                  <Text style={[s.bubbleText, { color: isMe ? '#fff' : C.text }]}>{item.content}</Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input */}
        <View style={s.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={C.textDim}
            style={s.input}
            multiline
          />
          <Pressable
            style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name={sending ? 'time-outline' : 'send'} size={16} color="#fff" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 20 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    headerName: { fontFamily: FontFamily.headline, fontSize: 16, color: C.text },
    headerSub: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 1 },
    matchedBadge: { backgroundColor: 'rgba(113,255,126,0.14)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
    matchedBadgeText: { fontFamily: FontFamily.mono, fontSize: 9, color: C.success, letterSpacing: 0.5 },

    messageList: { padding: 16, gap: 10, flexGrow: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim },
    bubbleRow: { flexDirection: 'row' },
    bubbleMeWrap: { maxWidth: '75%', borderRadius: 18, borderBottomRightRadius: 4, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10 },
    bubbleThemWrap: { maxWidth: '75%', borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleText: { fontFamily: FontFamily.body, fontSize: 13, color: '#fff', lineHeight: 19 },

    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 16, paddingTop: 8 },
    input: { flex: 1, backgroundColor: C.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontFamily: FontFamily.body, fontSize: 13, color: C.text, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  });
}
