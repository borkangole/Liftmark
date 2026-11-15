/** A single logged set, independent of the database layer so the engine stays pure and testable. */
export interface LoggedSet {
  reps: number;
  weight: number;
  isWarmup?: boolean;
}

/** All sets of one exercise performed in one workout. */
export interface Session {
  date: Date;
  sets: LoggedSet[];
  /** The workout these sets came from, when known (lets the UI link back to it). */
  workoutId?: number;
}

export interface RepRange {
  min: number;
  max: number;
}

export type TrendStatus = 'insufficient_data' | 'progressing' | 'stalling' | 'regressing';
