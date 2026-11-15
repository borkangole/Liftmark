import { estimateOneRepMax } from './oneRepMax';
import type { LoggedSet, Session } from './types';

/** What a set's `reps` field counts: repetitions, or seconds for timed holds like Plank. */
export type Measure = 'reps' | 'time';

/**
 * How a lift's strength is scored:
 * - `weighted`: estimated 1RM of the weight on the bar
 * - `bodyweight`: estimated 1RM of your bodyweight plus any added weight (pull-ups, dips…)
 * - `timed`: the longest hold, in seconds
 */
export type LoadType = 'weighted' | 'bodyweight' | 'timed';

export interface ScoreContext {
  type: LoadType;
  /** The lifter's bodyweight; only used for `bodyweight` lifts. */
  bodyweightKg: number;
}

/** Used when no profile exists yet, so bodyweight lifts still get a sensible score. */
export const DEFAULT_BODYWEIGHT_KG = 75;

export function loadTypeOf(exercise: { equipment: string; measure?: Measure | null }): LoadType {
  if (exercise.measure === 'time') return 'timed';
  return exercise.equipment === 'bodyweight' ? 'bodyweight' : 'weighted';
}

export function scoreContext(
  exercise: { equipment: string; measure?: Measure | null },
  bodyweightKg: number | null | undefined,
): ScoreContext {
  return {
    type: loadTypeOf(exercise),
    bodyweightKg: bodyweightKg && bodyweightKg > 0 ? bodyweightKg : DEFAULT_BODYWEIGHT_KG,
  };
}

/** One set's strength score: estimated 1RM in kg, or hold seconds for timed lifts. */
export function setScore(set: { weight: number; reps: number }, ctx: ScoreContext): number {
  if (set.reps <= 0) return 0;
  if (ctx.type === 'timed') return set.reps;
  if (ctx.type === 'bodyweight') return estimateOneRepMax(ctx.bodyweightKg + set.weight, set.reps);
  return estimateOneRepMax(set.weight, set.reps);
}

/**
 * Rewrites sets so the trend engine (which reads weight × reps) sees each set's real score:
 * bodyweight lifts carry your bodyweight, and a timed hold becomes a single "rep" of its seconds,
 * whose estimated 1RM is exactly the hold time. Suggestions should keep using the raw sessions.
 */
export function toScoredSessions(sessions: Session[], ctx: ScoreContext): Session[] {
  if (ctx.type === 'weighted') return sessions;
  const convert = (s: LoggedSet): LoggedSet =>
    ctx.type === 'timed'
      ? { weight: s.reps, reps: s.reps > 0 ? 1 : 0, isWarmup: s.isWarmup }
      : { weight: ctx.bodyweightKg + s.weight, reps: s.reps, isWarmup: s.isWarmup };
  return sessions.map((session) => ({ date: session.date, sets: session.sets.map(convert) }));
}
