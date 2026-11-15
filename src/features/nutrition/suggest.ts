import type { BodyGoal, BodyStatus } from '@/features/bodyweight/trend';
import { MEAL_LABEL, scale, servingStep, type Food, type FoodValues, type Meal } from './foods';
import { mealAt, mealBudgets, NEXT_MEAL, totals, type DailyTargets, type LoggedFood } from './plan';

/**
 * Smart suggestions for the food log.
 *
 * The evidence they lean on:
 * - Daily protein matters most; about 1.6 g/kg is where gains level off, up to 2.2 g/kg to be safe
 *   (Morton et al. 2018, meta-analysis of 49 trials). Liftmark's targets already sit in that range.
 * - Spread it out: about 0.4 g/kg per meal over at least four meals (Schoenfeld & Aragon 2018).
 * - A single day over or under barely moves bodyweight; the weekly trend is what counts. Roughly
 *   7,700 kcal per kg of bodyweight (Hall 2008, as a rule of thumb).
 */

export type PickRole = 'protein' | 'carbs' | 'fat';

export interface FoodPick {
  food: Food;
  servings: number;
  values: FoodValues;
  /** What this food is on the plate for. */
  role?: PickRole;
}

export interface Suggestion {
  id: string;
  tone: 'good' | 'info' | 'warn';
  title: string;
  /** A few words shown under the title. The longer `body` is for the info page and screen readers. */
  hint: string;
  body: string;
  picks?: FoodPick[];
  /** Meal the picks are for. */
  meal?: Meal;
}

export interface SuggestInput {
  now: Date;
  targets: DailyTargets;
  entries: LoggedFood[];
  foods: Food[];
  goal: BodyGoal | null;
  weightKg: number;
  /** A workout was logged today. */
  trainedToday: boolean;
  /** Food keys the user logged recently, most recent first. Their favourites rank higher. */
  recentKeys: string[];
}

const KCAL_PER_KG = 7700;
const r5 = (n: number) => Math.round(n / 5) * 5;
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

const fitsMeal = (f: Food, meal: Meal) => !f.meals || f.meals.length === 0 || f.meals.includes(meal);

/**
 * Foods that close a protein gap without blowing the calorie budget.
 * Ranked by how much of the gap they cover, how lean they are, and whether the user eats them already.
 */
export function proteinPicks(
  foods: Food[],
  opts: { proteinG: number; kcalMax: number; meal: Meal; recentKeys?: string[]; exclude?: Set<string> },
  n = 3,
): FoodPick[] {
  const recent = new Map((opts.recentKeys ?? []).map((k, i) => [k, i]));
  const scored: { pick: FoodPick; score: number }[] = [];
  for (const food of foods) {
    if (opts.exclude?.has(food.key)) continue;
    // A real protein source: at least 5 g a serving and a good share of its calories from protein.
    if (food.proteinG < 5 || food.kcal <= 0) continue;
    const density = (food.proteinG * 4) / food.kcal; // share of calories from protein
    if (density < 0.3 || !fitsMeal(food, opts.meal)) continue;
    const step = servingStep(food);
    const max = food.maxServings ?? 2;
    let servings = Math.min(max, Math.max(step, Math.ceil(opts.proteinG / food.proteinG / step) * step));
    if (servings * food.kcal > opts.kcalMax) servings = Math.floor(opts.kcalMax / food.kcal / step) * step;
    if (servings < step) continue;
    const values = scale(food, servings);
    // Too small to make a dent in the gap.
    if (values.proteinG < Math.min(15, opts.proteinG * 0.5)) continue;
    const covered = Math.min(1, values.proteinG / Math.max(1, opts.proteinG));
    const r = recent.get(food.key);
    const score =
      covered * 2 +
      density +
      (food.staple ? 0.4 : 0) +
      (r === undefined ? 0 : 0.6 - Math.min(0.5, r * 0.05)) -
      (food.estimate ? 0.3 : 0) -
      (food.checkLabel ? 0.1 : 0);
    scored.push({ pick: { food, servings, values }, score });
  }
  return diverse(scored, n);
}

/** Foods that add energy (a lean bulk that's behind, or a day that's far too low). */
export function energyPicks(
  foods: Food[],
  opts: { kcal: number; meal: Meal; recentKeys?: string[]; exclude?: Set<string> },
  n = 3,
): FoodPick[] {
  const recent = new Map((opts.recentKeys ?? []).map((k, i) => [k, i]));
  const want = Math.min(700, opts.kcal);
  const scored: { pick: FoodPick; score: number }[] = [];
  for (const food of foods) {
    if (opts.exclude?.has(food.key)) continue;
    if (food.kcal < 90 || !fitsMeal(food, opts.meal) || food.group === 'drinks') continue;
    const step = servingStep(food);
    const max = food.maxServings ?? 2;
    let servings = Math.min(max, Math.max(step, Math.round(want / food.kcal / step) * step));
    if (servings * food.kcal > opts.kcal + 50) servings = Math.floor((opts.kcal + 50) / food.kcal / step) * step;
    if (servings < step) continue;
    const values = scale(food, servings);
    const closeness = 1 - Math.min(1, Math.abs(values.kcal - want) / want);
    const proteinBonus = Math.min(0.5, (values.proteinG / Math.max(1, values.kcal)) * 10);
    const r = recent.get(food.key);
    const score = closeness * 2 + proteinBonus + (r === undefined ? 0 : 0.6) - (food.checkLabel ? 0.2 : 0);
    scored.push({ pick: { food, servings, values }, score });
  }
  return diverse(scored, n);
}

const sub = (a: FoodValues, b: FoodValues): FoodValues => ({
  kcal: a.kcal - b.kcal,
  proteinG: a.proteinG - b.proteinG,
  carbsG: a.carbsG - b.carbsG,
  fatG: a.fatG - b.fatG,
});

/**
 * One food for a macro gap: the candidate whose portion comes closest to `grams` of that macro
 * without going past the calories left. Prefers foods the user eats and plain foods over estimates.
 */
function bestFor(
  foods: Food[],
  macro: 'carbsG' | 'fatG',
  grams: number,
  kcalMax: number,
  opts: { meal: Meal; recentKeys?: string[]; exclude?: Set<string> },
): FoodPick | null {
  const recent = new Map((opts.recentKeys ?? []).map((k, i) => [k, i]));
  const perGram = macro === 'carbsG' ? 4 : 9;
  const minShare = macro === 'carbsG' ? 0.55 : 0.6;
  let best: { pick: FoodPick; score: number } | null = null;
  for (const food of foods) {
    if (opts.exclude?.has(food.key) || food.group === 'drinks' || !fitsMeal(food, opts.meal)) continue;
    if (food.kcal <= 0 || food[macro] < (macro === 'carbsG' ? 10 : 5)) continue;
    if ((food[macro] * perGram) / food.kcal < minShare) continue;
    const step = servingStep(food);
    const max = food.maxServings ?? 2;
    let servings = Math.min(max, Math.max(step, Math.round(grams / food[macro] / step) * step));
    if (servings * food.kcal > kcalMax + 30) servings = Math.floor((kcalMax + 30) / food.kcal / step) * step;
    if (servings < step) continue;
    const values = scale(food, servings);
    const closeness = 1 - Math.min(1, Math.abs(values[macro] - grams) / grams);
    const r = recent.get(food.key);
    // Plain cooking fats come last: a real food (avocado, nuts) is a better suggestion than "add butter".
    const plainFat = food.key === 'b:butter' ? 0.6 : food.key === 'b:oil' ? 0.4 : 0;
    const score =
      closeness * 2 +
      (r === undefined ? 0 : 0.6 - Math.min(0.5, r * 0.05)) +
      (food.staple ? 0.5 : 0) -
      plainFat -
      (food.estimate ? 0.4 : 0) -
      (food.checkLabel ? 0.3 : 0);
    if (!best || score > best.score)
      best = { pick: { food, servings, values, role: macro === 'carbsG' ? 'carbs' : 'fat' }, score };
  }
  return best?.pick ?? null;
}

/**
 * A plate for one meal: a protein, a carb and a fat source, each sized so together they land close to
 * the meal's share of what's left of the day (calories, protein, carbs and fat).
 */
export function plateFor(
  foods: Food[],
  need: FoodValues,
  opts: { meal: Meal; recentKeys?: string[]; exclude?: Set<string> },
): FoodPick[] {
  const plate: FoodPick[] = [];
  let left = need;
  const used = new Set(opts.exclude);
  if (need.proteinG >= 10) {
    const p = proteinPicks(
      foods,
      {
        proteinG: need.proteinG,
        kcalMax: Math.max(120, need.kcal * 0.55),
        meal: opts.meal,
        recentKeys: opts.recentKeys,
        exclude: used,
      },
      1,
    )[0];
    if (p) {
      plate.push({ ...p, role: 'protein' });
      left = sub(left, p.values);
      used.add(p.food.key);
    }
  }
  if (left.carbsG >= 15 && left.kcal > 80) {
    const c = bestFor(foods, 'carbsG', left.carbsG, left.kcal, { ...opts, exclude: used });
    if (c) {
      plate.push(c);
      left = sub(left, c.values);
      used.add(c.food.key);
    }
  }
  if (left.fatG >= 6 && left.kcal > 40) {
    const f = bestFor(foods, 'fatG', left.fatG, left.kcal, { ...opts, exclude: used });
    if (f) plate.push(f);
  }
  return plate;
}

/** Best first, at most one per food group so the picks feel like real choices. */
function diverse(scored: { pick: FoodPick; score: number }[], n: number): FoodPick[] {
  const out: FoodPick[] = [];
  const groups = new Set<string>();
  for (const { pick } of [...scored].sort((a, b) => b.score - a.score)) {
    if (groups.has(pick.food.group)) continue;
    groups.add(pick.food.group);
    out.push(pick);
    if (out.length === n) break;
  }
  // Not enough groups? Fill with the next best.
  for (const { pick } of [...scored].sort((a, b) => b.score - a.score)) {
    if (out.length >= n) break;
    if (!out.includes(pick)) out.push(pick);
  }
  return out;
}

const isCut = (g: BodyGoal | null) => g === 'lose_weight' || g === 'lose_fat';

/** Up to three suggestions for today, most useful first. */
export function suggestForDay(input: SuggestInput): Suggestion[] {
  const { now, targets, entries, foods, goal, trainedToday, recentKeys } = input;
  const eaten = totals(entries);
  const kcalLeft = targets.kcal - eaten.kcal;
  const proteinLeft = targets.proteinG - eaten.proteinG;
  const hour = now.getHours();
  // Plan the first meal that's still empty, starting from the one it is now; don't suggest what was just eaten.
  let meal = mealAt(now);
  for (let i = 0; i < 3 && entries.some((e) => e.meal === meal); i++) meal = NEXT_MEAL[meal];
  const exclude = new Set(entries.map((e) => e.foodKey).filter((k): k is string => Boolean(k)));
  const budget = mealBudgets(targets, entries).find((b) => b.meal === meal);
  const out: Suggestion[] = [];

  // Over the target.
  if (kcalLeft < -0.05 * targets.kcal) {
    const over = -kcalLeft;
    const grams = Math.round((over / KCAL_PER_KG) * 1000);
    out.push({
      id: 'over',
      tone: 'warn',
      title: `${fmt(over)} kcal over today`,
      hint: isCut(goal) ? "One day won't change the trend" : 'Fine now and then',
      body: isCut(goal)
        ? `That's at most about ${grams} g of bodyweight, and one day doesn't decide anything. Don't skip meals tomorrow to make up for it: just eat to plan.`
        : 'Fine now and then. If it happens most days, your weekly weigh-ins will show it and Liftmark will adjust.',
    });
  }

  // The next meal as a plate: protein, carbs and fat sized to its share of what's left.
  if (budget && budget.kcal >= 150 && kcalLeft > 150) {
    const need = { kcal: budget.kcal, proteinG: budget.proteinG, carbsG: budget.carbsG, fatG: budget.fatG };
    const picks = plateFor(foods, need, { meal, recentKeys, exclude });
    if (picks.length) {
      const first = entries.length === 0;
      out.push({
        id: first ? 'start' : 'plate',
        tone: 'info',
        title: `${MEAL_LABEL[meal]} · ~${fmt(budget.kcal)} kcal`,
        hint: `${fmt(budget.proteinG)} g protein · ${fmt(budget.carbsG)} g carbs · ${fmt(budget.fatG)} g fat`,
        body:
          `What's left today, shared over your remaining meals, gives ${MEAL_LABEL[meal].toLowerCase()} about ${fmt(budget.kcal)} kcal: ` +
          `${fmt(budget.proteinG)} g protein, ${fmt(budget.carbsG)} g carbs and ${fmt(budget.fatG)} g fat. ` +
          `The plate covers it with one food for each.${trainedToday ? ' You trained today, so the protein matters most.' : ''}`,
        picks,
        meal,
      });
    }
  }

  // Protein can't fit any more today.
  if (proteinLeft >= 15 && kcalLeft <= 80) {
    out.push({
      id: 'protein-tight',
      tone: 'info',
      title: `${fmt(proteinLeft)} g protein short, calories used up`,
      hint: 'Tomorrow, swap some carbs for lean protein',
      body: 'Tomorrow, swap some carbs or fat for a lean protein (chicken, fish, egg whites, Greek yogurt) earlier in the day.',
    });
  }

  // Late in the day and far under.
  if (hour >= 18 && kcalLeft > 0.3 * targets.kcal) {
    out.push(
      goal === 'gain_muscle'
        ? {
            id: 'bulk-behind',
            tone: 'warn',
            title: `${fmt(kcalLeft)} kcal still to eat`,
            hint: 'A lean bulk needs the food',
            body: 'A lean bulk only works if you eat it. Add a real dinner, or an easy extra like rice, a banana or peanut butter.',
          }
        : {
            id: 'far-under',
            tone: 'warn',
            title: `${fmt(kcalLeft)} kcal under so far`,
            hint: 'Have a proper dinner with protein',
            body: isCut(goal)
              ? "A deficit this big in one day costs muscle and makes tomorrow harder. Have a proper dinner with protein; you'll still be in a deficit."
              : 'Eating well under most days slows recovery and strength. Have a full dinner.',
          },
    );
  }

  // A good day.
  if (out.length === 0 && Math.abs(kcalLeft) <= 0.05 * targets.kcal && proteinLeft < 15) {
    out.push({
      id: 'on-target',
      tone: 'good',
      title: 'Right on target',
      hint: 'Calories and protein both hit',
      body: 'Calories and protein both hit. Days like this are what move the trend.',
    });
  }
  if (out.length === 0 && kcalLeft > 0) {
    out.push({
      id: 'on-track',
      tone: 'good',
      title: `On track · ${fmt(kcalLeft)} kcal left`,
      hint: proteinLeft < 15 ? 'Protein covered' : 'Keep going',
      body: proteinLeft < 15 ? 'Protein is covered. Eat the rest however you like.' : 'Keep going.',
    });
  }
  return out.slice(0, 3);
}

export interface DayTotal extends FoodValues {
  day: string;
}

export interface WeekInsight {
  loggedDays: number;
  avgKcal: number | null;
  avgProteinG: number | null;
  /** Days within ±10% of the calorie target. */
  onTargetDays: number;
  title: string;
  body: string;
  tone: 'good' | 'info' | 'warn';
}

/**
 * The last seven days against the target, read together with the bodyweight trend.
 * This is where food logging pays off: it tells the user *why* the scale is or isn't moving.
 */
export function weekInsight(
  days: DayTotal[],
  targets: DailyTargets,
  goal: BodyGoal | null,
  status: BodyStatus | null,
): WeekInsight {
  const logged = days.filter((d) => d.kcal > 0);
  const n = logged.length;
  if (n < 3) {
    return {
      loggedDays: n,
      avgKcal: null,
      avgProteinG: null,
      onTargetDays: 0,
      tone: 'info',
      title: n === 0 ? 'Log a few days' : `${n} of 7 days logged`,
      body: 'With 3 or more days logged, Liftmark compares your week with your target and your weigh-ins.',
    };
  }
  const avgKcal = logged.reduce((s, d) => s + d.kcal, 0) / n;
  const avgProteinG = logged.reduce((s, d) => s + d.proteinG, 0) / n;
  const onTargetDays = logged.filter((d) => Math.abs(d.kcal - targets.kcal) <= 0.1 * targets.kcal).length;
  const diff = avgKcal - targets.kcal;
  const base = { loggedDays: n, avgKcal, avgProteinG, onTargetDays };
  const losing = isCut(goal);

  if (status === 'too_slow' && losing && diff > 100) {
    return {
      ...base,
      tone: 'warn',
      title: `Averaging ${fmt(diff)} kcal over`,
      body: "That's why the scale is slow. Hit your target more days before cutting calories any further.",
    };
  }
  if (status === 'too_slow' && goal === 'gain_muscle' && diff < -100) {
    return {
      ...base,
      tone: 'warn',
      title: `Averaging ${fmt(-diff)} kcal under`,
      body: "That's why you're not gaining. Eat to target first; the plan itself doesn't need to change.",
    };
  }
  if (status === 'too_fast' && losing && diff < -150) {
    return {
      ...base,
      tone: 'warn',
      title: `Averaging ${fmt(-diff)} kcal under`,
      body: "You're losing faster than planned because you're eating less than planned. Eat up to target to keep your muscle.",
    };
  }
  if (avgProteinG < targets.proteinG * 0.8) {
    return {
      ...base,
      tone: 'info',
      title: `Protein averaging ${fmt(avgProteinG)} g`,
      body: `Your target is ${fmt(targets.proteinG)} g. Add a protein to breakfast; it's the easiest meal to fix.`,
    };
  }
  return {
    ...base,
    tone: onTargetDays >= Math.ceil(n * 0.7) ? 'good' : 'info',
    title: `On target ${onTargetDays} of ${n} days`,
    body:
      Math.abs(diff) <= 100
        ? `Averaging ${fmt(avgKcal)} kcal and ${fmt(avgProteinG)} g protein. Consistent: keep it up.`
        : `Averaging ${fmt(avgKcal)} kcal, ${diff > 0 ? `${fmt(diff)} over` : `${fmt(-diff)} under`} target.`,
  };
}
