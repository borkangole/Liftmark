import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ActivePlan, PlateauEpisode } from '@/features/progression';

interface PlateauState {
  /** The fix the user is trying, per exercise. */
  plans: Record<number, ActivePlan>;
  /** Plateaus broken so far, newest first: what worked and how fast. */
  episodes: PlateauEpisode[];
  /** A plateau just broken, for the celebration. Cleared once shown. */
  justBroken: PlateauEpisode | null;
  setPlan: (plan: ActivePlan) => void;
  stopPlan: (exerciseId: number) => void;
  breakPlan: (episode: PlateauEpisode) => void;
  clearJustBroken: () => void;
}

const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

/** Plateau fixes in progress and the record of what broke past plateaus. Stays on the device. */
export const usePlateaus = create<PlateauState>()(
  persist(
    (set) => ({
      plans: {},
      episodes: [],
      justBroken: null,
      setPlan: (plan) => set((s) => ({ plans: { ...s.plans, [plan.exerciseId]: plan } })),
      stopPlan: (exerciseId) =>
        set((s) => {
          const plans = { ...s.plans };
          delete plans[exerciseId];
          return { plans };
        }),
      breakPlan: (episode) =>
        set((s) => {
          const plans = { ...s.plans };
          delete plans[episode.exerciseId];
          return { plans, episodes: [episode, ...s.episodes].slice(0, 100), justBroken: episode };
        }),
      clearJustBroken: () => set({ justBroken: null }),
    }),
    {
      name: 'liftmark.plateaus',
      storage: syncStorage,
      version: 1,
      partialize: (s) => ({ plans: s.plans, episodes: s.episodes, justBroken: s.justBroken }),
    },
  ),
);
