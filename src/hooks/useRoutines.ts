import { getRoutine, getUpNext, getWorkoutPlan, listRoutines } from '@/db/routines';
import { useSplit } from '@/stores/useSplit';
import { useLiveTables } from './useLiveTables';

const ROUTINE_TABLES = ['routines', 'routine_days', 'routine_exercises', 'exercises'];

export const useRoutines = () => useLiveTables(listRoutines, ROUTINE_TABLES, []);

export const useRoutine = (routineId: number) =>
  useLiveTables(() => getRoutine(routineId), ROUTINE_TABLES, null, [routineId]);

export function useUpNext() {
  const start = useSplit((s) => s.startDay);
  return useLiveTables(() => getUpNext(start), [...ROUTINE_TABLES, 'workouts'], null, [start?.routineId, start?.dayId, start?.setAt]);
}

export const useWorkoutPlan = (workoutId: number) =>
  useLiveTables(() => getWorkoutPlan(workoutId), ['workouts', 'routine_exercises'], [], [workoutId]);
