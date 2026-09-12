import { DEFAULT_PROFILE_IMAGE } from '../constants/ProfileImage';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { ProfileTable, publishProfilePhoto, useProfilePhoto } from '../lib/profilePhotos';
import { useColors } from '../context/ThemeContext';

export default function ProfilePhotoEditor({ table, profileId, photoUrl }: {
  table: ProfileTable;
  profileId: string;
  photoUrl?: string | null;
}) {
  const C = useColors();
  const uri = useProfilePhoto(table, profileId, photoUrl);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function savePhoto(url: string | null) {
    const { error } = await supabase.from(table).update({ profile_photo_url: url })
      .eq('id', profileId).select('id').single();
    if (error) throw error;
    publishProfilePhoto(table, profileId, url);
    setMessage(url ? 'Photo saved.' : 'Photo removed.');
  }

  async function changePhoto(remove = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      if (remove) {
        await savePhoto(null);
        return;
      }
      // Launch directly from the press so the web file picker retains user activation.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: Platform.OS !== 'web', aspect: [1, 1], quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const bytes = await response.arrayBuffer();
      const mime = asset.mimeType ?? response.headers.get('content-type') ?? 'image/jpeg';
      const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
      const ext = extensions[mime];
      if (!ext) throw new Error('Please choose a JPG, PNG, or WebP photo.');
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('Please choose a photo smaller than 5 MB.');
      if (!bytes.byteLength) throw new Error('This photo could not be read. Please choose another.');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in again to update your photo.');
      const folder = table === 'coach_accounts' ? 'coach-photos' : 'profile-photos';
      const path = `${folder}/${session.user.id}-${Date.now()}.${ext}`;
      const bucket = supabase.storage.from('athletes');
      const { error } = await bucket.upload(path, bytes, { contentType: mime, upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = bucket.getPublicUrl(path);
      try {
        await savePhoto(publicUrl);
      } catch (error) {
        // Only clean up the new upload if saving the profile failed.
        await bucket.remove([path]).catch(() => {});
        throw error;
      }
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'Could not update your photo. Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ padding: 16, marginBottom: 20, borderRadius: 16, backgroundColor: C.surface }}>
      <Text style={{ color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Profile photo</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" disabled={busy} onPress={() => void changePhoto()}>
          <Image source={uri ? { uri } : DEFAULT_PROFILE_IMAGE} style={{ width: 76, height: 76, borderRadius: 38 }} />
        </Pressable>
        <View style={{ flex: 1, gap: 10 }}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void changePhoto()}
            style={{ backgroundColor: '#E1306C', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', opacity: busy ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>{uri ? 'Change photo' : 'Upload photo'}</Text>}
          </Pressable>
          {!!uri && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void changePhoto(true)} style={{ padding: 6 }}>
            <Text style={{ color: C.textMuted, textAlign: 'center' }}>Remove photo</Text>
          </Pressable>}
        </View>
      </View>
      <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 12 }}>JPG, PNG, or WebP · Up to 5 MB. Photos save immediately.</Text>
      {!!message && <Text accessibilityLiveRegion="polite" style={{ color: failed ? '#ff4444' : C.text, marginTop: 8 }}>{message}</Text>}
    </View>
  );
}
