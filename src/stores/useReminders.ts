import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_REMINDERS,
  type ClockTime,
  type PlateauAlert,
  type ReminderKind,
  type ReminderSettings,
} from '@/features/reminders/plan';

interface RemindersState {
  settings: ReminderSettings;
  /** Last plateau state already announced per lift, so each stall is mentioned once. */
  announced: Record<number, PlateauAlert['state']>;
  /** The newest stall to announce, and when it was found. */
  pending: (PlateauAlert & { foundAt: string }) | null;
  toggle: (kind: ReminderKind, on: boolean) => void;
  setTime: (key: 'workoutTime' | 'eveningTime' | 'weighInTime', minutes: ClockTime) => void;
  setWorkoutDays: (days: number[] | null) => void;
  /** Called with every lift's current state; queues one alert for a lift that just started stalling. */
  observePlateaus: (lifts: { exerciseId: number; name: string; state: PlateauAlert['state'] | null }[]) => void;
}

const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

export const useReminders = create<RemindersState>()(
  persist(
    (set) => ({
      settings: DEFAULT_REMINDERS,
      announced: {},
      pending: null,
      toggle: (kind, on) => set((s) => ({ settings: { ...s.settings, enabled: { ...s.settings.enabled, [kind]: on } } })),
      setTime: (key, minutes) => set((s) => ({ settings: { ...s.settings, [key]: ((minutes % 1440) + 1440) % 1440 } })),
      setWorkoutDays: (workoutDays) => set((s) => ({ settings: { ...s.settings, workoutDays } })),
      observePlateaus: (lifts) =>
        set((s) => {
          const announced = { ...s.announced };
          let pending = s.pending;
          let changed = false;
          for (const l of lifts) {
            const before = announced[l.exerciseId];
            if (l.state === null) {
              if (before) {
                delete announced[l.exerciseId];
                changed = true;
              }
              continue;
            }
            // Slowing → stuck is news; stuck → slowing (getting better) is not.
            if (before === l.state || (before === 'stuck' && l.state === 'slowing')) continue;
            announced[l.exerciseId] = l.state;
            pending = { exerciseId: l.exerciseId, name: l.name, state: l.state, foundAt: new Date().toISOString() };
            changed = true;
          }
          return changed ? { announced, pending } : s;
        }),
    }),
    {
      name: 'liftmark.reminders',
      storage: syncStorage,
      version: 1,
      // New reminder kinds added later get their default.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RemindersState>;
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_REMINDERS,
            ...p.settings,
            enabled: { ...DEFAULT_REMINDERS.enabled, ...p.settings?.enabled },
          },
        };
      },
    },
  ),
);
