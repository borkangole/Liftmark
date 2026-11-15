import type { DaySteps, SleepNight, WeightSample } from '@/features/health/health';

export type HealthStatus = 'ok' | 'unavailable' | 'needs-install';

export interface ExportedWorkout {
  id: number;
  name: string;
  start: Date;
  end: Date;
}

/** One phone health store: Apple Health on iPhone, Health Connect on Android. */
export interface HealthSource {
  name: 'Apple Health' | 'Health Connect';
  status(): Promise<HealthStatus>;
  /** Shows the system permission sheet. Resolves true once the sheet was answered. */
  requestAccess(): Promise<boolean>;
  steps(from: Date, to: Date): Promise<DaySteps[]>;
  sleep(from: Date, to: Date): Promise<{ start: Date; end: Date }[]>;
  weights(from: Date, to: Date): Promise<WeightSample[]>;
  saveWorkout(w: ExportedWorkout): Promise<void>;
  /** Where the user can change what Liftmark may read. */
  openSettings(): void;
}

export type { DaySteps, SleepNight, WeightSample };
