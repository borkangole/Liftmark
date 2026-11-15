import { create } from 'zustand';

import type { Pair } from '@/features/superset/superset';

/**
 * Session-only workout state. Sets live in SQLite; this holds what isn't worth persisting:
 * exercises added but not yet logged, and the rest timer.
 */
export interface Celebration {
  id: number;
  title: string;
  detail: string;
}

interface ActiveWorkoutState {
  exerciseIdsByWorkout: Record<number, number[]>;
  /** Supersets changed during this workout. Absent = use the routine's pairs. */
  pairsByWorkout: Record<number, Pair[]>;
  setPairs: (workoutId: number, pairs: Pair[]) => void;
  /** In a superset, the exercise to do next without resting. */
  goNext: number | null;
  setGoNext: (exerciseId: number | null) => void;
  restEndsAt: number | null;
  restDuration: number;
  addExercise: (workoutId: number, exerciseId: number) => void;
  clearWorkout: (workoutId: number) => void;
  startRest: (seconds: number) => void;
  addRest: (seconds: number) => void;
  clearRest: () => void;
  celebration: Celebration | null;
  celebrate: (c: Omit<Celebration, 'id'>) => void;
  clearCelebration: () => void;
}

export const useActiveWorkout = create<ActiveWorkoutState>((set) => ({
  exerciseIdsByWorkout: {},
  pairsByWorkout: {},
  setPairs: (workoutId, pairs) => set((s) => ({ pairsByWorkout: { ...s.pairsByWorkout, [workoutId]: pairs } })),
  goNext: null,
  setGoNext: (goNext) => set({ goNext }),
  restEndsAt: null,
  restDuration: 0,
  addExercise: (workoutId, exerciseId) =>
    set((s) => {
      const ids = s.exerciseIdsByWorkout[workoutId] ?? [];
      if (ids.includes(exerciseId)) return s;
      return { exerciseIdsByWorkout: { ...s.exerciseIdsByWorkout, [workoutId]: [...ids, exerciseId] } };
    }),
  clearWorkout: (workoutId) =>
    set((s) => {
      const { [workoutId]: _removed, ...rest } = s.exerciseIdsByWorkout;
      const { [workoutId]: _pairs, ...pairs } = s.pairsByWorkout;
      return { exerciseIdsByWorkout: rest, pairsByWorkout: pairs, restEndsAt: null, goNext: null };
    }),
  startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000, restDuration: seconds }),
  addRest: (seconds) =>
    set((s) =>
      s.restEndsAt ? { restEndsAt: s.restEndsAt + seconds * 1000, restDuration: s.restDuration + seconds } : s,
    ),
  clearRest: () => set({ restEndsAt: null }),
  celebration: null,
  celebrate: (c) => set({ celebration: { ...c, id: Date.now() } }),
  clearCelebration: () => set({ celebration: null }),
}));
