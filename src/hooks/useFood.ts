import { useMemo } from 'react';

import {
  customFoodToFood,
  fetchCustomFoods,
  fetchDayEntries,
  fetchDayTotals,
  fetchRecentKeys,
  trainedOn,
  type FoodEntry,
} from '@/db/food';
import type { CustomFood } from '@/db/schema';
import { recommendCalories } from '@/features/bodyweight/nutrition';
import { dayKeyOf } from '@/features/bodyweight/trend';
import { FOODS, type Food } from '@/features/nutrition/foods';
import { measureMaintenance } from '@/features/nutrition/measured';
import { customTargets, targetsFromAdvice, type DailyTargets } from '@/features/nutrition/plan';
import type { DayTotal } from '@/features/nutrition/suggest';
import { useNutrition } from '@/stores/useNutrition';
import { useProfile } from '@/stores/useProfile';
import { useBodyweight } from './useBodyweight';
import { useLiveTables } from './useLiveTables';

const FOOD_TABLES = ['food_entries'];
const CUSTOM_TABLES = ['custom_foods'];
const NO_ENTRIES: FoodEntry[] = [];
const NO_TOTALS: DayTotal[] = [];
const NO_CUSTOM: CustomFood[] = [];
const NO_KEYS: string[] = [];

export const todayKey = () => dayKeyOf(new Date());

export function shiftDay(day: string, by: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKeyOf(new Date(y, m - 1, d + by));
}

/** Live food log for one day. */
export const useFoodDay = (day: string) => useLiveTables(() => fetchDayEntries(day), FOOD_TABLES, NO_ENTRIES, [day]);

/** Daily totals for the `days` days ending on `day` (inclusive). */
export function useFoodTotals(day: string, days: number) {
  const from = shiftDay(day, -(days - 1));
  return useLiveTables(() => fetchDayTotals(from, day), FOOD_TABLES, NO_TOTALS, [from, day]);
}

/**
 * Built-in foods plus the user's own, theirs first. Where the user saved their own version of a
 * built-in food, theirs replaces it everywhere, and recent keys point to it.
 */
export function useAllFoods(): { foods: Food[]; custom: Food[]; alias: (key: string) => string } {
  const rows = useLiveTables(fetchCustomFoods, CUSTOM_TABLES, NO_CUSTOM);
  return useMemo(() => {
    const custom = rows.map(customFoodToFood);
    const replaced = new Map(custom.filter((f) => f.baseKey).map((f) => [f.baseKey!, f.key]));
    const foods = [...custom, ...FOODS.filter((f) => !replaced.has(f.key))];
    return { custom, foods, alias: (key: string) => replaced.get(key) ?? key };
  }, [rows]);
}

/** Food keys logged recently, most recent first, pointing at the user's own versions where they made one. */
export function useRecentFoodKeys(): string[] {
  const raw = useLiveTables(() => fetchRecentKeys(30), FOOD_TABLES, NO_KEYS);
  const { alias } = useAllFoods();
  return useMemo(() => [...new Set(raw.map(alias))], [raw, alias]);
}

export const useTrainedOn = (day: string) => useLiveTables(() => trainedOn(day), ['workouts'], false, [day]);

/**
 * What the user should eat a day, and where that number comes from:
 * their own numbers if they typed some, else Liftmark's recommendation for their body goal, using
 * maintenance measured from their logs and weigh-ins once there's enough data.
 */
export function useFoodTargets() {
  const profile = useProfile((s) => s.profile);
  const lifestyle = useProfile((s) => s.lifestyle ?? 'sitting');
  const { goal, analysis, entries: weighIns, calories } = useBodyweight();
  const customTarget = useNutrition((s) => s.customTarget);
  const useMeasured = useNutrition((s) => s.useMeasured);
  const history = useFoodTotals(todayKey(), 42);

  const measured = useMemo(() => measureMaintenance(history, weighIns), [history, weighIns]);
  const measuredAdvice = useMemo(
    () =>
      goal && profile && measured.ok
        ? recommendCalories(profile, goal, lifestyle, null, measured.value.maintenance)
        : null,
    [goal, profile, lifestyle, measured],
  );

  const advice = useMeasured && measuredAdvice ? measuredAdvice : calories;
  const targets: DailyTargets | null = useMemo(() => {
    if (customTarget) return customTargets(customTarget.kcal, customTarget.proteinG, profile?.weightKg ?? 70);
    if (!advice) return null;
    return targetsFromAdvice(advice, useMeasured && measuredAdvice ? 'measured' : 'goal');
  }, [customTarget, advice, profile?.weightKg, useMeasured, measuredAdvice]);

  return { targets, advice, formulaAdvice: calories, measured, goal, analysis, profile, customTarget, weighIns };
}
