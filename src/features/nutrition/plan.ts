import type { CalorieAdvice } from '@/features/bodyweight/nutrition';
import { MEALS, scale, type FoodValues, type Meal } from './foods';

/** What the user aims to eat in a day. */
export interface DailyTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** goal = Liftmark's recommendation; measured = from the user's own logs and weigh-ins; custom = typed in. */
  source: 'goal' | 'measured' | 'custom';
}

/** One logged food: values are per serving, `servings` is how many were eaten. */
export interface LoggedFood extends FoodValues {
  meal: Meal;
  servings: number;
  /** Which food it was, when it came from the list (quick adds have none). */
  foodKey?: string | null;
}

const round5 = (n: number) => Math.round(n / 5) * 5;

export function targetsFromAdvice(advice: CalorieAdvice, source: DailyTargets['source'] = 'goal'): DailyTargets {
  return { kcal: advice.target, ...advice.macros, source };
}

/**
 * Targets the user typed in (from a coach or dietitian). Only calories and protein are asked;
 * fat gets a healthy share (at least 0.6 g/kg, about a quarter of calories) and carbs fill the rest.
 */
export function customTargets(kcal: number, proteinG: number, weightKg: number): DailyTargets {
  const fatG = round5(Math.max(0.6 * weightKg, (kcal * 0.25) / 9));
  const carbsG = Math.max(0, round5((kcal - proteinG * 4 - fatG * 9) / 4));
  return { kcal: Math.round(kcal), proteinG: Math.round(proteinG), carbsG, fatG, source: 'custom' };
}

export const ZERO: FoodValues = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function add(a: FoodValues, b: FoodValues): FoodValues {
  return {
    kcal: a.kcal + b.kcal,
    proteinG: a.proteinG + b.proteinG,
    carbsG: a.carbsG + b.carbsG,
    fatG: a.fatG + b.fatG,
  };
}

export const entryTotal = (e: LoggedFood): FoodValues => scale(e, e.servings);

export function totals(entries: LoggedFood[]): FoodValues {
  return entries.reduce((t, e) => add(t, entryTotal(e)), ZERO);
}

export function totalsByMeal(entries: LoggedFood[]): Record<Meal, FoodValues> {
  const out = { breakfast: ZERO, lunch: ZERO, dinner: ZERO, snack: ZERO } as Record<Meal, FoodValues>;
  for (const e of entries) out[e.meal] = add(out[e.meal], entryTotal(e));
  return out;
}

/** Usual share of the day for each meal. */
export const MEAL_SHARE: Record<Meal, number> = { breakfast: 0.25, lunch: 0.3, dinner: 0.3, snack: 0.15 };

export interface MealBudget {
  meal: Meal;
  eaten: FoodValues;
  /** Calories to aim for at this meal. Meals already logged show what was eaten. */
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  logged: boolean;
}

/**
 * Splits the day into meal budgets. Meals not logged yet share what's left of the day, in their usual
 * proportions, so a big lunch shrinks the dinner budget instead of leaving the plan stale.
 */
export function mealBudgets(
  targets: Pick<DailyTargets, 'kcal' | 'proteinG'> & Partial<Pick<DailyTargets, 'carbsG' | 'fatG'>>,
  entries: LoggedFood[],
): MealBudget[] {
  const byMeal = totalsByMeal(entries);
  const eaten = totals(entries);
  const open = MEALS.filter((m) => byMeal[m].kcal === 0);
  const openShare = open.reduce((s, m) => s + MEAL_SHARE[m], 0) || 1;
  const kcalLeft = Math.max(0, targets.kcal - eaten.kcal);
  const proteinLeft = Math.max(0, targets.proteinG - eaten.proteinG);
  const carbsLeft = Math.max(0, (targets.carbsG ?? 0) - eaten.carbsG);
  const fatLeft = Math.max(0, (targets.fatG ?? 0) - eaten.fatG);
  return MEALS.map((meal) => {
    const logged = byMeal[meal].kcal > 0;
    const share = MEAL_SHARE[meal] / openShare;
    return {
      meal,
      eaten: byMeal[meal],
      logged,
      kcal: logged ? Math.round(byMeal[meal].kcal) : round5(kcalLeft * share),
      proteinG: logged ? Math.round(byMeal[meal].proteinG) : round5(proteinLeft * share),
      carbsG: logged ? Math.round(byMeal[meal].carbsG) : round5(carbsLeft * share),
      fatG: logged ? Math.round(byMeal[meal].fatG) : Math.round(fatLeft * share),
    };
  });
}

/** The meal most people would be having at this hour. */
export function mealAt(date: Date): Meal {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h < 10.5) return 'breakfast';
  if (h < 14.5) return 'lunch';
  if (h < 17) return 'snack';
  if (h < 21.5) return 'dinner';
  return 'snack';
}

/** The meal after this one, for suggestions once the current meal is logged. */
export const NEXT_MEAL: Record<Meal, Meal> = { breakfast: 'lunch', lunch: 'dinner', snack: 'dinner', dinner: 'snack' };

/** About how many meals are still to come today, so a protein gap can be spread over them. */
export function mealsLeftAt(date: Date): number {
  const h = date.getHours();
  if (h < 10) return 4;
  if (h < 13) return 3;
  if (h < 17) return 2;
  return 1;
}

/** What's left of the day's targets (negative = over). */
export function remaining(
  targets: Pick<DailyTargets, 'kcal' | 'proteinG' | 'carbsG' | 'fatG'>,
  entries: LoggedFood[],
): FoodValues {
  const t = totals(entries);
  return {
    kcal: targets.kcal - t.kcal,
    proteinG: targets.proteinG - t.proteinG,
    carbsG: targets.carbsG - t.carbsG,
    fatG: targets.fatG - t.fatG,
  };
}

/**
 * The next meal to plan after logging to `justLogged`: the first meal after it that's still empty,
 * with its share of what's left. Null when every meal has something or nothing's left.
 */
export function nextMealPlan(
  targets: Pick<DailyTargets, 'kcal' | 'proteinG'> & Partial<Pick<DailyTargets, 'carbsG' | 'fatG'>>,
  entries: LoggedFood[],
  justLogged: Meal,
): MealBudget | null {
  const budgets = mealBudgets(targets, entries);
  const order = MEALS.slice(MEALS.indexOf(justLogged) + 1).concat(justLogged === 'snack' ? [] : ['snack']);
  for (const m of order) {
    const b = budgets.find((x) => x.meal === m);
    if (b && !b.logged && b.kcal > 0) return b;
  }
  return null;
}

/** Share of the day's calories most people have eaten by this time (breakfast by 10:30, lunch by 14:30, …). */
export function expectedShare(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  const points: [number, number][] = [
    [6, 0],
    [10.5, MEAL_SHARE.breakfast],
    [14.5, MEAL_SHARE.breakfast + MEAL_SHARE.lunch],
    [17, MEAL_SHARE.breakfast + MEAL_SHARE.lunch + MEAL_SHARE.snack],
    [21, 1],
  ];
  if (h <= points[0][0]) return 0;
  for (let i = 1; i < points.length; i++) {
    const [h1, s1] = points[i];
    const [h0, s0] = points[i - 1];
    if (h <= h1) return s0 + ((h - h0) / (h1 - h0)) * (s1 - s0);
  }
  return 1;
}

export type Pace = 'ahead' | 'on_pace' | 'behind' | 'over' | 'done';

/** Is the day going to plan for this time of day? */
export function paceOf(eatenKcal: number, targetKcal: number, now: Date): Pace {
  const share = eatenKcal / targetKcal;
  if (share > 1.05) return 'over';
  if (share >= 0.95) return 'done';
  const expected = expectedShare(now);
  if (share > expected + 0.2) return 'ahead';
  if (share < expected - 0.2) return 'behind';
  return 'on_pace';
}
