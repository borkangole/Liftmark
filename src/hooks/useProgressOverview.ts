import { asc, eq, isNotNull } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { exercises, sets, workouts } from '@/db/schema';
import { buildProgressOverview, type ProgressRow, type StallInputs } from '@/features/progress/overview';
import { resolveRest } from '@/features/rest/rest';
import { useProfile } from '@/stores/useProfile';
import { usePlateaus } from '@/stores/usePlateaus';
import { useSettings } from '@/stores/useSettings';
import { todayKey, useFoodTargets, useFoodTotals } from './useFood';
import { useLiveTables } from './useLiveTables';

const fetchRows = (): Promise<ProgressRow[]> =>
  db
    .select({
      workoutId: workouts.id,
      startedAt: workouts.startedAt,
      exerciseId: exercises.id,
      exerciseName: exercises.name,
      muscleGroup: exercises.muscleGroup,
      equipment: exercises.equipment,
      measure: exercises.measure,
      repRangeMin: exercises.repRangeMin,
      repRangeMax: exercises.repRangeMax,
      weightIncrement: exercises.weightIncrement,
      isCustom: exercises.isCustom,
      targetMuscles: exercises.targetMuscles,
      restSeconds: exercises.restSeconds,
      reps: sets.reps,
      weight: sets.weight,
      isWarmup: sets.isWarmup,
      loggedAt: sets.createdAt,
    })
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(isNotNull(workouts.endedAt))
    .orderBy(asc(workouts.startedAt), asc(sets.order));

const TABLES = ['sets', 'workouts', 'exercises'];

/**
 * Live progress dashboard data for finished workouts. `rangeWeeks: null` = all time.
 * Stuck lifts come with a diagnosis that reads training, food log and weigh-ins together.
 */
export function useProgressOverview(rangeWeeks: number | null) {
  const rows = useLiveTables(fetchRows, TABLES, []);
  const profile = useProfile((s) => s.profile);
  const unit = useSettings((s) => s.unit);
  const restMode = useSettings((s) => s.restMode);
  const fixedRest = useSettings((s) => s.defaultRestSeconds);
  const { targets, formulaAdvice, measured, goal, weighIns } = useFoodTargets();
  const food = useFoodTotals(todayKey(), 84);
  const plans = usePlateaus((s) => s.plans);

  const stall: StallInputs = useMemo(
    () => ({
      goal,
      targets: targets ? { kcal: targets.kcal, proteinG: targets.proteinG } : null,
      maintenance: measured.ok ? measured.value.maintenance : (formulaAdvice?.maintenance ?? null),
      food,
      weighIns,
      restFor: (row) =>
        row.measure === 'time'
          ? null
          : resolveRest(
              { ...row, name: row.exerciseName },
              {
                mode: restMode,
                fixedSeconds: fixedRest,
                profile: profile ? { goal: profile.goal, level: profile.level } : null,
              },
            ).seconds,
    }),
    [goal, targets, measured, formulaAdvice, food, weighIns, restMode, fixedRest, profile],
  );

  return useMemo(
    () =>
      buildProgressOverview(rows, {
        rangeWeeks,
        bodyweightKg: profile?.weightKg,
        unit,
        level: profile?.level,
        stall,
        plans,
      }),
    [rows, rangeWeeks, profile?.weightKg, profile?.level, unit, stall, plans],
  );
}
