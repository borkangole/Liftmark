import { useMemo } from 'react';

import { fetchHistoryRows, getWorkoutDetail } from '@/db/history';
import { buildHistory } from '@/features/history/history';
import { useProfile } from '@/stores/useProfile';
import { useLiveTables } from './useLiveTables';

const TABLES = ['sets', 'workouts', 'exercises'];

export function useHistory() {
  const rows = useLiveTables(fetchHistoryRows, TABLES, []);
  const bodyweightKg = useProfile((s) => s.profile?.weightKg);
  return useMemo(() => buildHistory(rows, { bodyweightKg }), [rows, bodyweightKg]);
}

export function useWorkoutDetail(workoutId: number) {
  const bodyweightKg = useProfile((s) => s.profile?.weightKg);
  return useLiveTables(() => getWorkoutDetail(workoutId, bodyweightKg), TABLES, null, [workoutId, bodyweightKg]);
}
