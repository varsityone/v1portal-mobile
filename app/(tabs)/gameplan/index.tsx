import { useState } from 'react';
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
import { Colors } from '../../../constants/Colors';

const PLAN_LABEL = { pro: 'Pro', elite: 'Elite' } as const;

interface PhaseCardProps {
  phase: Phase;
  unlocked: boolean;
  isLast: boolean;
  onPress: () => void;
}

function PhaseCard({ phase, unlocked, isLast, onPress }: PhaseCardProps) {
  return (
    <View style={cardStyles.wrapper}>
      {/* Left column: badge + connector */}
      <View style={cardStyles.left}>
        <View style={[cardStyles.badge, unlocked ? cardStyles.badgeActive : cardStyles.badgeLocked]}>
          <Text style={[cardStyles.badgeNum, !unlocked && cardStyles.badgeNumLocked]}>
            {phase.number}
          </Text>
        </View>
        {!isLast && (
          <View style={[cardStyles.connector, unlocked && cardStyles.connectorActive]} />
        )}
      </View>

      {/* Card */}
      <Pressable
        style={({ pressed }) => [
          cardStyles.card,
          !unlocked && cardStyles.cardLocked,
          pressed && cardStyles.cardPressed,
          isLast && cardStyles.cardLast,
        ]}
        onPress={onPress}
      >
        <View style={cardStyles.cardTop}>
          <View style={cardStyles.cardMeta}>
            <Text style={cardStyles.phaseNum}>Phase {phase.number}</Text>
            {!unlocked && phase.upgradeTo && (
              <View style={cardStyles.planBadge}>
                <Text style={cardStyles.planBadgeText}>{PLAN_LABEL[phase.upgradeTo]}</Text>
              </View>
            )}
          </View>
          {unlocked
            ? <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
            : <Ionicons name="lock-closed" size={14} color={Colors.textDim} />
          }
        </View>

        <Text style={[cardStyles.title, !unlocked && cardStyles.textLocked]}>
          {phase.title}
        </Text>
        <Text style={[cardStyles.description, !unlocked && cardStyles.descLocked]}>
          {phase.description}
        </Text>
      </Pressable>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: 14,
  },
  left: {
    alignItems: 'center',
    width: 32,
    paddingTop: 16,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: Colors.primary,
  },
  badgeLocked: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  badgeNum: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.white,
  },
  badgeNumLocked: {
    color: Colors.textDim,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  connectorActive: {
    backgroundColor: Colors.primary,
    opacity: 0.35,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardLocked: {
    opacity: 0.65,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  cardLast: {
    marginBottom: 0,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phaseNum: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.4,
  },
  planBadge: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  textLocked: {
    color: Colors.textMuted,
  },
  description: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  descLocked: {
    color: Colors.textDim,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function GameplanScreen() {
  const router = useRouter();
  const { plan, isPremium, isElite, loading } = useSubscription();

  const [sheet, setSheet] = useState<{
    visible: boolean;
    phase: Phase | null;
  }>({ visible: false, phase: null });

  const unlockedCount = PHASES.filter(p =>
    isPhaseUnlocked(p, plan)
  ).length;

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
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Gameplan</Text>
          <Text style={styles.subtitle}>
            Six phases. One roadmap to a scholarship offer.
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>PHASES UNLOCKED</Text>
            <Text style={styles.progressCount}>
              {loading ? '…' : `${unlockedCount} / 6`}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            {PHASES.map((phase, i) => (
              <View
                key={phase.number}
                style={[
                  styles.progressSegment,
                  i < PHASES.length - 1 && styles.progressSegmentGap,
                  !loading && isPhaseUnlocked(phase, plan) && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>
          {!loading && !isPremium && (
            <Text style={styles.progressHint}>
              Upgrade to Pro to unlock Phases 2–4
            </Text>
          )}
          {!loading && isPremium && !isElite && (
            <Text style={styles.progressHint}>
              Upgrade to Elite to unlock Phases 5–6
            </Text>
          )}
        </View>

        {/* Phase cards */}
        <View style={styles.phases}>
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },

  // Progress card
  progressCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.4,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressSegment: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
  },
  progressSegmentGap: {
    marginRight: 3,
  },
  progressSegmentActive: {
    backgroundColor: Colors.primary,
  },
  progressHint: {
    marginTop: 10,
    fontSize: 12,
    color: Colors.textDim,
  },

  // Phase list
  phases: {
    gap: 0,
  },
});
