import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { WeightUnit } from '@/lib/units';

export { fromDisplayWeight, KG_PER_LB, toDisplayWeight, type WeightUnit } from '@/lib/units';

export type RestMode = 'smart' | 'fixed';

interface SettingsState {
  unit: WeightUnit;
  /** 'smart' = rest picked per exercise from the evidence; 'fixed' = `defaultRestSeconds` for everything. */
  restMode: RestMode;
  defaultRestSeconds: number;
  /** Notify when rest is over, even with the phone locked. */
  restAlerts: boolean;
  setUnit: (unit: WeightUnit) => void;
  setRestMode: (mode: RestMode) => void;
  setDefaultRest: (seconds: number) => void;
  setRestAlerts: (on: boolean) => void;
}

/** Synchronous key-value storage, so settings are ready on the very first render. */
const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      unit: 'kg',
      restMode: 'smart',
      defaultRestSeconds: 120,
      restAlerts: true,
      setUnit: (unit) => set({ unit }),
      setRestMode: (restMode) => set({ restMode }),
      setDefaultRest: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setRestAlerts: (restAlerts) => set({ restAlerts }),
    }),
    // Key predates the Liftmark rename; kept so saved settings survive the update.
    {
      name: 'repster.settings',
      storage: syncStorage,
      version: 2,
      // v1 had one rest time for every exercise, picked at onboarding. Move everyone to per-exercise rest.
      migrate: (state, version) => {
        const s = state as Partial<SettingsState>;
        return version < 2 ? { ...s, restMode: 'smart' } : s;
      },
    },
  ),
);
