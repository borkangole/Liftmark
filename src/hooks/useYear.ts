import { useMemo } from 'react';

import { fetchWorkoutDays } from '@/db/history';
import { buildYear } from '@/features/progress/year';
import { useLiveTables } from './useLiveTables';

const TABLES = ['sets', 'workouts'];

/** The training calendar for one year, kept live as workouts are logged or deleted. */
export function useYear(year: number) {
  const workouts = useLiveTables(fetchWorkoutDays, TABLES, []);
  return useMemo(() => buildYear(workouts, year), [workouts, year]);
}
