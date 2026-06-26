import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAthleteData } from '../../../hooks/useAthleteData';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { PHASES, Phase } from '../../../constants/Phases';
import { UpgradeSheet } from '../../../components/UpgradeSheet';
import { ThemeColors } from '../../../constants/Colors';
import { useColors } from '../../../context/ThemeContext';

type PhaseStatus = 'done' | 'active' | 'upcoming';

interface PhaseCardProps {
  phase: Phase;
  status: PhaseStatus;
  isLast: boolean;
  locked: boolean;
  requiredPhase: Phase | null;
  onPress: () => void;
}

function PhaseCard({ phase, status, isLast, locked, requiredPhase, onPress }: PhaseCardProps) {
  const C = useColors();
  const cs = useMemo(() => createCardStyles(C), [C]);

  return (
    <View style={cs.wrapper}>
      <View style={cs.left}>
        <View style={[
          cs.badge,
          status === 'done' && cs.badgeDone,
          status === 'active' && cs.badgeActive,
          status === 'upcoming' && cs.badgeUpcoming,
        ]}>
          {status === 'done'
            ? <Ionicons name="checkmark" size={14} color={C.white} />
            : <Text style={[cs.badgeNum, status === 'upcoming' && cs.badgeNumDim]}>{phase.number}</Text>
          }
        </View>
        {!isLast && (
          <View style={[cs.connector, status === 'done' && cs.connectorDone]} />
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          cs.card,
          locked && cs.cardLocked,
          pressed && !locked && cs.cardPressed,
          isLast && cs.cardLast,
        ]}
        onPress={onPress}
      >
        <View style={cs.cardTop}>
          <View style={cs.cardMeta}>
            <Text style={cs.phaseNum}>Phase {phase.number}</Text>
            {status === 'done' && (
              <View style={cs.statusBadge}>
                <Text style={cs.statusBadgeText}>Completed</Text>
              </View>
            )}
            {status === 'active' && (
              <View style={[cs.statusBadge, cs.statusBadgeActive]}>
                <Text style={[cs.statusBadgeText, cs.statusBadgeActiveText]}>In Progress</Text>
              </View>
            )}
          </View>
          <Ionicons
            name={locked ? 'time-outline' : 'chevron-forward'}
            size={16}
            color={C.icon}
          />
        </View>

        <Text style={[cs.title, locked && cs.textDim]}>{phase.title}</Text>
        <Text style={[cs.description, locked && cs.descDim]}>{phase.description}</Text>

        {locked && requiredPhase && (
          <Text style={cs.completePrevious}>
            Complete Phase {requiredPhase.number} first
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function createCardStyles(C: ThemeColors) {
  return StyleSheet.create({
    wrapper: { flexDirection: 'row', gap: 14 },
    left: { alignItems: 'center', width: 32, paddingTop: 16 },
    badge: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: 'center', justifyContent: 'center',
    },
    badgeDone: { backgroundColor: C.text },
    badgeActive: { backgroundColor: C.primary },
    badgeUpcoming: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
    badgeNum: { fontSize: 13, fontWeight: '800', color: C.white },
    badgeNumDim: { color: C.textDim },
    connector: { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 4 },
    connectorDone: { backgroundColor: C.text, opacity: 0.4 },
    card: {
      flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16, marginBottom: 10,
    },
    cardLocked: { opacity: 0.5 },
    cardPressed: { backgroundColor: C.surfaceAlt },
    cardLast: { marginBottom: 0 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    phaseNum: { fontSize: 11, fontWeight: '600', color: C.primary, letterSpacing: 0.4 },
    statusBadge: {
      backgroundColor: C.surfaceAlt, borderRadius: 4,
      paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.border,
    },
    statusBadgeText: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
    statusBadgeActive: { backgroundColor: `${C.primary}18`, borderColor: `${C.primary}40` },
    statusBadgeActiveText: { color: C.primary },
    title: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6, letterSpacing: -0.2 },
    textDim: { color: C.textMuted },
    description: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
    descDim: { color: C.textDim },
    completePrevious: { marginTop: 8, fontSize: 12, color: C.textDim, fontStyle: 'italic' },
  });
}

export default function GameplanScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { athlete, assessment, loading, refresh } = useAthleteData();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [outreachCount, setOutreachCount] = useState(0);
  const [trackerCount, setTrackerCount] = useState(0);

  const [sheet, setSheet] = useState<{
    visible: boolean;
    phase: Phase | null;
    requiredPhase: Phase | null;
  }>({ visible: false, phase: null, requiredPhase: null });

  const fetchCounts = useCallback(async () => {
    if (!athlete?.id) return;
    const [{ data: outData }, { count: tCount }] = await Promise.all([
      supabase.from('coach_outreach').select('status').eq('athlete_id', athlete.id),
      supabase.from('coach_tracker').select('id', { count: 'exact', head: true }).eq('athlete_id', athlete.id),
    ]);
    const sent = (outData ?? []).filter(o => ['sent', 'opened', 'bounced', 'replied'].includes(o.status ?? '')).length;
    setOutreachCount(sent > 0 ? sent : (outData?.length ?? 0));
    setTrackerCount(tCount ?? 0);
  }, [athlete?.id]);

  const phaseComplete = [
    !!assessment?.v1_score,
    !!(
      athlete?.full_name && athlete?.phone && athlete?.bio &&
      athlete?.position && athlete?.graduation_year && athlete?.height &&
      athlete?.weight && athlete?.high_school && athlete?.city &&
      athlete?.gpa && athlete?.ncaa_id &&
      (athlete?.sat_score || athlete?.act_score || athlete?.test_scores_not_taken) &&
      athlete?.hudl_link &&
      athlete?.guardian_name && athlete?.guardian_relationship &&
      athlete?.guardian_phone && athlete?.guardian_email
    ),
    !!athlete?.target_list_saved_at,
    outreachCount > 0,
    trackerCount >= 1,
    outreachCount >= 5,
  ];

  const phaseLocked = PHASES.map((_, i) => i > 0 && !phaseComplete[i - 1]);

  const getStatus = (i: number): PhaseStatus => {
    if (phaseComplete[i]) return 'done';
    if (!phaseLocked[i]) return 'active';
    return 'upcoming';
  };

  const completedCount = phaseComplete.filter(Boolean).length;

  const handlePhasePress = (phase: Phase, i: number) => {
    if (phaseLocked[i]) {
      setSheet({ visible: true, phase, requiredPhase: PHASES[i - 1] });
    } else {
      router.push(`/(tabs)/gameplan/${phase.number}` as any);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refresh(), fetchCounts()]);
  };

  return (
    <>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={C.primary} />
        }
      >
        <View style={s.header}>
          <Text style={s.title}>The Gameplan</Text>
          <Text style={s.subtitle}>
            Six phases. One roadmap to a scholarship offer.
          </Text>
        </View>

        <View style={s.progressCard}>
          <View style={s.progressTop}>
            <Text style={s.progressLabel}>PHASES COMPLETED</Text>
            <Text style={s.progressCount}>{loading ? '…' : `${completedCount} / 6`}</Text>
          </View>
          <View style={s.progressTrack}>
            {PHASES.map((_, i) => (
              <View
                key={i}
                style={[
                  s.progressSegment,
                  i < PHASES.length - 1 && s.progressSegmentGap,
                  phaseComplete[i] && s.progressSegmentDone,
                  !phaseLocked[i] && !phaseComplete[i] && s.progressSegmentActive,
                ]}
              />
            ))}
          </View>
        </View>

        <View style={s.phases}>
          {PHASES.map((phase, i) => (
            <PhaseCard
              key={phase.number}
              phase={phase}
              status={getStatus(i)}
              isLast={i === PHASES.length - 1}
              locked={phaseLocked[i]}
              requiredPhase={i > 0 ? PHASES[i - 1] : null}
              onPress={() => handlePhasePress(phase, i)}
            />
          ))}
        </View>
      </ScrollView>

      <UpgradeSheet
        visible={sheet.visible}
        onClose={() => setSheet({ visible: false, phase: null, requiredPhase: null })}
        requiredPhaseNumber={sheet.requiredPhase?.number ?? 0}
        requiredPhaseName={sheet.requiredPhase?.title ?? ''}
        phaseNumber={sheet.phase?.number ?? 0}
        phaseName={sheet.phase?.title ?? ''}
      />
    </>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: C.background },
    container: { paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 },

    header: { marginBottom: 20 },
    title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 6 },
    subtitle: { fontSize: 15, color: C.textMuted, lineHeight: 22 },

    progressCard: {
      backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 18, marginBottom: 24,
    },
    progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressLabel: { fontSize: 10, fontWeight: '700', color: C.textDim, letterSpacing: 1.4 },
    progressCount: { fontSize: 14, fontWeight: '700', color: C.text },
    progressTrack: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden' },
    progressSegment: { flex: 1, backgroundColor: C.surfaceAlt, borderRadius: 3 },
    progressSegmentGap: { marginRight: 3 },
    progressSegmentDone: { backgroundColor: C.text },
    progressSegmentActive: { backgroundColor: C.primary },

    phases: { gap: 0 },
  });
}
