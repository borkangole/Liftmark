import type { LoggedSet, Session } from './types';

/**
 * Estimated one-rep max using the Epley formula.
 * Accuracy drops above ~12 reps, so higher-rep sets are still counted but weigh less in practice.
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export const workingSets = (sets: LoggedSet[]) => sets.filter((s) => !s.isWarmup && s.reps > 0);

export interface SessionSummary {
  date: Date;
  bestE1rm: number;
  topWeight: number;
  volume: number; // sum of reps x weight across working sets
  totalReps: number;
}

export function summarizeSession(session: Session): SessionSummary {
  const sets = workingSets(session.sets);
  return {
    date: session.date,
    bestE1rm: Math.max(0, ...sets.map((s) => estimateOneRepMax(s.weight, s.reps))),
    topWeight: Math.max(0, ...sets.map((s) => s.weight)),
    volume: sets.reduce((sum, s) => sum + s.reps * s.weight, 0),
    totalReps: sets.reduce((sum, s) => sum + s.reps, 0),
  };
}
