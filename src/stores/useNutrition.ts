import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NutritionState {
  /** Calories and protein the user typed in themselves (from a coach or dietitian). Null = Liftmark's recommendation. */
  customTarget: { kcal: number; proteinG: number } | null;
  /** Use maintenance measured from the food log and weigh-ins, once there's enough data. */
  useMeasured: boolean;
  setCustomTarget: (t: { kcal: number; proteinG: number } | null) => void;
  setUseMeasured: (on: boolean) => void;
}

const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

/** Food-log preferences. Stays on the device. */
export const useNutrition = create<NutritionState>()(
  persist(
    (set) => ({
      customTarget: null,
      useMeasured: true,
      setCustomTarget: (customTarget) => set({ customTarget }),
      setUseMeasured: (useMeasured) => set({ useMeasured }),
    }),
    { name: 'liftmark.nutrition', storage: syncStorage, version: 1 },
  ),
);
