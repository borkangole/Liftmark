import { and, asc, eq, inArray, lte } from 'drizzle-orm';

import {
  detectPersonalRecords,
  scoreContext,
  summarizeSession,
  toScoredSessions,
  type LoadType,
  type PrKind,
} from '@/features/progression';
import { db } from './client';
import { exercises, sets, workouts } from './schema';
import { toSessions } from './sessions';

export interface ExerciseResult {
  exerciseId: number;
  name: string;
  type: LoadType;
  workingSets: number;
  topWeight: number;
  /** Reps of the top set; seconds for timed holds. */
  topReps: number;
  /** e1RM in kg (bodyweight included for bodyweight lifts), or the longest hold in seconds. */
  bestE1rm: number;
  volume: number;
  prs: PrKind[];
}

export interface WorkoutSummary {
  name: string | null;
  durationMs: number;
  setCount: number;
  volume: number;
  exercises: ExerciseResult[];
}

/** Totals and PRs for a finished workout, compared against every earlier session. */
export async function getWorkoutSummary(
  workoutId: number,
  bodyweightKg?: number | null,
): Promise<WorkoutSummary | null> {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, workoutId));
  if (!workout) return null;

  const current = await db
    .select({ set: sets, exercise: exercises })
    .from(sets)
    .innerJoin(exercises, eq(sets.exerciseId, exercises.id))
    .where(eq(sets.workoutId, workoutId))
    .orderBy(asc(sets.order));

  const order: number[] = [];
  const info = new Map<number, (typeof current)[number]['exercise']>();
  for (const { exercise } of current) {
    if (!info.has(exercise.id)) order.push(exercise.id);
    info.set(exercise.id, exercise);
  }

  const history =
    order.length === 0
      ? []
      : await db
          .select({ set: sets, workout: workouts })
          .from(sets)
          .innerJoin(workouts, eq(sets.workoutId, workouts.id))
          .where(and(inArray(sets.exerciseId, order), lte(workouts.startedAt, workout.startedAt)))
          .orderBy(asc(workouts.startedAt), asc(sets.order));

  const results: ExerciseResult[] = order.map((exerciseId) => {
    const exercise = info.get(exerciseId)!;
    const ctx = scoreContext(exercise, bodyweightKg);
    const rows = history.filter((r) => r.set.exerciseId === exerciseId);
    const sessions = toSessions(rows);
    const thisSession = toSessions(rows.filter((r) => r.workout.id === workoutId))[0];
    const summary = thisSession
      ? summarizeSession(thisSession)
      : { bestE1rm: 0, topWeight: 0, volume: 0, totalReps: 0 };
    const scored = thisSession ? summarizeSession(toScoredSessions([thisSession], ctx)[0]) : summary;
    const working = thisSession?.sets.filter((s) => !s.isWarmup) ?? [];
    const topReps = Math.max(0, ...working.filter((s) => s.weight === summary.topWeight).map((s) => s.reps));
    // PRs compare scores, so a pull-up or plank PR means a real improvement, not just "more than 0 kg".
    const prs = detectPersonalRecords(toScoredSessions(sessions, ctx));
    return {
      exerciseId,
      name: exercise.name,
      type: ctx.type,
      workingSets: working.length,
      topWeight: summary.topWeight,
      topReps,
      bestE1rm: scored.bestE1rm,
      volume: summary.volume,
      // For a hold, "heaviest" and "volume" just repeat the longest-hold record.
      prs: ctx.type === 'timed' ? prs.filter((k) => k === 'e1rm') : prs,
    };
  });

  return {
    name: workout.name,
    durationMs: (workout.endedAt ?? new Date()).getTime() - workout.startedAt.getTime(),
    setCount: current.filter((r) => !r.set.isWarmup).length,
    volume: results.reduce((sum, r) => sum + r.volume, 0),
    exercises: results,
  };
}
