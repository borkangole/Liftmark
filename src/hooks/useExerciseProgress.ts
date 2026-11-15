import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { exercises, sets, workouts } from '@/db/schema';
import { toSessions } from '@/db/sessions';
import {
  analyzeTrend,
  STALL_RULES,
  scoreContext,
  suggestWithPlan,
  summarizeSession,
  toScoredSessions,
} from '@/features/progression';
import { formatWeight } from '@/lib/format';
import { progressionStepKg } from '@/lib/units';
import { useProfile } from '@/stores/useProfile';
import { usePlateaus } from '@/stores/usePlateaus';
import { useSettings } from '@/stores/useSettings';

/**
 * Live sessions, trend and next-session suggestion for one exercise.
 * Pass `excludeWorkoutId` while logging so the workout in progress doesn't count as "last session".
 */
export function useExerciseProgress(exerciseId: number, { excludeWorkoutId }: { excludeWorkoutId?: number } = {}) {
  const { data: exerciseRows } = useLiveQuery(db.select().from(exercises).where(eq(exercises.id, exerciseId)), [
    exerciseId,
  ]);
  const { data: rows } = useLiveQuery(
    db
      .select({ set: sets, workout: workouts })
      .from(sets)
      .innerJoin(workouts, eq(sets.workoutId, workouts.id))
      .where(eq(sets.exerciseId, exerciseId))
      .orderBy(asc(workouts.startedAt), asc(sets.order)),
    [exerciseId],
  );

  const exercise = exerciseRows[0];
  const bodyweightKg = useProfile((s) => s.profile?.weightKg);
  const level = useProfile((s) => s.profile?.level);
  const plan = usePlateaus((s) => s.plans[exerciseId] ?? null);
  const unit = useSettings((s) => s.unit);

  return useMemo(() => {
    const sessions = toSessions(
      excludeWorkoutId === undefined ? rows : rows.filter((r) => r.workout.id !== excludeWorkoutId),
    );
    // Scores: e1RM for loaded lifts (bodyweight included for pull-ups etc.), seconds for holds.
    const ctx = scoreContext(exercise ?? { equipment: 'barbell' }, bodyweightKg);
    const scored = toScoredSessions(sessions, ctx);
    const summaries = scored.map(summarizeSession);
    const trend = analyzeTrend(scored, { metric: ctx.type === 'timed' ? 'hold time' : 'estimated 1RM', level });
    const suggestion = exercise
      ? suggestWithPlan(
          sessions,
          trend,
          {
            deloadAfter: level ? STALL_RULES[level].stallAfter + 2 : undefined,
            repRange: { min: exercise.repRangeMin, max: exercise.repRangeMax },
            increment: progressionStepKg(exercise.weightIncrement, unit),
            type: ctx.type,
            formatWeight: (kg) => formatWeight(kg, unit),
            snapToIncrement: unit === 'lb',
          },
          plan,
        )
      : null;
    return { exercise, sessions, summaries, trend, suggestion, ctx, plan };
  }, [rows, exercise, excludeWorkoutId, bodyweightKg, unit, level, plan]);
}
