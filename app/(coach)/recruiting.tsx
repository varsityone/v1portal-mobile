import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { useCoachData } from '../../hooks/useCoachData';
import { useCoachTargeting, STATES } from '../../hooks/useCoachTargeting';
import { ThemeColors } from '../../constants/Colors';
import { FontFamily } from '../../constants/Fonts';
import { useColors } from '../../context/ThemeContext';
import { Card } from '../../components/ui/Card';
import { FilterChips } from '../../components/ui/FilterChips';

const STATE_PATHS: Record<string, string> = {
  CA: 'M 10 15 L 10 50 L 30 50 L 30 15 Z',
  TX: 'M 45 35 L 45 55 L 65 55 L 65 35 Z',
  FL: 'M 75 40 L 75 60 L 80 60 L 80 40 Z',
  NY: 'M 85 10 L 85 25 L 95 25 L 95 10 Z',
  PA: 'M 80 22 L 80 35 L 90 35 L 90 22 Z',
  OH: 'M 70 25 L 70 35 L 80 35 L 80 25 Z',
  IL: 'M 60 25 L 60 35 L 70 35 L 70 25 Z',
  MI: 'M 75 15 L 75 28 L 85 28 L 85 15 Z',
  CO: 'M 20 25 L 20 40 L 35 40 L 35 25 Z',
  WA: 'M 5 5 L 5 20 L 15 20 L 15 5 Z',
  OR: 'M 8 20 L 8 30 L 18 30 L 18 20 Z',
};

export default function RecruitingScreen() {
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);
  const { coach, loading: coachLoading } = useCoachData();
  const { targeting, stats, loading, selectedStates, setSelectedStates, minScore, setMinScore, save } = useCoachTargeting();
  const [showStats, setShowStats] = useState(false);

  const handleStateToggle = (state: string) => {
    const newStates = new Set(selectedStates);
    if (newStates.has(state)) newStates.delete(state);
    else newStates.add(state);
    setSelectedStates(newStates);
  };

  const handleSave = async () => {
    try {
      await save();
      alert('Targeting preferences saved');
    } catch (e) {
      alert('Failed to save targeting');
    }
  };

  if (coachLoading || loading) {
    return <View style={s.center}><ActivityIndicator color={C.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.background }} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.eyebrow}>TARGET</Text>
        <Text style={s.title}>Recruiting</Text>
      </View>

      {/* Interactive state map (simplified representation) */}
      <Card style={s.mapCard}>
        <Text style={s.sectionTitle}>Select Target States</Text>
        <View style={s.stateGrid}>
          {STATES.map(state => (
            <Pressable
              key={state}
              style={[s.stateBtn, selectedStates.has(state) && s.stateBtnActive]}
              onPress={() => handleStateToggle(state)}
            >
              <Text style={[s.stateText, selectedStates.has(state) && s.stateTextActive]}>{state}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Min score filter */}
      <Card>
        <Text style={s.sectionTitle}>Minimum Score</Text>
        <View style={s.scoreRow}>
          {[0, 40, 50, 60, 70, 80].map(score => (
            <Pressable
              key={score}
              style={[s.scoreBtn, minScore === score && s.scoreBtnActive]}
              onPress={() => setMinScore(score)}
            >
              <Text style={[s.scoreText, minScore === score && s.scoreTextActive]}>{score}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Stats snapshot (if targeting already saved) */}
      {stats && (
        <Card>
          <Pressable onPress={() => setShowStats(!showStats)} style={s.statsHeader}>
            <Text style={s.sectionTitle}>Prospects by State</Text>
            <Text style={s.expandText}>{showStats ? '−' : '+'}</Text>
          </Pressable>
          {showStats && (
            <View style={{ gap: 8, marginTop: 12 }}>
              <View style={s.statsRow}>
                <Text style={s.statsLabel}>Total Prospects</Text>
                <Text style={s.statsValue}>{stats.totalProspects}</Text>
              </View>
              <View style={s.statsRow}>
                <Text style={s.statsLabel}>Verified</Text>
                <Text style={s.statsValue}>{stats.verifiedCount}</Text>
              </View>
              {stats.topPosition && (
                <View style={s.statsRow}>
                  <Text style={s.statsLabel}>Top Position</Text>
                  <Text style={s.statsValue}>{stats.topPosition}</Text>
                </View>
              )}
              <View style={s.statsRow}>
                <Text style={s.statsLabel}>Avg Score</Text>
                <Text style={s.statsValue}>{stats.avgScore}</Text>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Save button */}
      <Pressable style={s.saveBtn} onPress={handleSave}>
        <Text style={s.saveBtnText}>Save Targeting Preferences</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
    header: { marginBottom: 20 },
    eyebrow: { fontFamily: FontFamily.mono, fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 6 },
    title: { fontFamily: FontFamily.headline, fontSize: 28, color: C.text },

    sectionTitle: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: C.text, marginBottom: 10 },

    mapCard: { marginBottom: 16 },
    stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    stateBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    stateBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    stateText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    stateTextActive: { color: '#ffffff' },

    scoreRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    scoreBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border },
    scoreBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    scoreText: { fontFamily: FontFamily.bodyBold, fontSize: 12, color: C.text },
    scoreTextActive: { color: '#ffffff' },

    statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    expandText: { fontFamily: FontFamily.headline, fontSize: 18, color: C.primary },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    statsLabel: { fontFamily: FontFamily.body, fontSize: 12, color: C.textDim },
    statsValue: { fontFamily: FontFamily.bodyBold, fontSize: 13, color: C.text },

    saveBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
    saveBtnText: { fontFamily: FontFamily.bodyBold, fontSize: 14, color: '#ffffff' },
  });
}
