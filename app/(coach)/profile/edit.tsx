import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { floorFromLevels, RECRUITING_LEVEL_BANDS } from '../../../lib/recruitingLevels';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { Card } from '../../../components/ui/Card';

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
    division: '',
    region: null,
    position_needs: [],
    years_coaching: 0,
    previous_stops: '',
    bio: '',
    message_to_recruits: '',
    twitter: '',
  });

  const [saving, setSaving] = useState(false);
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
        division: coach.division || '',
        region: coach.region || null,
        position_needs: coach.position_needs || [],
        years_coaching: coach.years_coaching || 0,
        previous_stops: coach.previous_stops || '',
        bio: coach.bio || '',
        message_to_recruits: coach.message_to_recruits || '',
        twitter: coach.twitter || '',
      });
    }
  }, [coach]);

  const handleSave = async () => {
    if (!coach?.id) return;
    setSaving(true);
    try {
      const minScore = formData.position_needs.length ? floorFromLevels(formData.position_needs) : null;
      const data = {
        title: formData.title,
        full_name: formData.full_name,
        school_name: formData.school_name,
        school_email: formData.school_email,
        phone: formData.phone,
        division: formData.division,
        region: formData.division !== 'NJCAA' ? null : formData.region,
        position_needs: formData.position_needs,
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
          <Text style={s.title}>Edit Profile</Text>
          <Text style={s.subtitle}>Update your coaching information</Text>
        </View>

        {/* Personal Info */}
        <Card>
          <Text style={s.sectionTitle}>Personal Information</Text>
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

        {/* Recruiting Needs */}
        <Card>
          <Text style={s.sectionTitle}>Recruiting Needs</Text>
          <Text style={s.fieldLabel}>Position Targets</Text>
          <View style={s.chipGrid}>
            {RECRUITING_LEVEL_BANDS.map(band => (
              <Pressable
                key={band.level}
                style={[s.chip, formData.position_needs.includes(band.level) && s.chipActive]}
                onPress={() => {
                  const next = formData.position_needs.includes(band.level)
                    ? formData.position_needs.filter((l: string) => l !== band.level)
                    : [...formData.position_needs, band.level];
                  setFormData({ ...formData, position_needs: next });
                }}
              >
                <Text style={[s.chipText, formData.position_needs.includes(band.level) && s.chipTextActive]}>
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

function FieldInput({ label, value, onChangeText, placeholder, multiline, keyboardType, C }: any) {
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

function FieldSelect({ label, value, options, onSelect, open, setOpen, C }: any) {
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
    title: { fontFamily: FontFamily.headline, fontSize: 28, fontWeight: '900', color: C.text, marginBottom: 6 },
    subtitle: { fontFamily: FontFamily.body, fontSize: 13, color: C.textMuted },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 14 },
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
