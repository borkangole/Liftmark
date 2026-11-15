import { asc, desc, eq, isNull } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { exercises, sets, workouts } from '@/db/schema';

/** A workout and its sets (with exercise info), live. */
export function useWorkout(workoutId: number) {
  const { data: workoutRows } = useLiveQuery(db.select().from(workouts).where(eq(workouts.id, workoutId)), [workoutId]);
  const { data: rows } = useLiveQuery(
    db
      .select({ set: sets, exercise: exercises })
      .from(sets)
      .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
      .where(eq(sets.workoutId, workoutId))
      .orderBy(asc(sets.order)),
    [workoutId],
  );
  return { workout: workoutRows[0], rows };
}

/** The most recent unfinished workout, if any (survives app restarts). */
export function useActiveWorkoutRow() {
  const { data } = useLiveQuery(
    db.select().from(workouts).where(isNull(workouts.endedAt)).orderBy(desc(workouts.startedAt)).limit(1),
  );
  return data[0];
}
