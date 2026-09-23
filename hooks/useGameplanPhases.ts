import { useMemo } from 'react';
import { Athlete, Assessment } from './useAthleteData';
import { PHASES, Phase } from '../constants/Phases';

export type PhaseStatus = 'done' | 'active' | 'upcoming';

export interface GameplanPhases {
  phases: Phase[];
  phaseComplete: boolean[];
  phaseLocked: boolean[];
  activePhaseIdx: number;
  completedCount: number;
  progressPct: number;
  getStatus: (i: number) => PhaseStatus;
}

export function isProfileComplete(athlete: Athlete | null): boolean {
  return !!(
    athlete?.full_name && athlete?.phone && athlete?.bio &&
    athlete?.position && athlete?.graduation_year && athlete?.height &&
    athlete?.weight && athlete?.high_school && athlete?.city &&
    athlete?.gpa && athlete?.ncaa_id &&
    (athlete?.sat_score || athlete?.act_score || athlete?.test_scores_not_taken) &&
    athlete?.hudl_link &&
    athlete?.guardian_name && athlete?.guardian_relationship &&
    athlete?.guardian_phone && athlete?.guardian_email
  );
}

export function useGameplanPhases(
  athlete: Athlete | null,
  assessment: Assessment | null,
  matchCount: number
): GameplanPhases {
  return useMemo(() => {
    const phaseComplete = [
      (assessment?.v1_score ?? athlete?.v1_score) != null,
      isProfileComplete(athlete),
      matchCount >= 1,
    ];

    const phaseLocked: boolean[] = [];
    const phaseEffectiveDone: boolean[] = [];
    phaseComplete.forEach((complete, i) => {
      phaseLocked[i] = i > 0 && !phaseEffectiveDone[i - 1];
      phaseEffectiveDone[i] = !phaseLocked[i] && complete;
    });
    const curIdx = phaseEffectiveDone.findIndex(c => !c);
    const activePhaseIdx = curIdx === -1 ? PHASES.length - 1 : curIdx;
    const completedCount = phaseEffectiveDone.filter(Boolean).length;
    const progressPct = (completedCount / PHASES.length) * 100;

    const getStatus = (i: number): PhaseStatus => {
      if (phaseEffectiveDone[i]) return 'done';
      if (!phaseLocked[i]) return 'active';
      return 'upcoming';
    };

    return { phases: PHASES, phaseComplete, phaseLocked, activePhaseIdx, completedCount, progressPct, getStatus };
  }, [athlete, assessment, matchCount]);
}
