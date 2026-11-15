import { and, asc, eq, inArray, isNotNull, lte, max } from 'drizzle-orm';

import { findPrSets, type HistoryRow } from '@/features/history/history';
import { loadTypeOf, scoreContext, setScore, type LoadType } from '@/features/progression';
import { db } from './client';
import { exercises, sets, workouts, type Exercise, type Workout, type WorkoutSet } from './schema';

const historySelect = {
  workoutId: workouts.id,
  workoutName: workouts.name,
  startedAt: workouts.startedAt,
  endedAt: workouts.endedAt,
  exerciseId: exercises.id,
  exerciseName: exercises.name,
  equipment: exercises.equipment,
  measure: exercises.measure,
  setId: sets.id,
  order: sets.order,
  reps: sets.reps,
  weight: sets.weight,
  isWarmup: sets.isWarmup,
};

/** Every set from finished workouts. */
export const fetchHistoryRows = (): Promise<HistoryRow[]> =>
  db
    .select(historySelect)
    .from(sets)
    .innerJoin(workouts, eq(sets.workoutId, workouts.id))
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(isNotNull(workouts.endedAt))
    .orderBy(asc(workouts.startedAt), asc(sets.order));

export interface DetailSet {
  set: WorkoutSet;
  /** Estimated 1RM in kg (bodyweight included for bodyweight lifts), or hold seconds for timed lifts. */
  e1rm: number;
  isPr: boolean;
}

export interface WorkoutDetail {
  workout: Workout;
  exercises: { exercise: Exercise; type: LoadType; sets: DetailSet[] }[];
  setCount: number;
  volume: number;
  prCount: number;
}

/** A workout with every set, its estimated 1RM, and whether it was a PR at the time. */
export async function getWorkoutDetail(
  workoutId: number,
  bodyweightKg?: number | null,
): Promise<WorkoutDetail | null> {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, workoutId));
  if (!workout) return null;

  const rows = await db
    .select({ set: sets, exercise: exercises })
    .from(sets)
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(eq(sets.workoutId, workoutId))
    .orderBy(asc(sets.order));

  const exerciseIds = [...new Set(rows.map((r) => r.exercise.id))];
  const history =
    exerciseIds.length === 0
      ? []
      : await db
          .select(historySelect)
          .from(sets)
          .innerJoin(workouts, eq(sets.workoutId, workouts.id))
          .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
          .where(and(inArray(sets.exerciseId, exerciseIds), lte(workouts.startedAt, workout.startedAt)));
  const prSets = findPrSets(history, bodyweightKg);

  const grouped: WorkoutDetail['exercises'] = [];
  for (const { set, exercise } of rows) {
    let group = grouped.find((g) => g.exercise.id === exercise.id);
    if (!group) {
      group = { exercise, type: loadTypeOf(exercise), sets: [] };
      grouped.push(group);
    }
    group.sets.push({
      set,
      e1rm: set.isWarmup ? 0 : setScore(set, scoreContext(exercise, bodyweightKg)),
      isPr: prSets.has(set.id),
    });
  }

  const working = rows.filter((r) => !r.set.isWarmup);
  return {
    workout,
    exercises: grouped,
    setCount: working.length,
    volume: working.reduce((sum, r) => sum + r.set.reps * r.set.weight, 0),
    prCount: grouped.filter((g) => g.sets.some((s) => s.isPr)).length,
  };
}

// --------------------------------------------------------------------------------------------- edits

export const updateSet = (setId: number, values: { weight: number; reps: number; isWarmup: boolean }) =>
  db.update(sets).set(values).where(eq(sets.id, setId));

export const deleteSet = (setId: number) => db.delete(sets).where(eq(sets.id, setId));

/** Appends a copy of the exercise's last set in this workout, ready to edit. */
export async function addSetLike(workoutId: number, exerciseId: number, like: { weight: number; reps: number }) {
  const [{ value }] = await db.select({ value: max(sets.order) }).from(sets).where(eq(sets.workoutId, workoutId));
  const [row] = await db
    .insert(sets)
    .values({ workoutId, exerciseId, order: (value ?? -1) + 1, weight: like.weight, reps: like.reps })
    .returning();
  return row;
}

export const renameWorkout = (workoutId: number, name: string) =>
  db.update(workouts).set({ name: name.trim() || null }).where(eq(workouts.id, workoutId));

export const deleteWorkout = (workoutId: number) => db.delete(workouts).where(eq(workouts.id, workoutId));
