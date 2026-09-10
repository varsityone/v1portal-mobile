import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { floorFromLevels, POSITIONS, RECRUITING_LEVEL_BANDS } from '../../../lib/recruitingLevels';
import { FLAME_GRADIENT, PINK_RED, ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';

const PHOTO_BUCKET = 'athletes';

const TITLES = [
  'Head Coach', 'Offensive Coordinator', 'Defensive Coordinator', 'Special Teams Coordinator',
  'Recruiting Coordinator', 'Offensive Line Coach', 'Defensive Line Coach', 'Quarterback Coach',
  'Wide Receivers Coach', 'Running Backs Coach', 'Tight Ends Coach', 'Linebackers Coach',
  'Defensive Backs Coach', 'Safeties Coach', 'Position Coach', 'Assistant Coach', 'Graduate Assistant',
];

const DIVISIONS = [
  { value: 'D1_FBS', label: 'NCAA D1 FBS' },
  { value: 'D1_FCS', label: 'NCAA D1 FCS' },
  { value: 'D2', label: 'NCAA D2' },
  { value: 'D3', label: 'NCAA D3' },
  { value: 'NAIA', label: 'NAIA' },
  { value: 'NJCAA', label: 'NJCAA' },
];

const NJCAA_REGIONS = ['Region I', 'Region II', 'Region III', 'Region IV', 'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X', 'Region XI', 'Region XII'];

export default function CoachProfileEditScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const router = useRouter();
  const { coach, loading } = useCoachData();

  const [formData, setFormData] = useState<any>({
    title: '',
    full_name: '',
    school_name: '',
    school_email: '',
    phone: '',
    phone_public: false,
    division: '',
    region: null,
    position_needs: [],
    level_bands: [],
    years_coaching: 0,
    previous_stops: '',
    bio: '',
    message_to_recruits: '',
    twitter: '',
    profile_photo_url: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [showTitleMenu, setShowTitleMenu] = useState(false);
  const [showDivisionMenu, setShowDivisionMenu] = useState(false);
  const [showRegionMenu, setShowRegionMenu] = useState(false);

  useEffect(() => {
    if (coach) {
      setFormData({
        title: coach.title || '',
        full_name: coach.full_name || '',
        school_name: coach.school_name || '',
        school_email: coach.school_email || '',
        phone: coach.phone || '',
        phone_public: coach.phone_public || false,
        division: coach.division || '',
        region: coach.region || null,
        position_needs: coach.position_needs || [],
        level_bands: coach.level_bands || [],
        years_coaching: coach.years_coaching || 0,
        previous_stops: coach.previous_stops || '',
        bio: coach.bio || '',
        message_to_recruits: coach.message_to_recruits || '',
        twitter: coach.twitter || '',
        profile_photo_url: coach.profile_photo_url || '',
      });
    }
  }, [coach]);

  const handlePickPhoto = async () => {
    if (!coach?.id || !coach?.user_id) return;
    setPhotoError('');

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPhotoError('Photo library access is required to upload a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploadingPhoto(true);
    try {
      const fileExt = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `coach-photos/${coach.user_id}-${Date.now()}.${fileExt}`;
      const arrayBuffer = await fetch(asset.uri).then(res => res.arrayBuffer());

      const { error: storageError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        });
      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('coach_accounts').update({ profile_photo_url: publicUrl }).eq('id', coach.id);
      if (dbError) throw dbError;

      setFormData((prev: any) => ({ ...prev, profile_photo_url: publicUrl }));
    } catch (e: any) {
      setPhotoError(e?.message ?? 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!coach?.id) return;
    setPhotoError('');
    try {
      await supabase.from('coach_accounts').update({ profile_photo_url: null }).eq('id', coach.id);
      setFormData((prev: any) => ({ ...prev, profile_photo_url: '' }));
    } catch (e: any) {
      setPhotoError(e?.message ?? 'Failed to remove photo.');
    }
  };

  const handleSave = async () => {
    if (!coach?.id) return;
    setSaving(true);
    try {
      const minScore = floorFromLevels(formData.level_bands);
      const data = {
        title: formData.title,
        full_name: formData.full_name,
        school_name: formData.school_name,
        school_email: formData.school_email,
        phone: formData.phone,
        phone_public: formData.phone_public,
        division: formData.division,
        region: formData.division !== 'NJCAA' ? null : formData.region,
        position_needs: formData.position_needs,
        level_bands: formData.level_bands,
        min_score: minScore,
        years_coaching: formData.years_coaching,
        previous_stops: formData.previous_stops,
        bio: formData.bio,
        message_to_recruits: formData.message_to_recruits,
        twitter: formData.twitter,
      };

      await supabase.from('coach_accounts').update(data).eq('id', coach.id);
      router.back();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={PINK_RED} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.eyebrow}>COACH PROFILE</Text>
          <Text style={s.headerTitle}>Edit Profile</Text>
        </View>
        <Pressable onPress={() => router.push('/(coach)/profile' as any)} hitSlop={10} style={{ width: 36, alignItems: 'flex-end' }}>
          <Ionicons name="eye-outline" size={20} color={C.textMuted} />
        </Pressable>
      </View>

      {/* Gradient accent bar */}
      <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.accentBar} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>Update your program information. This is what athletes see when they swipe.</Text>

        {/* Personal Info */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="person" size={14} color="#fff" />
            <Text style={s.sectionTitle}>PERSONAL INFORMATION</Text>
          </View>
          <View style={s.card}>
            <View style={[s.fieldRow, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
              {formData.profile_photo_url ? (
                <Image source={{ uri: formData.profile_photo_url }} style={s.photo} />
              ) : (
                <View style={[s.photo, s.photoPlaceholder]}>
                  <Ionicons name="person" size={28} color={C.textDim} />
                </View>
              )}
              {uploadingPhoto && (
                <View style={s.photoOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
              <View style={s.photoActions}>
                <Pressable style={s.photoBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
                  <Text style={s.photoBtnText}>{uploadingPhoto ? 'Uploading...' : 'Upload Photo'}</Text>
                </Pressable>
                {!!formData.profile_photo_url && (
                  <Pressable style={s.photoRemoveBtn} onPress={handleRemovePhoto} disabled={uploadingPhoto}>
                    <Text style={s.photoRemoveBtnText}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>
            {!!photoError && <Text style={[s.hint, { color: '#ff4444', paddingHorizontal: 16 }]}>{photoError}</Text>}

            <FieldInput label="Full Name" value={formData.full_name} onChangeText={v => setFormData({ ...formData, full_name: v })} C={C} bordered />
            <FieldSelect
              label="Title"
              value={formData.title}
              options={TITLES}
              onSelect={v => setFormData({ ...formData, title: v })}
              open={showTitleMenu}
              setOpen={setShowTitleMenu}
              C={C}
              bordered
            />
          </View>
        </View>

        {/* School Info */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="school" size={14} color="#fff" />
            <Text style={s.sectionTitle}>SCHOOL INFORMATION</Text>
          </View>
          <View style={s.card}>
            <FieldInput label="School Name" value={formData.school_name} onChangeText={v => setFormData({ ...formData, school_name: v })} C={C} />
            <FieldInput label="School Email" value={formData.school_email} onChangeText={v => setFormData({ ...formData, school_email: v })} C={C} bordered />
            <FieldInput label="Phone" value={formData.phone} onChangeText={v => setFormData({ ...formData, phone: v })} C={C} bordered />
            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Pressable style={s.checkboxRow} onPress={() => setFormData({ ...formData, phone_public: !formData.phone_public })}>
                <View style={[s.checkbox, formData.phone_public && s.checkboxChecked]}>
                  {formData.phone_public && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <Text style={s.checkboxLabel}>Show my phone number to athletes on my public profile</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Division & Region */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="git-network" size={14} color="#fff" />
            <Text style={s.sectionTitle}>DIVISION & REGION</Text>
          </View>
          <View style={s.card}>
            <FieldSelect
              label="Division"
              value={DIVISIONS.find(d => d.value === formData.division)?.label || ''}
              options={DIVISIONS.map(d => d.label)}
              onSelect={v => {
                const div = DIVISIONS.find(d => d.label === v)?.value || '';
                setFormData({ ...formData, division: div, region: null });
              }}
              open={showDivisionMenu}
              setOpen={setShowDivisionMenu}
              C={C}
            />
            {formData.division === 'NJCAA' && (
              <FieldSelect
                label="Region"
                value={formData.region || ''}
                options={NJCAA_REGIONS}
                onSelect={v => setFormData({ ...formData, region: v })}
                open={showRegionMenu}
                setOpen={setShowRegionMenu}
                C={C}
                bordered
              />
            )}
          </View>
        </View>

        {/* Recruiting Focus */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="football" size={14} color="#fff" />
            <Text style={s.sectionTitle}>RECRUITING FOCUS</Text>
          </View>
          <Text style={s.sectionSub}>What positions do you coach and recruit, and what athlete level are you targeting?</Text>
          <View style={s.card}>
            <View style={s.fieldRow}>
              <Text style={s.label}>Positions You're Recruiting</Text>
              <View style={s.chipWrap}>
                {POSITIONS.map(pos => (
                  <Pressable
                    key={pos}
                    style={[s.chip, formData.position_needs.includes(pos) && s.chipActive]}
                    onPress={() => {
                      const next = formData.position_needs.includes(pos)
                        ? formData.position_needs.filter((p: string) => p !== pos)
                        : [...formData.position_needs, pos];
                      setFormData({ ...formData, position_needs: next });
                    }}
                  >
                    <Text style={[s.chipText, formData.position_needs.includes(pos) && s.chipTextActive]}>{pos}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={[s.fieldRow, s.fieldRowBorder]}>
              <Text style={s.label}>Athlete Level</Text>
              <View style={s.chipWrap}>
                {RECRUITING_LEVEL_BANDS.map(band => (
                  <Pressable
                    key={band.level}
                    style={[s.chip, formData.level_bands.includes(band.level) && s.chipActive]}
                    onPress={() => {
                      const next = formData.level_bands.includes(band.level)
                        ? formData.level_bands.filter((l: string) => l !== band.level)
                        : [...formData.level_bands, band.level];
                      setFormData({ ...formData, level_bands: next });
                    }}
                  >
                    <Text style={[s.chipText, formData.level_bands.includes(band.level) && s.chipTextActive]}>
                      {band.level}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Coaching History */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="ribbon" size={14} color="#fff" />
            <Text style={s.sectionTitle}>COACHING HISTORY</Text>
          </View>
          <View style={s.card}>
            <FieldInput label="Years Coaching" value={String(formData.years_coaching)} onChangeText={v => setFormData({ ...formData, years_coaching: Number(v) })} keyboardType="numeric" C={C} />
            <FieldInput label="Previous Stops" value={formData.previous_stops} onChangeText={v => setFormData({ ...formData, previous_stops: v })} multiline C={C} bordered />
            <FieldInput label="Bio" value={formData.bio} onChangeText={v => setFormData({ ...formData, bio: v })} multiline C={C} bordered />
          </View>
        </View>

        {/* Messaging */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHeader}>
            <Ionicons name="megaphone" size={14} color="#fff" />
            <Text style={s.sectionTitle}>MESSAGING</Text>
          </View>
          <View style={s.card}>
            <FieldInput label="Message to Recruits" value={formData.message_to_recruits} onChangeText={v => setFormData({ ...formData, message_to_recruits: v })} multiline C={C} />
            <FieldInput label="Twitter" value={formData.twitter} onChangeText={v => setFormData({ ...formData, twitter: v })} placeholder="@handle" C={C} bordered />
          </View>
        </View>

        {/* Save CTA */}
        <Pressable onPress={handleSave} disabled={saving} style={s.saveBtnWrap}>
          <LinearGradient colors={FLAME_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.saveBtn, saving && { opacity: 0.6 }]}>
            <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Profile'}</Text>
          </LinearGradient>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FieldInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: string;
  bordered?: boolean;
  C: any;
}

interface FieldSelectProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  bordered?: boolean;
  C: any;
}

function FieldInput({ label, value, onChangeText, placeholder, multiline, keyboardType, bordered, C }: FieldInputProps) {
  const s = useMemo(() => createStyles(C), [C]);
  const filled = !!value;
  return (
    <View style={[s.fieldRow, bordered && s.fieldRowBorder]}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputWrap}>
        <TextInput
          style={[s.input, s.inputBoxed, multiline && s.inputMulti, filled && s.inputFilled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor="#9a9a9a"
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'auto'}
          keyboardType={keyboardType as any}
        />
        {filled && <Ionicons name="checkmark-circle" size={16} color={C.success} style={s.fieldCheck} />}
      </View>
    </View>
  );
}

function FieldSelect({ label, value, options, onSelect, open, setOpen, bordered, C }: FieldSelectProps) {
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={[s.fieldRow, bordered && s.fieldRowBorder]}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={[s.input, s.inputBoxed, s.selectBtn]} onPress={() => setOpen(!open)}>
        <Text style={s.selectText} numberOfLines={1}>{value || 'Select...'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#6b6b6b" />
      </Pressable>
      {open && (
        <View style={s.menu}>
          {options.map((opt: string) => (
            <Pressable
              key={opt}
              style={s.menuItem}
              onPress={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              <Text style={s.menuItemText}>{opt}</Text>
              {value === opt && <Ionicons name="checkmark" size={16} color={PINK_RED} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 36, height: 36, backgroundColor: C.surface, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
    headerCenter: { alignItems: 'center' },
    eyebrow: { fontFamily: FontFamily.bodyBold, fontSize: 10, letterSpacing: 1.4, color: PINK_RED, marginBottom: 2 },
    headerTitle: { fontFamily: FontFamily.headline, fontSize: 18, color: C.text },

    accentBar: { height: 3, marginHorizontal: 20, borderRadius: 100, marginBottom: 20 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted, marginBottom: 20, marginTop: 4 },

    sectionWrap: { marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { fontFamily: FontFamily.mono, fontSize: 11, letterSpacing: 1.0, color: C.textMuted },
    sectionSub: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginBottom: 8, marginTop: -4 },

    card: { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden' },
    fieldRow: { paddingHorizontal: 16, paddingVertical: 12 },
    fieldRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
    label: { fontFamily: FontFamily.body, fontSize: 12, fontWeight: '500', color: '#b2b2b2', marginBottom: 6 },

    inputWrap: { position: 'relative', justifyContent: 'center' },
    input: { fontFamily: FontFamily.body, fontSize: 15, color: C.text, paddingVertical: 0 },
    inputBoxed: { backgroundColor: '#fff', color: '#18171a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
    inputMulti: { height: 80, textAlignVertical: 'top' },
    inputFilled: { paddingRight: 34 },
    fieldCheck: { position: 'absolute', right: 12, top: '50%', marginTop: -8 },

    selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectText: { fontFamily: FontFamily.body, fontSize: 15, color: '#18171a', flex: 1 },
    menu: { backgroundColor: '#fff', borderRadius: 8, marginTop: 8, overflow: 'hidden', maxHeight: 260 },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    menuItemText: { fontFamily: FontFamily.body, fontSize: 13, color: '#18171a' },

    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceAlt },
    chipActive: { backgroundColor: PINK_RED, borderColor: PINK_RED },
    chipText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },
    chipTextActive: { color: '#fff' },

    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: PINK_RED, borderColor: PINK_RED },
    checkboxLabel: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },

    photo: { width: 64, height: 64, borderRadius: 14, borderWidth: 2, borderColor: C.border },
    photoPlaceholder: { backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    photoOverlay: { position: 'absolute', left: 16, top: 12, width: 64, height: 64, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    photoActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 },
    photoBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, backgroundColor: PINK_RED },
    photoBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    photoRemoveBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: C.border },
    photoRemoveBtnText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },

    hint: { fontFamily: FontFamily.body, fontSize: 11, color: C.textDim, marginTop: 5, lineHeight: 16 },

    saveBtnWrap: { marginTop: 8 },
    saveBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontFamily: FontFamily.bodyExtraBold, fontSize: 16, color: '#ffffff', letterSpacing: 0.3 },
  });
}
