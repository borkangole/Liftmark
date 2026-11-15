import { getRoutine, getUpNext, getWorkoutPlan, listRoutines } from '@/db/routines';
import { useLiveTables } from './useLiveTables';

const ROUTINE_TABLES = ['routines', 'routine_days', 'routine_exercises', 'exercises'];

export const useRoutines = () => useLiveTables(listRoutines, ROUTINE_TABLES, []);

export const useRoutine = (routineId: number) =>
  useLiveTables(() => getRoutine(routineId), ROUTINE_TABLES, null, [routineId]);

export const useUpNext = () => useLiveTables(getUpNext, [...ROUTINE_TABLES, 'workouts'], null);

export const useWorkoutPlan = (workoutId: number) =>
  useLiveTables(() => getWorkoutPlan(workoutId), ['workouts', 'routine_exercises'], [], [workoutId]);
