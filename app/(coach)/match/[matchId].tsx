import LoadingScreen from '../../../components/LoadingScreen';
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
import { useCoachData } from '../../../hooks/useCoachData';
import { useAuth } from '../../../hooks/useAuth';
import { GRADIENT, ThemeColors, PINK_RED } from '../../../constants/Colors';
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

interface AthleteParty {
  full_name: string | null;
  position: string | null;
  graduation_year: number | null;
  v1_score: number | null;
  profile_photo_url: string | null;
}

interface ComplianceResult {
  allowed: boolean;
  period: string;
  period_description: string;
  queue_until: string | null;
  message: string;
}

export default function CoachMatchThreadScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { coach } = useCoachData();
  const { session } = useAuth();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [otherParty, setOtherParty] = useState<AthleteParty | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checkingCompliance, setCheckingCompliance] = useState(false);
  const [blocked, setBlocked] = useState<{ result: ComplianceResult; content: string } | null>(null);
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${API_BASE}/api/match/message?match_id=${matchId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) setMessages(await res.json());
  }, [matchId, session?.access_token]);

  useEffect(() => {
    if (!coach?.id || !matchId) return;
    async function init() {
      const { data: matchData } = await supabase
        .from('mutual_matches')
        .select('athlete_id')
        .eq('id', matchId)
        .single();
      if (!matchData) { router.back(); return; }
      setAthleteId(matchData.athlete_id);

      const { data: athleteData } = await supabase
        .from('athletes')
        .select('full_name, position, graduation_year, v1_score, profile_photo_url')
        .eq('id', matchData.athlete_id)
        .single();
      setOtherParty(athleteData);

      await loadMessages();
      setLoading(false);
    }
    init();
  }, [coach?.id, matchId, loadMessages, router]);

  useEffect(() => {
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const sendMessage = async (content: string, queueUntil: string | null) => {
    if (!coach?.id) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/match/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          match_id: matchId,
          sender_id: coach.id,
          sender_type: 'coach',
          content,
          queue_until: queueUntil,
        }),
      });
      if (res.ok) {
        setInput('');
        setBlocked(null);
        await loadMessages();
      }
    } catch {
      // Message just won't send — user can retry.
    }
    setSending(false);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending || checkingCompliance || !coach || !athleteId) return;

    setCheckingCompliance(true);
    try {
      const res = await fetch(`${API_BASE}/api/compliance/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id: coach.id,
          division: coach.division,
          region: coach.region ?? undefined,
          action: 'message',
          athlete_id: athleteId,
        }),
      });
      const compliance: ComplianceResult = await res.json();
      if (!compliance.allowed) {
        setBlocked({ result: compliance, content });
        setInput('');
        setCheckingCompliance(false);
        return;
      }
    } catch {
      // If the compliance check itself fails, fall through and send —
      // we don't want a network blip to silently eat a coach's message.
    }
    setCheckingCompliance(false);
    await sendMessage(content, null);
  };

  if (loading) {
    return (
      <LoadingScreen />
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
            <Text style={s.headerName} numberOfLines={1}>{otherParty?.full_name}</Text>
            <Text style={s.headerSub} numberOfLines={1}>
              {otherParty?.position}{otherParty?.graduation_year ? ` · Class of ${otherParty.graduation_year}` : ''}
            </Text>
          </View>
          <View style={s.matchedBadge}>
            <Text style={s.matchedBadgeText}>MATCHED</Text>
          </View>
        </View>

        {/* Compliance block card */}
        {blocked && (
          <View style={s.complianceCard}>
            <Text style={s.complianceTitle}>Message can't send right now</Text>
            <Text style={s.complianceBody}>{blocked.result.message}</Text>
            <View style={s.complianceRow}>
              {blocked.result.queue_until && (
                <Pressable
                  style={s.complianceQueueBtn}
                  onPress={() => sendMessage(blocked.content, blocked.result.queue_until)}
                  disabled={sending}
                >
                  <Text style={s.complianceQueueText}>{sending ? 'Queuing…' : 'Queue Message'}</Text>
                </Pressable>
              )}
              <Pressable style={s.complianceCancelBtn} onPress={() => setBlocked(null)}>
                <Text style={s.complianceCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}

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
            const isMe = item.sender_id === coach?.id;
            return (
              <View style={[s.bubbleRow, isMe && { justifyContent: 'flex-end' }]}>
                <View style={isMe ? s.bubbleMeWrap : s.bubbleThemWrap}>
                  {isMe && <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
                  <Text style={[s.bubbleText, { color: isMe ? '#fff' : C.text }]}>{item.content}</Text>
                  {item.status === 'queued' && (
                    <View style={s.queuedRow}>
                      <Ionicons name="time-outline" size={10} color={isMe ? 'rgba(255,255,255,0.7)' : C.textDim} />
                      <Text style={[s.queuedText, { color: isMe ? 'rgba(255,255,255,0.7)' : C.textDim }]}>
                        Queued · sends {item.queued_until ? new Date(item.queued_until + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </Text>
                    </View>
                  )}
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
            style={[s.sendBtn, (!input.trim() || sending || checkingCompliance) && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!input.trim() || sending || checkingCompliance}
          >
            <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Ionicons name={sending || checkingCompliance ? 'time-outline' : 'send'} size={16} color="#fff" />
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

    complianceCard: { backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 10 },
    complianceTitle: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text, marginBottom: 4 },
    complianceBody: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted, lineHeight: 18, marginBottom: 12 },
    complianceRow: { flexDirection: 'row', gap: 10 },
    complianceQueueBtn: { flex: 1, backgroundColor: PINK_RED, borderRadius: 100, paddingVertical: 10, alignItems: 'center' },
    complianceQueueText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    complianceCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
    complianceCancelText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },

    messageList: { padding: 16, gap: 10, flexGrow: 1 },
    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
    emptyText: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim },
    bubbleRow: { flexDirection: 'row' },
    bubbleMeWrap: { maxWidth: '75%', borderRadius: 18, borderBottomRightRadius: 4, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 10 },
    bubbleThemWrap: { maxWidth: '75%', borderRadius: 18, borderBottomLeftRadius: 4, backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleText: { fontFamily: FontFamily.body, fontSize: 13, color: '#fff', lineHeight: 19 },
    queuedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    queuedText: { fontFamily: FontFamily.mono, fontSize: 10 },

    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 16, paddingTop: 8 },
    input: { flex: 1, backgroundColor: C.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontFamily: FontFamily.body, fontSize: 13, color: C.text, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  });
}
