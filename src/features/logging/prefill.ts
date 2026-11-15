import type { Suggestion } from '@/features/progression';

export interface SetValues {
  weight: number;
  reps: number;
}

export type PrefillSource = 'this_workout' | 'suggestion' | 'last_session' | 'profile' | 'none';

export interface PrefillInput {
  /** The last set logged for this exercise in the current workout. */
  lastLogged?: SetValues;
  /** Liftmark's suggestion for this session. */
  suggestion?: Suggestion | null;
  /** Heaviest working set from the previous session. */
  lastSessionTopSet?: SetValues | null;
  /** First-time estimate from the user's bodyweight and experience. */
  starter?: SetValues | null;
}

export interface Prefill {
  weight: number | null;
  reps: number | null;
  source: PrefillSource;
}

/**
 * What to put in the weight/reps inputs before the user types anything.
 * Repeating the set you just did beats the suggestion; the suggestion beats last session.
 */
export function prefillSet({ lastLogged, suggestion, lastSessionTopSet, starter }: PrefillInput): Prefill {
  if (lastLogged) return { ...lastLogged, source: 'this_workout' };
  if (suggestion) return { weight: suggestion.weight, reps: suggestion.targetReps, source: 'suggestion' };
  if (lastSessionTopSet) return { ...lastSessionTopSet, source: 'last_session' };
  if (starter) return { ...starter, source: 'profile' };
  return { weight: null, reps: null, source: 'none' };
}

/** Parses a user-typed number, accepting "," as a decimal separator. Returns null if invalid. */
export function parseNumberInput(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() === '' || !Number.isFinite(n) || n < 0 ? null : n;
}
