import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Where a freshly switched split starts, until its first workout is logged. */
export interface StartOverride {
  routineId: number;
  dayId: number;
  setAt: string;
}

/** Splits that take turns week by week, in order. */
export interface Rotation {
  routineIds: number[];
  /** Monday the rotation started (YYYY-MM-DD). */
  startWeek: string;
  /** Last week the switch was applied, so it happens once per week. */
  appliedWeek: string;
}

interface SplitState {
  startDay: StartOverride | null;
  rotation: Rotation | null;
  setStartDay: (routineId: number, dayId: number) => void;
  setRotation: (rotation: Rotation | null) => void;
  markApplied: (week: string) => void;
  /** Drops a deleted routine from everything. */
  forget: (routineId: number) => void;
}

const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

export const useSplit = create<SplitState>()(
  persist(
    (set) => ({
      startDay: null,
      rotation: null,
      setStartDay: (routineId, dayId) => set({ startDay: { routineId, dayId, setAt: new Date().toISOString() } }),
      setRotation: (rotation) => set({ rotation }),
      markApplied: (week) => set((s) => (s.rotation ? { rotation: { ...s.rotation, appliedWeek: week } } : s)),
      forget: (routineId) =>
        set((s) => {
          const ids = s.rotation?.routineIds.filter((id) => id !== routineId) ?? [];
          return {
            startDay: s.startDay?.routineId === routineId ? null : s.startDay,
            rotation: s.rotation && ids.length >= 2 ? { ...s.rotation, routineIds: ids } : null,
          };
        }),
    }),
    { name: 'liftmark.split', storage: syncStorage, version: 1 },
  ),
);
