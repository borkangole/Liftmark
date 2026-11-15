import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Lifestyle } from '@/features/bodyweight/nutrition';
import type { BodyGoal } from '@/features/bodyweight/trend';
import type { Profile } from '@/features/profile/types';

interface ProfileState {
  profile: Profile | null;
  completedAt: number | null;
  saveProfile: (profile: Profile) => void;
  updateWeight: (weightKg: number) => void;
  /** What the bodyweight tracker judges the trend against. Null until the user picks one. */
  bodyGoal: BodyGoal | null;
  /** Optional goal weight in kg, for the "weeks to go" estimate. */
  targetWeightKg: number | null;
  /** Day of the week for the weekly morning weigh-in (0 = Sunday … 6 = Saturday). */
  weighInDay: number;
  /** How active the user is outside the gym, for the calorie estimate. */
  lifestyle: Lifestyle;
  setBodyGoal: (goal: BodyGoal, targetWeightKg: number | null, weighInDay: number, lifestyle: Lifestyle) => void;
}

const syncStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));

/** The user's body stats and training profile, set during onboarding. Stays on the device. */
export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      completedAt: null,
      saveProfile: (profile) => set({ profile, completedAt: Date.now() }),
      updateWeight: (weightKg) => set((s) => (s.profile ? { profile: { ...s.profile, weightKg } } : s)),
      bodyGoal: null,
      targetWeightKg: null,
      weighInDay: 1,
      lifestyle: 'sitting',
      setBodyGoal: (bodyGoal, targetWeightKg, weighInDay, lifestyle) =>
        set({ bodyGoal, targetWeightKg, weighInDay, lifestyle }),
    }),
    { name: 'liftmark.profile', storage: syncStorage, version: 1 },
  ),
);
