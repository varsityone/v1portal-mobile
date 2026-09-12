import LoadingScreen from '../../../components/LoadingScreen';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioPlayer, useAudioPlayerStatus, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { supabase } from '../../../lib/supabase';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { FLAME_GRADIENT, PINK_RED, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';

const PRESENCE_TOUCH_INTERVAL_MS = 60_000;
const ONLINE_WINDOW_MIN = 2;
const WAVE_PATTERN = [6, 12, 8, 16, 10, 14, 7, 11, 15, 9, 13, 6];

interface Message {
  id: string;
  sender_type: 'coach' | 'athlete';
  content: string;
  created_at: string;
  read_at: string | null;
  message_type: 'text' | 'image' | 'voice';
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_duration: number | null;
}

function initialsOf(name: string | null) {
  return (name || 'C').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function presenceLabel(lastActiveAt: string | null): string {
  if (!lastActiveAt) return '';
  const mins = (Date.now() - new Date(lastActiveAt).getTime()) / 60000;
  if (mins < ONLINE_WINDOW_MIN) return 'Online now';
  if (mins < 60) return `Active ${Math.max(1, Math.round(mins))}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `Active ${Math.round(hrs)}h ago`;
  return `Active ${Math.round(hrs / 24)}d ago`;
}

function isOnline(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false;
  return (Date.now() - new Date(lastActiveAt).getTime()) / 60000 < ONLINE_WINDOW_MIN;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function uploadAttachment(uri: string, ext: string, folder: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const path = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from('message-attachments').upload(path, blob, {
    contentType: blob.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('message-attachments').getPublicUrl(path);
  return data.publicUrl;
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
  const [coachLastActive, setCoachLastActive] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [, setPresenceTick] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const recordStartRef = useRef(0);
  const recordTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    const t = setInterval(() => setPresenceTick(v => v + 1), 30_000);
    return () => clearInterval(t);
  }, []);

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
          .select('full_name, school_name, last_active_at')
          .eq('id', conv.coach_id)
          .single();

        setCoachName(coach?.full_name ?? coach?.school_name ?? 'Coach');
        setCoachLastActive(coach?.last_active_at ?? null);

        const { data: msgs } = await supabase
          .from('coach_athlete_messages')
          .select('id, sender_type, content, created_at, read_at, message_type, attachment_url, attachment_name, attachment_duration')
          .eq('conversation_id', conversationId as string)
          .order('created_at', { ascending: true });

        setMessages((msgs as Message[]) ?? []);

        await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId as string, p_reader_type: 'athlete' });
        await supabase.from('athletes').update({ last_active_at: new Date().toISOString() }).eq('id', athleteId);
      } catch (e) {
        console.error('Load thread error:', e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [athleteLoading, athlete?.id, conversationId]);

  useEffect(() => {
    if (!athlete?.id) return;
    const t = setInterval(() => {
      supabase.from('athletes').update({ last_active_at: new Date().toISOString() }).eq('id', athlete.id);
    }, PRESENCE_TOUCH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [athlete?.id]);

  const appendAndSend = async (opts: {
    content: string;
    message_type?: 'text' | 'image' | 'voice';
    attachment_url?: string;
    attachment_name?: string;
    attachment_duration?: number;
  }) => {
    if (!athlete?.id || !coachId || !conversationId) return;
    setSending(true);
    try {
      const { data: msg, error } = await supabase.rpc('send_athlete_message', {
        p_conversation_id: conversationId as string,
        p_coach_id: coachId,
        p_athlete_id: athlete.id,
        p_content: opts.content,
        p_message_type: opts.message_type ?? 'text',
        p_attachment_url: opts.attachment_url ?? null,
        p_attachment_name: opts.attachment_name ?? null,
        p_attachment_duration: opts.attachment_duration ?? null,
      });
      if (error) throw error;
      if (msg) {
        setMessages(m => [...m, msg as Message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      console.error('Send error:', e);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    await appendAndSend({ content });
  };

  const handleAttachImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setSending(true);
    try {
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const url = await uploadAttachment(asset.uri, ext, 'images');
      await appendAndSend({ content: asset.fileName ?? 'Photo', message_type: 'image', attachment_url: url, attachment_name: asset.fileName ?? 'Photo' });
    } catch (e) {
      console.error('Image upload error:', e);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    recordStartRef.current = Date.now();
    setRecording(true);
    setRecordElapsed(0);
    recordTickRef.current = setInterval(() => {
      setRecordElapsed(Math.floor((Date.now() - recordStartRef.current) / 1000));
    }, 250);
  };

  const stopRecording = async () => {
    if (recordTickRef.current) clearInterval(recordTickRef.current);
    setRecording(false);
    const duration = (Date.now() - recordStartRef.current) / 1000;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return;
    setSending(true);
    try {
      const url = await uploadAttachment(uri, 'm4a', 'voice');
      await appendAndSend({ content: 'Voice message', message_type: 'voice', attachment_url: url, attachment_duration: duration });
    } catch (e) {
      console.error('Voice upload error:', e);
    } finally {
      setSending(false);
    }
  };

  if (athleteLoading || loading) {
    return <LoadingScreen />;
  }

  const online = isOnline(coachLastActive);
  const initials = initialsOf(coachName);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={s.headerBack}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={s.headerAvatarWrap}>
            <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerAvatar}>
              <Text style={s.headerAvatarText}>{initials}</Text>
            </LinearGradient>
            {online && <View style={s.onlineDot} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{coachName}</Text>
            <Text style={[s.headerSub, online && s.headerSubOnline]} numberOfLines={1}>{presenceLabel(coachLastActive) || ' '}</Text>
          </View>
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
            renderItem={({ item }) => <MessageRow item={item} initials={initials} C={C} s={s} />}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            placeholder={recording ? `Recording… ${formatDuration(recordElapsed)}` : 'Send a message…'}
            placeholderTextColor={C.textDim}
            value={text}
            onChangeText={setText}
            editable={!recording}
            multiline
          />
          <Pressable onPress={recording ? stopRecording : startRecording} hitSlop={8} style={[s.iconBtn, recording && s.iconBtnRecording]}>
            <Ionicons name={recording ? 'stop' : 'mic'} size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={handleAttachImage} disabled={recording} hitSlop={8} style={[s.iconBtn, recording && { opacity: 0.4 }]}>
            <Ionicons name="image" size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={handleSend} disabled={!text.trim() || sending || recording} hitSlop={8}>
            <LinearGradient
              colors={FLAME_GRADIENT}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[s.sendBtn, (!text.trim() || sending || recording) && { opacity: 0.5 }]}
            >
              <Ionicons name="send" size={17} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageRow({ item, initials, C, s }: { item: Message; initials: string; C: ThemeColors; s: ReturnType<typeof createStyles> }) {
  const isMe = item.sender_type === 'athlete';
  return (
    <View style={[s.msgRow, isMe ? s.msgRowMe : s.msgRowCoach]}>
      {!isMe && (
        <View style={s.msgAvatar}><Text style={s.msgAvatarText}>{initials}</Text></View>
      )}
      <View style={[s.msgCol, isMe && { alignItems: 'flex-end' }]}>
        {item.message_type === 'image' ? (
          <Pressable onPress={() => item.attachment_url && Linking.openURL(item.attachment_url)}>
            {isMe ? (
              <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.bubble, s.bubbleMe, s.imageBubble]}>
                <ImageBubbleContent url={item.attachment_url} name={item.attachment_name} tint="#fff" />
              </LinearGradient>
            ) : (
              <View style={[s.bubble, s.bubbleCoach, s.imageBubble]}>
                <ImageBubbleContent url={item.attachment_url} name={item.attachment_name} tint={C.text} />
              </View>
            )}
          </Pressable>
        ) : item.message_type === 'voice' ? (
          <VoiceBubble item={item} isMe={isMe} s={s} C={C} />
        ) : (
          isMe ? (
            <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.bubble, s.bubbleMe]}>
              <Text style={s.bubbleTextMe}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View style={[s.bubble, s.bubbleCoach]}>
              <Text style={s.bubbleTextCoach}>{item.content}</Text>
            </View>
          )
        )}
        <View style={s.msgFoot}>
          <Text style={s.msgTime}>{new Date(item.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
          {isMe && item.read_at && <Ionicons name="checkmark" size={12} color="#ff7a00" style={{ marginLeft: 3 }} />}
        </View>
      </View>
    </View>
  );
}

function ImageBubbleContent({ url, name, tint }: { url: string | null; name: string | null; tint: string }) {
  return (
    <>
      {url ? <Image source={{ uri: url }} style={{ width: 36, height: 36, borderRadius: 9 }} /> : null}
      <Text style={{ fontFamily: FontFamily.bodyBold, fontSize: 12.5, color: tint, flexShrink: 1 }} numberOfLines={1}>{name || 'Photo'}</Text>
    </>
  );
}

function VoiceBubble({ item, isMe, s, C }: { item: Message; isMe: boolean; s: ReturnType<typeof createStyles>; C: ThemeColors }) {
  const player = useAudioPlayer(item.attachment_url ?? undefined);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) player.pause();
    else { player.seekTo(0); player.play(); }
  };

  const waveColor = isMe ? '#fff' : C.text;

  const inner = (
    <>
      <Pressable onPress={toggle} style={[s.voicePlayBtn, isMe && s.voicePlayBtnMe]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={13} color={isMe ? '#fff' : '#18191d'} />
      </Pressable>
      <View style={s.voiceWave}>
        {WAVE_PATTERN.map((h, i) => (
          <View key={i} style={[s.voiceWaveBar, { height: h, backgroundColor: waveColor }]} />
        ))}
      </View>
      <Text style={[s.voiceDur, isMe && { color: '#fff' }]}>{formatDuration(item.attachment_duration ?? 0)}</Text>
    </>
  );

  return isMe ? (
    <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.bubble, s.bubbleMe, s.voiceBubble]}>
      {inner}
    </LinearGradient>
  ) : (
    <View style={[s.bubble, s.bubbleCoach, s.voiceBubble]}>
      {inner}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
    headerBack: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    headerAvatarWrap: { position: 'relative' },
    headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    headerAvatarText: { fontFamily: FontFamily.eyebrow, fontSize: 13, color: '#fff' },
    onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#ff7a00', borderWidth: 2, borderColor: C.background },
    headerTitle: { fontFamily: FontFamily.bodyExtraBold, fontSize: 15, color: C.text },
    headerSub: { fontFamily: FontFamily.bodySemi, fontSize: 11, color: C.textDim, marginTop: 1 },
    headerSubOnline: { color: '#ff7a00' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontFamily: FontFamily.bodyBold, fontSize: 15, color: C.text, marginTop: 16, marginBottom: 8 },
    emptyBody: { fontFamily: FontFamily.body, fontSize: 13, color: C.textDim, textAlign: 'center' },

    messages: { paddingHorizontal: 16, paddingVertical: 12 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
    msgRowMe: { justifyContent: 'flex-end' },
    msgRowCoach: { justifyContent: 'flex-start' },
    msgAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    msgAvatarText: { fontFamily: FontFamily.eyebrow, fontSize: 9, color: C.textMuted },
    msgCol: { maxWidth: '78%' },

    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
    bubbleMe: { borderBottomRightRadius: 4 },
    bubbleCoach: { backgroundColor: C.surfaceAlt, borderBottomLeftRadius: 4 },
    bubbleTextMe: { fontFamily: FontFamily.bodySemi, fontSize: 13.5, color: '#fff', lineHeight: 19 },
    bubbleTextCoach: { fontFamily: FontFamily.bodySemi, fontSize: 13.5, color: C.text, lineHeight: 19 },

    imageBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    voiceBubble: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    voicePlayBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    voicePlayBtnMe: { backgroundColor: 'rgba(255,255,255,0.22)' },
    voiceWave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 20 },
    voiceWaveBar: { width: 2.5, borderRadius: 2, opacity: 0.9 },
    voiceDur: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textMuted },

    msgFoot: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 3 },
    msgTime: { fontFamily: FontFamily.mono, fontSize: 10, color: C.textDim },

    inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    input: { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontFamily: FontFamily.body, fontSize: 14, color: C.text },
    iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceAlt },
    iconBtnRecording: { backgroundColor: '#e63535' },
    sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  });
}
