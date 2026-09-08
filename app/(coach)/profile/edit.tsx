import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { floorFromLevels, POSITIONS, RECRUITING_LEVEL_BANDS } from '../../../lib/recruitingLevels';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Card } from '../../../components/ui/Card';

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
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
        <View style={s.header}>
          <View style={s.headerTopRow}>
            <Text style={s.title}>Edit Profile</Text>
            <Pressable style={s.viewProfileBtn} onPress={() => router.push('/(coach)/profile' as any)}>
              <Text style={s.viewProfileBtnText}>View Profile</Text>
            </Pressable>
          </View>
          <Text style={s.subtitle}>Update your program information. This is what athletes see when they swipe.</Text>
        </View>

        {/* Personal Info */}
        <Card>
          <Text style={s.sectionTitle}>Personal Information</Text>

          <View style={s.photoRow}>
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
          {!!photoError && <Text style={s.photoError}>{photoError}</Text>}

          <FieldInput label="Full Name" value={formData.full_name} onChangeText={v => setFormData({ ...formData, full_name: v })} C={C} />
          <FieldSelect
            label="Title"
            value={formData.title}
            options={TITLES}
            onSelect={v => setFormData({ ...formData, title: v })}
            open={showTitleMenu}
            setOpen={setShowTitleMenu}
            C={C}
          />
        </Card>

        {/* School Info */}
        <Card>
          <Text style={s.sectionTitle}>School Information</Text>
          <FieldInput label="School Name" value={formData.school_name} onChangeText={v => setFormData({ ...formData, school_name: v })} C={C} />
          <FieldInput label="School Email" value={formData.school_email} onChangeText={v => setFormData({ ...formData, school_email: v })} C={C} />
          <FieldInput label="Phone" value={formData.phone} onChangeText={v => setFormData({ ...formData, phone: v })} C={C} />
          <Pressable style={s.checkboxRow} onPress={() => setFormData({ ...formData, phone_public: !formData.phone_public })}>
            <View style={[s.checkbox, formData.phone_public && s.checkboxChecked]}>
              {formData.phone_public && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={s.checkboxLabel}>Show my phone number to athletes on my public profile</Text>
          </Pressable>
        </Card>

        {/* Division & Region */}
        <Card>
          <Text style={s.sectionTitle}>Division & Region</Text>
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
            />
          )}
        </Card>

        {/* Recruiting Focus */}
        <Card>
          <Text style={s.sectionTitle}>Recruiting Focus</Text>
          <Text style={s.sectionSub}>What positions do you coach and recruit, and what athlete level are you targeting?</Text>

          <Text style={s.fieldLabel}>Positions You're Recruiting</Text>
          <View style={s.chipGrid}>
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

          <Text style={[s.fieldLabel, { marginTop: 16 }]}>Athlete Level</Text>
          <View style={s.chipGrid}>
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
        </Card>

        {/* Coaching History */}
        <Card>
          <Text style={s.sectionTitle}>Coaching History</Text>
          <FieldInput label="Years Coaching" value={String(formData.years_coaching)} onChangeText={v => setFormData({ ...formData, years_coaching: Number(v) })} keyboardType="numeric" C={C} />
          <FieldInput label="Previous Stops" value={formData.previous_stops} onChangeText={v => setFormData({ ...formData, previous_stops: v })} multiline C={C} />
          <FieldInput label="Bio" value={formData.bio} onChangeText={v => setFormData({ ...formData, bio: v })} multiline C={C} />
        </Card>

        {/* Messaging */}
        <Card>
          <Text style={s.sectionTitle}>Messaging</Text>
          <FieldInput label="Message to Recruits" value={formData.message_to_recruits} onChangeText={v => setFormData({ ...formData, message_to_recruits: v })} multiline C={C} />
          <FieldInput label="Twitter" value={formData.twitter} onChangeText={v => setFormData({ ...formData, twitter: v })} placeholder="@handle" C={C} />
        </Card>

        {/* Save Button */}
        <Pressable style={s.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </Pressable>
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
  C: any;
}

interface FieldSelectProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  C: any;
}

function FieldInput({ label, value, onChangeText, placeholder, multiline, keyboardType, C }: FieldInputProps) {
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.fieldBox}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { minHeight: 80 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={C.textDim}
        multiline={multiline}
        keyboardType={keyboardType as any}
      />
    </View>
  );
}

function FieldSelect({ label, value, options, onSelect, open, setOpen, C }: FieldSelectProps) {
  const s = useMemo(() => createStyles(C), [C]);
  return (
    <View style={s.fieldBox}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Pressable style={s.selectBtn} onPress={() => setOpen(!open)}>
        <Text style={s.selectText}>{value || 'Select...'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.textDim} />
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
              {value === opt && <Ionicons name="checkmark" size={16} color={C.primary} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48, backgroundColor: C.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 24 },
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, fontWeight: '900', color: C.text },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },
    viewProfileBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    viewProfileBtnText: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textMuted },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 14 },
    sectionSub: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim, marginTop: -8, marginBottom: 14 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
    checkboxLabel: { flex: 1, fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },

    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
    photo: { width: 64, height: 64, borderRadius: 14, borderWidth: 2, borderColor: C.border },
    photoPlaceholder: { backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    photoOverlay: {
      position: 'absolute', left: 0, top: 0, width: 64, height: 64, borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    },
    photoActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 },
    photoBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, backgroundColor: C.primary },
    photoBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: '#fff' },
    photoRemoveBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: C.border },
    photoRemoveBtnText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
    photoError: { fontFamily: FontFamily.body, fontSize: 11, color: '#ff4444', marginBottom: 14 },

    fieldBox: { marginBottom: 14 },
    fieldLabel: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text, marginBottom: 6 },
    input: { fontFamily: FontFamily.body, fontSize: 13, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: C.text, backgroundColor: C.surface },

    selectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: C.surface },
    selectText: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },

    menu: { backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginTop: 8, overflow: 'hidden' },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    menuItemText: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },

    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
    chipActive: { backgroundColor: C.primary + '20', borderColor: C.primary },
    chipText: { fontFamily: FontFamily.body, fontSize: 12, color: C.textMuted },
    chipTextActive: { color: C.primary, fontWeight: '600' },

    saveBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
  });
}
