import { Platform } from 'react-native';

import type { HealthSource } from './types';

/** The phone's health store, or null where there isn't one (web). */
export const health: HealthSource | null =
  Platform.OS === 'ios'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('./apple') as typeof import('./apple')).appleHealth
    : Platform.OS === 'android'
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('./android') as typeof import('./android')).healthConnect
      : null;

export type { ExportedWorkout, HealthSource, HealthStatus } from './types';
