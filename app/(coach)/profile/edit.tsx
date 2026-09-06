import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useCoachData } from '../../../hooks/useCoachData';
import { ThemeColors } from '../../../constants/Colors';
import { FontFamily } from '../../../constants/Fonts';
import { useColors } from '../../../context/ThemeContext';
import { floorFromLevels, POSITIONS, RECRUITING_LEVEL_BANDS } from '../../../lib/recruitingLevels';
import { FilterChips } from '../../../components/ui/FilterChips';
import { Card } from '../../../components/ui/Card';

const TITLES = ['Head Coach', 'Assistant Coach', 'Defensive Coordinator', 'Offensive Coordinator', 'Quarterbacks Coach', 'Running Backs Coach', 'Wide Receivers Coach', 'Tight Ends Coach', 'Offensive Line Coach', 'Defensive Line Coach', 'Linebackers Coach', 'Defensive Backs Coach', 'Special Teams Coordinator', 'Strength & Conditioning Coach', 'Graduate Assistant', 'Analyst'];
const DIVISIONS = ['D1_FBS', 'D1_FCS', 'D2', 'D3', 'NAIA', 'NJCAA'];
const NJCAA_REGIONS = ['Region I', 'Region II', 'Region III', 'Region IV', 'Region V', 'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X', 'Region XI', 'Region XII'];

export default function CoachProfileEditScreen() {
  const router = useRouter();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, refresh } = useCoachData();

  const [fullName, setFullName] = useState(coach?.full_name ?? '');
  const [title, setTitle] = useState(coach?.title ?? '');
  const [schoolName, setSchoolName] = useState(coach?.school_name ?? '');
  const [schoolEmail, setSchoolEmail] = useState(coach?.school_email ?? '');
  const [division, setDivision] = useState(coach?.division ?? '');
  const [region, setRegion] = useState(coach?.region ?? '');
  const [positionCoached, setPositionCoached] = useState(coach?.position_coached ?? '');
  const [positionNeeds, setPositionNeeds] = useState(coach?.position_needs ?? []);
  const [levelBands, setLevelBands] = useState(coach?.level_bands ?? []);
  const [phone, setPhone] = useState(coach?.phone ?? '');
  const [phonePublic, setPhonePublic] = useState(coach?.phone_public ?? false);
  const [twitter, setTwitter] = useState(coach?.twitter ?? '');
  const [yearsCoaching, setYearsCoaching] = useState(coach?.years_coaching?.toString() ?? '');
  const [previousStops, setPreviousStops] = useState(coach?.previous_stops ?? '');
  const [bio, setBio] = useState(coach?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!coach?.id) return;
    setSaving(true);

    try {
      const minScore = floorFromLevels(levelBands);
      const updateData: any = {
        full_name: fullName,
        title,
        school_name: schoolName,
        school_email: schoolEmail,
        division,
        region: division === 'NJCAA' ? region : null,
        position_coached: positionCoached,
        position_needs: positionNeeds,
        level_bands: levelBands,
        min_score: minScore,
        phone,
        phone_public: phonePublic,
        twitter,
        years_coaching: yearsCoaching ? parseInt(yearsCoaching) : null,
        previous_stops: previousStops,
        bio,
      };

      await supabase.from('coach_accounts').update(updateData).eq('id', coach.id);
      await refresh();
      router.back();
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  if (!coach) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={C.text} />
        </Pressable>
        <Text style={s.title}>Edit Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <Card>
        <Text style={s.fieldLabel}>Full Name</Text>
        <TextInput style={s.input} value={fullName} onChangeText={setFullName} />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Title</Text>
        <View style={s.dropdown}>
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Select or type…" />
        </View>
      </Card>

      <Card>
        <Text style={s.fieldLabel}>School Name</Text>
        <TextInput style={s.input} value={schoolName} onChangeText={setSchoolName} />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>School Email</Text>
        <TextInput style={s.input} value={schoolEmail} onChangeText={setSchoolEmail} keyboardType="email-address" />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Division</Text>
        <View style={s.dropdown}>
          <TextInput style={s.input} value={division} onChangeText={setDivision} placeholder="Select…" />
        </View>
      </Card>

      {division === 'NJCAA' && (
        <Card>
          <Text style={s.fieldLabel}>Region</Text>
          <View style={s.dropdown}>
            <TextInput style={s.input} value={region} onChangeText={setRegion} placeholder="Select…" />
          </View>
        </Card>
      )}

      <Card>
        <Text style={s.fieldLabel}>Position Coached</Text>
        <TextInput style={s.input} value={positionCoached} onChangeText={setPositionCoached} />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Positions Recruiting</Text>
        <FilterChips
          options={POSITIONS.map(p => ({ label: p, value: p }))}
          selected={positionNeeds}
          onToggle={p => setPositionNeeds(positionNeeds.includes(p) ? positionNeeds.filter(x => x !== p) : [...positionNeeds, p])}
          horizontal={false}
        />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Recruiting Level Bands</Text>
        <FilterChips
          options={RECRUITING_LEVEL_BANDS.map(b => ({ label: b.level, value: b.level }))}
          selected={levelBands}
          onToggle={b => setLevelBands(levelBands.includes(b) ? levelBands.filter(x => x !== b) : [...levelBands, b])}
          horizontal={false}
        />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Phone</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Pressable style={s.toggleRow} onPress={() => setPhonePublic(!phonePublic)}>
          <Text style={s.toggleLabel}>Make phone public</Text>
          <View style={[s.toggle, phonePublic && { backgroundColor: C.primary }]}>
            <View style={[s.toggleThumb, phonePublic && s.toggleThumbActive]} />
          </View>
        </Pressable>
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Twitter</Text>
        <TextInput style={s.input} value={twitter} onChangeText={setTwitter} />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Years Coaching</Text>
        <TextInput style={s.input} value={yearsCoaching} onChangeText={setYearsCoaching} keyboardType="number-pad" />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Previous Stops</Text>
        <TextInput style={[s.input, s.multiline]} value={previousStops} onChangeText={setPreviousStops} multiline numberOfLines={3} />
      </Card>

      <Card>
        <Text style={s.fieldLabel}>Bio</Text>
        <TextInput style={[s.input, s.multiline]} value={bio} onChangeText={setBio} multiline numberOfLines={4} />
      </Card>

      <Pressable
        style={[s.saveButton, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Save Changes</Text>}
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    title: { fontFamily: FontFamily.bodyBold, fontSize: 16, color: C.text },
    fieldLabel: { fontFamily: FontFamily.bodySemi, fontSize: 12, color: C.textDim, marginBottom: 8 },
    input: { backgroundColor: C.background, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontFamily: FontFamily.body, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
    multiline: { textAlignVertical: 'top' },
    dropdown: { borderRadius: 8, overflow: 'hidden' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
    toggleLabel: { fontFamily: FontFamily.body, fontSize: 13, color: C.text },
    toggle: { width: 50, height: 30, borderRadius: 15, backgroundColor: C.border2, justifyContent: 'center', alignItems: 'flex-start', paddingHorizontal: 3 },
    toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.text },
    toggleThumbActive: { alignSelf: 'flex-end' },
    saveButton: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    saveButtonText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#fff' },
  });
}
