import type { Session } from '@/features/progression';
import type { Workout, WorkoutSet } from './schema';

/** Groups an exercise's sets (joined with their workout) into per-workout sessions for the progression engine. */
export function toSessions(rows: { set: WorkoutSet; workout: Workout }[]): Session[] {
  const byWorkout = new Map<number, Session>();
  for (const { set, workout } of rows) {
    const session = byWorkout.get(workout.id) ?? { date: workout.startedAt, sets: [], workoutId: workout.id };
    session.sets.push({ reps: set.reps, weight: set.weight, isWarmup: set.isWarmup });
    byWorkout.set(workout.id, session);
  }
  return [...byWorkout.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}
