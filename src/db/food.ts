import { and, asc, desc, eq, gte, isNotNull, lte, sql } from 'drizzle-orm';

import { builtInFood, type Food, type FoodValues, type Meal } from '@/features/nutrition/foods';
import type { DayTotal } from '@/features/nutrition/suggest';
import { db } from './client';
import { customFoods, foodEntries, workouts, type CustomFood, type FoodEntry } from './schema';

export type { FoodEntry } from './schema';

/** Every food logged on a day, in the order it was logged. */
export const fetchDayEntries = (day: string): Promise<FoodEntry[]> =>
  db
    .select()
    .from(foodEntries)
    .where(eq(foodEntries.day, day))
    .orderBy(asc(foodEntries.createdAt), asc(foodEntries.id));

export const fetchEntry = async (id: number): Promise<FoodEntry | undefined> =>
  (await db.select().from(foodEntries).where(eq(foodEntries.id, id)).limit(1))[0];

/** Calorie and macro totals per day between two days (inclusive). Days with nothing logged are left out. */
export async function fetchDayTotals(fromDay: string, toDay: string): Promise<DayTotal[]> {
  const rows = await db
    .select({
      day: foodEntries.day,
      kcal: sql<number>`sum(${foodEntries.kcal} * ${foodEntries.servings})`,
      proteinG: sql<number>`sum(${foodEntries.proteinG} * ${foodEntries.servings})`,
      carbsG: sql<number>`sum(${foodEntries.carbsG} * ${foodEntries.servings})`,
      fatG: sql<number>`sum(${foodEntries.fatG} * ${foodEntries.servings})`,
    })
    .from(foodEntries)
    .where(and(gte(foodEntries.day, fromDay), lte(foodEntries.day, toDay)))
    .groupBy(foodEntries.day)
    .orderBy(asc(foodEntries.day));
  return rows.map((r) => ({
    ...r,
    kcal: Number(r.kcal) || 0,
    proteinG: Number(r.proteinG) || 0,
    carbsG: Number(r.carbsG) || 0,
    fatG: Number(r.fatG) || 0,
  }));
}

export interface NewEntry extends FoodValues {
  day: string;
  meal: Meal;
  name: string;
  serving: string;
  grams?: number | null;
  servings: number;
  foodKey: string | null;
}

export const addFoodEntry = (e: NewEntry) => db.insert(foodEntries).values({ ...e, grams: e.grams ?? null });

export const updateFoodEntry = (
  id: number,
  patch: Partial<FoodValues> & { servings?: number; meal?: Meal; serving?: string; foodKey?: string | null },
) => db.update(foodEntries).set(patch).where(eq(foodEntries.id, id));

export const deleteFoodEntry = (id: number) => db.delete(foodEntries).where(eq(foodEntries.id, id));

/** Copies every entry of one day into another (e.g. "same as yesterday"). */
export async function copyDay(fromDay: string, toDay: string, meal?: Meal) {
  const rows = await fetchDayEntries(fromDay);
  const pick = meal ? rows.filter((r) => r.meal === meal) : rows;
  if (pick.length === 0) return 0;
  await db
    .insert(foodEntries)
    .values(pick.map(({ id: _id, createdAt: _c, day: _d, ...rest }) => ({ ...rest, day: toDay })));
  return pick.length;
}

/** The user's own foods, newest first. */
export const fetchCustomFoods = (): Promise<CustomFood[]> =>
  db.select().from(customFoods).orderBy(desc(customFoods.createdAt));

export function customFoodToFood(c: CustomFood): Food {
  // The user's own version of a built-in food keeps that food's grouping and meal hints.
  const base = c.baseKey ? builtInFood(c.baseKey) : undefined;
  return {
    key: `c:${c.id}`,
    name: c.name,
    serving: c.serving,
    grams: c.grams ?? undefined,
    kcal: c.kcal,
    proteinG: c.proteinG,
    carbsG: c.carbsG,
    fatG: c.fatG,
    group: base?.group ?? 'snacks',
    meals: base?.meals,
    maxServings: base?.maxServings,
    baseKey: c.baseKey ?? undefined,
  };
}

export interface NewCustomFood extends FoodValues {
  name: string;
  serving: string;
  grams?: number | null;
  baseKey?: string | null;
}

export async function saveCustomFood(f: NewCustomFood, id?: number): Promise<number> {
  const { baseKey, ...rest } = f;
  // Keep an existing link to a built-in food unless a new one is given.
  const values = { ...rest, grams: f.grams ?? null, ...(baseKey !== undefined ? { baseKey } : {}) };
  // One personal version per built-in food: update it instead of adding another.
  if (!id && f.baseKey) {
    const existing = await db
      .select({ id: customFoods.id })
      .from(customFoods)
      .where(eq(customFoods.baseKey, f.baseKey))
      .limit(1);
    if (existing[0]) id = existing[0].id;
  }
  if (id) {
    await db.update(customFoods).set(values).where(eq(customFoods.id, id));
    return id;
  }
  const res = await db.insert(customFoods).values(values).returning({ id: customFoods.id });
  return res[0].id;
}

export const deleteCustomFood = (id: number) => db.delete(customFoods).where(eq(customFoods.id, id));

export async function fetchCustomFood(id: number): Promise<CustomFood | undefined> {
  return (await db.select().from(customFoods).where(eq(customFoods.id, id)).limit(1))[0];
}

/** Food keys logged recently, most recent first, one per food. */
export async function fetchRecentKeys(limit = 20): Promise<string[]> {
  const rows = await db
    .select({ key: foodEntries.foodKey, last: sql<number>`max(${foodEntries.createdAt})` })
    .from(foodEntries)
    .where(isNotNull(foodEntries.foodKey))
    .groupBy(foodEntries.foodKey)
    .orderBy(desc(sql`max(${foodEntries.createdAt})`))
    .limit(limit);
  return rows.map((r) => r.key).filter((k): k is string => k !== null);
}

/** Resolves a food key to its current values: built-in list or the user's own foods. */
export async function resolveFood(key: string): Promise<Food | undefined> {
  if (key.startsWith('b:')) return builtInFood(key);
  if (key.startsWith('c:')) {
    const c = await fetchCustomFood(Number(key.slice(2)));
    return c ? customFoodToFood(c) : undefined;
  }
  return undefined;
}

/** True when a workout was started on this local day. */
export async function trainedOn(day: string): Promise<boolean> {
  const [y, m, d] = day.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 1);
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(workouts)
    .where(and(gte(workouts.startedAt, start), lte(workouts.startedAt, end)));
  return Number(rows[0]?.n ?? 0) > 0;
}

/** Logs a food (built-in or the user's own) to a meal. */
export const logFood = (food: Food, servings: number, meal: Meal, day: string) =>
  addFoodEntry({
    day,
    meal,
    name: food.name,
    serving: food.serving,
    grams: food.grams ?? null,
    servings,
    kcal: food.kcal,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    foodKey: food.key,
  });
