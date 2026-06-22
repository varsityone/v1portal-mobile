import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../../../hooks/useSubscription';
import { PHASES, isPhaseUnlocked, Phase } from '../../../constants/Phases';
import { UpgradeSheet } from '../../../components/UpgradeSheet';
import { ThemeColors } from '../../../constants/Colors';
import { useColors } from '../../../context/ThemeContext';

const PLAN_LABEL = { pro: 'Pro', elite: 'Elite' } as const;

interface PhaseCardProps {
  phase: Phase;
  unlocked: boolean;
  isLast: boolean;
  onPress: () => void;
}

function PhaseCard({ phase, unlocked, isLast, onPress }: PhaseCardProps) {
  const C = useColors();
  const cs = useMemo(() => createCardStyles(C), [C]);
  return (
    <View style={cs.wrapper}>
      {/* Left column: badge + connector */}
      <View style={cs.left}>
        <View style={[cs.badge, unlocked ? cs.badgeActive : cs.badgeLocked]}>
          <Text style={[cs.badgeNum, !unlocked && cs.badgeNumLocked]}>
            {phase.number}
          </Text>
        </View>
        {!isLast && (
          <View style={[cs.connector, unlocked && cs.connectorActive]} />
        )}
      </View>

      {/* Card */}
      <Pressable
        style={({ pressed }) => [
          cs.card,
          !unlocked && cs.cardLocked,
          pressed && cs.cardPressed,
          isLast && cs.cardLast,
        ]}
        onPress={onPress}
      >
        <View style={cs.cardTop}>
          <View style={cs.cardMeta}>
            <Text style={cs.phaseNum}>Phase {phase.number}</Text>
            {!unlocked && phase.upgradeTo && (
              <View style={cs.planBadge}>
                <Text style={cs.planBadgeText}>{PLAN_LABEL[phase.upgradeTo]}</Text>
              </View>
            )}
          </View>
          {unlocked
            ? <Ionicons name="chevron-forward" size={16} color={C.icon} />
            : <Ionicons name="lock-closed" size={14} color={C.icon} />
          }
        </View>

        <Text style={[cs.title, !unlocked && cs.textLocked]}>
          {phase.title}
        </Text>
        <Text style={[cs.description, !unlocked && cs.descLocked]}>
          {phase.description}
        </Text>
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
    badgeActive: { backgroundColor: C.primary },
    badgeLocked: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border },
    badgeNum: { fontSize: 13, fontWeight: '800', color: C.white },
    badgeNumLocked: { color: C.textDim },
    connector: { flex: 1, width: 2, backgroundColor: C.border, marginVertical: 4 },
    connectorActive: { backgroundColor: C.primary, opacity: 0.35 },
    card: {
      flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
      borderRadius: 14, padding: 16, marginBottom: 10,
    },
    cardLocked: { opacity: 0.65 },
    cardPressed: { backgroundColor: C.surfaceAlt },
    cardLast: { marginBottom: 0 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    phaseNum: { fontSize: 11, fontWeight: '600', color: C.primary, letterSpacing: 0.4 },
    planBadge: {
      backgroundColor: C.surfaceAlt, borderRadius: 4,
      paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.border,
    },
    planBadgeText: { fontSize: 9, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
    title: { fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6, letterSpacing: -0.2 },
    textLocked: { color: C.textMuted },
    description: { fontSize: 13, color: C.textMuted, lineHeight: 19 },
    descLocked: { color: C.textDim },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GameplanScreen() {
  const router = useRouter();
  const { plan, isPremium, isElite, loading } = useSubscription();
  const C = useColors();
  const s = useMemo(() => createStyles(C), [C]);

  const [sheet, setSheet] = useState<{
    visible: boolean;
    phase: Phase | null;
  }>({ visible: false, phase: null });

  const unlockedCount = PHASES.filter(p => isPhaseUnlocked(p, plan)).length;

  const handlePhasePress = (phase: Phase) => {
    if (isPhaseUnlocked(phase, plan)) {
      router.push(`/gameplan/${phase.number}`);
    } else {
      setSheet({ visible: true, phase });
    }
  };

  return (
    <>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>The Gameplan</Text>
          <Text style={s.subtitle}>
            Six phases. One roadmap to a scholarship offer.
          </Text>
        </View>

        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressTop}>
            <Text style={s.progressLabel}>PHASES UNLOCKED</Text>
            <Text style={s.progressCount}>
              {loading ? '…' : `${unlockedCount} / 6`}
            </Text>
          </View>
          <View style={s.progressTrack}>
            {PHASES.map((phase, i) => (
              <View
                key={phase.number}
                style={[
                  s.progressSegment,
                  i < PHASES.length - 1 && s.progressSegmentGap,
                  !loading && isPhaseUnlocked(phase, plan) && s.progressSegmentActive,
                ]}
              />
            ))}
          </View>
          {!loading && !isPremium && (
            <Text style={s.progressHint}>Upgrade to Pro to unlock Phases 2–4</Text>
          )}
          {!loading && isPremium && !isElite && (
            <Text style={s.progressHint}>Upgrade to Elite to unlock Phases 5–6</Text>
          )}
        </View>

        {/* Phase cards */}
        <View style={s.phases}>
          {PHASES.map((phase, i) => (
            <PhaseCard
              key={phase.number}
              phase={phase}
              unlocked={!loading && isPhaseUnlocked(phase, plan)}
              isLast={i === PHASES.length - 1}
              onPress={() => handlePhasePress(phase)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Bottom sheet */}
      <UpgradeSheet
        visible={sheet.visible}
        onClose={() => setSheet({ visible: false, phase: null })}
        requiredPlan={sheet.phase?.upgradeTo ?? 'pro'}
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
    progressSegmentActive: { backgroundColor: C.primary },
    progressHint: { marginTop: 10, fontSize: 12, color: C.textDim },

    phases: { gap: 0 },
  });
}
