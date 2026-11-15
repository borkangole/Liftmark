import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DaySteps, SleepNight } from '@/features/health/health';

export type HealthShare = 'steps' | 'sleep' | 'weight' | 'workouts';

interface HealthState {
  /** The user connected Apple Health / Health Connect from the Health screen. */
  connected: boolean;
  share: Record<HealthShare, boolean>;
  steps: DaySteps[];
  nights: SleepNight[];
  lastSync: string | null;
  /** Weigh-in weeks already imported from a scale (so a deleted one isn't brought back). */
  importedWeeks: string[];
  /** Workouts already sent, newest last. */
  exported: number[];
  /** The "Connect your watch" card on Today was closed. */
  promptDismissed: boolean;
  dismissPrompt: () => void;
  connect: () => void;
  disconnect: () => void;
  setShare: (key: HealthShare, on: boolean) => void;
  setData: (data: { steps?: DaySteps[]; nights?: SleepNight[] }) => void;
  markImported: (weeks: string[]) => void;
  markExported: (ids: number[]) => void;
}

const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

const ALL_ON: Record<HealthShare, boolean> = { steps: true, sleep: true, weight: true, workouts: true };

export const useHealth = create<HealthState>()(
  persist(
    (set) => ({
      connected: false,
      share: ALL_ON,
      steps: [],
      nights: [],
      lastSync: null,
      importedWeeks: [],
      exported: [],
      promptDismissed: false,
      dismissPrompt: () => set({ promptDismissed: true }),
      connect: () => set({ connected: true }),
      disconnect: () => set({ connected: false, steps: [], nights: [], lastSync: null }),
      setShare: (key, on) =>
        set((s) => ({
          share: { ...s.share, [key]: on },
          ...(key === 'steps' && !on && { steps: [] }),
          ...(key === 'sleep' && !on && { nights: [] }),
        })),
      setData: (data) => set({ ...data, lastSync: new Date().toISOString() }),
      markImported: (weeks) => set((s) => ({ importedWeeks: [...new Set([...s.importedWeeks, ...weeks])].slice(-60) })),
      markExported: (ids) => set((s) => ({ exported: [...new Set([...s.exported, ...ids])].slice(-200) })),
    }),
    {
      name: 'liftmark.health',
      storage: syncStorage,
      version: 1,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<HealthState>;
        return { ...current, ...p, share: { ...ALL_ON, ...p.share } };
      },
    },
  ),
);
