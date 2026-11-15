import type { LoadType } from './measure';
import { workingSets } from './oneRepMax';
import type { TrendResult } from './plateau';
import type { RepRange, Session } from './types';

export type SuggestionKind = 'add_weight' | 'add_reps' | 'repeat' | 'deload' | 'first_session';

export interface Suggestion {
  kind: SuggestionKind;
  weight: number;
  targetReps: number;
  sets: number;
  reason: string;
}

export interface SuggestOptions {
  repRange: RepRange;
  increment: number;
  /** Fraction of weight to drop for a deload. */
  deloadFactor?: number;
  /** Sessions without a PR, while stalling or regressing, before suggesting a deload. */
  deloadAfter?: number;
  /** How the lift is loaded. Bodyweight lifts progress on added weight; timed holds on seconds. */
  type?: LoadType;
  /** Formats a weight in kg for the reason text, e.g. in the user's unit. */
  formatWeight?: (kg: number) => string;
  /**
   * Snap a "stay at this weight" target to the increment too. Used in lb mode, where weights
   * logged in kg (or before switching units) would otherwise read like "170.9 lb".
   */
  snapToIncrement?: boolean;
}

/** Timed holds progress in 5-second steps. */
const HOLD_STEP_SECONDS = 5;

export const roundToIncrement = (value: number, increment: number) =>
  increment > 0 ? Math.round(value / increment) * increment : value;

/**
 * Next-session target using double progression:
 * hit the top of the rep range on every working set → add weight; otherwise add reps.
 * A long plateau or a downward trend triggers a deload instead.
 */
export function suggestNextSession(
  lastSession: Session | undefined,
  trend: TrendResult,
  {
    repRange,
    increment,
    deloadFactor = 0.9,
    deloadAfter = 5,
    type = 'weighted',
    formatWeight = (kg) => String(kg),
    snapToIncrement = false,
  }: SuggestOptions,
): Suggestion | null {
  if (!lastSession) {
    return null;
  }
  const sets = workingSets(lastSession.sets);
  if (sets.length === 0) return null;

  const topWeight = Math.max(...sets.map((s) => s.weight));
  const topSets = sets.filter((s) => s.weight === topWeight);
  const setCount = topSets.length;
  const minReps = Math.min(...topSets.map((s) => s.reps));

  const needsDeload =
    trend.status === 'regressing' || (trend.status === 'stalling' && trend.sessionsSincePr >= deloadAfter);

  // Timed holds (reps = seconds): add 5 s per session, or back off after a plateau.
  if (type === 'timed') {
    const best = Math.max(...sets.map((s) => s.reps));
    const target = needsDeload
      ? Math.max(HOLD_STEP_SECONDS, Math.round((best * deloadFactor) / HOLD_STEP_SECONDS) * HOLD_STEP_SECONDS)
      : Math.ceil((best + 1) / HOLD_STEP_SECONDS) * HOLD_STEP_SECONDS;
    return needsDeload
      ? {
          kind: 'deload',
          weight: 0,
          targetReps: target,
          sets: sets.length,
          reason: `${trend.reason} Hold ${target} s for an easier session, then build back up.`,
        }
      : {
          kind: 'add_reps',
          weight: 0,
          targetReps: target,
          sets: sets.length,
          reason: `Your best hold was ${best} s. Aim for ${target} s on every set.`,
        };
  }

  // Bodyweight lifts with nothing added: a deload means fewer reps, not less weight.
  const isBodyweightOnly = type === 'bodyweight' && topWeight === 0;
  const load = (kg: number) =>
    type === 'bodyweight' ? (kg > 0 ? `bodyweight + ${formatWeight(kg)}` : 'bodyweight') : formatWeight(kg);

  if (needsDeload && isBodyweightOnly) {
    const targetReps = Math.max(1, Math.round(minReps * 0.8));
    return {
      kind: 'deload',
      weight: 0,
      targetReps,
      sets: setCount,
      reason: `${trend.reason} Do ${targetReps} easy reps per set this session, then build back up.`,
    };
  }

  if (needsDeload) {
    const weight = roundToIncrement(topWeight * deloadFactor, increment);
    return {
      kind: 'deload',
      weight,
      targetReps: repRange.max,
      sets: setCount,
      reason: `${trend.reason} Drop to ${load(weight)} for a lighter session, then build back up.`,
    };
  }

  if (minReps >= repRange.max) {
    const weight = roundToIncrement(topWeight + increment, increment);
    return {
      kind: 'add_weight',
      weight,
      targetReps: repRange.min,
      sets: setCount,
      reason:
        type === 'bodyweight'
          ? `You hit ${repRange.max}+ reps on every set at ${load(topWeight)}. Add ${formatWeight(weight - topWeight)} with a belt or vest.`
          : `You hit ${repRange.max}+ reps on every set at ${formatWeight(topWeight)}. Go up to ${formatWeight(weight)}.`,
    };
  }

  const targetReps = Math.min(Math.max(minReps + 1, repRange.min), repRange.max);
  const holdWeight = snapToIncrement && topWeight > 0 ? roundToIncrement(topWeight, increment) : topWeight;
  return {
    kind: 'add_reps',
    weight: holdWeight,
    targetReps,
    sets: setCount,
    reason: `Stay at ${load(holdWeight)} and aim for ${targetReps} reps on every set.`,
  };
}
