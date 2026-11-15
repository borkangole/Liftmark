import { count, eq } from 'drizzle-orm';

import { buildCustomExercise } from '@/features/custom/custom';
import type { Muscle } from '@/features/muscles/targets';
import type { LoadType } from '@/features/progression/measure';
import { db } from './client';
import { exercises, routineExercises, sets } from './schema';

/** Saves a custom exercise and returns its id. */
export async function createCustomExercise(input: {
  name: string;
  muscles: Muscle[];
  type: LoadType;
  repRange: { min: number; max: number };
}): Promise<number> {
  const [row] = await db.insert(exercises).values(buildCustomExercise(input)).returning({ id: exercises.id });
  return row.id;
}

/** How many sets have been logged for an exercise (shown before deleting it). */
export async function loggedSetCount(exerciseId: number): Promise<number> {
  const [row] = await db.select({ n: count() }).from(sets).where(eq(sets.exerciseId, exerciseId));
  return row?.n ?? 0;
}

/** Deletes a custom exercise with its logged sets and its place in any routine. Presets are kept. */
export async function deleteCustomExercise(exerciseId: number) {
  const [exercise] = await db.select().from(exercises).where(eq(exercises.id, exerciseId));
  if (!exercise?.isCustom) return;
  await db.transaction(async (tx) => {
    await tx.delete(sets).where(eq(sets.exerciseId, exerciseId));
    await tx.delete(routineExercises).where(eq(routineExercises.exerciseId, exerciseId));
    await tx.delete(exercises).where(eq(exercises.id, exerciseId));
  });
}

/** The user's own rest for an exercise, in seconds; null goes back to Liftmark's recommendation. */
export const setExerciseRest = (exerciseId: number, seconds: number | null) =>
  db.update(exercises).set({ restSeconds: seconds }).where(eq(exercises.id, exerciseId));
