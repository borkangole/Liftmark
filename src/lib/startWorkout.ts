import { desc, isNull } from 'drizzle-orm';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { db } from '@/db/client';
import { startWorkoutFromDay } from '@/db/routines';
import { workouts } from '@/db/schema';
import { useActiveWorkout } from '@/stores/useActiveWorkout';

const openWorkout = (id: number) => router.push({ pathname: '/workout/[id]', params: { id: String(id) } });

/**
 * Starts a workout (from a routine day, or empty with optional exercises pre-added),
 * unless one is already running.
 */
export async function startWorkout(dayId?: number, options: { name?: string | null; exerciseIds?: number[] } = {}) {
  const [running] = await db
    .select({ id: workouts.id, name: workouts.name })
    .from(workouts)
    .where(isNull(workouts.endedAt))
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  if (running) {
    Alert.alert('Workout in progress', `Finish ${running.name ?? 'your current workout'} before starting another.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resume', onPress: () => openWorkout(running.id) },
    ]);
    return;
  }

  if (dayId !== undefined) {
    openWorkout(await startWorkoutFromDay(dayId));
  } else {
    const [row] = await db
      .insert(workouts)
      .values({ startedAt: new Date(), name: options.name ?? null })
      .returning({ id: workouts.id });
    const { addExercise } = useActiveWorkout.getState();
    options.exerciseIds?.forEach((id) => addExercise(row.id, id));
    openWorkout(row.id);
  }
}
