import { describe, expect, it } from 'vitest';

import { builtInFood, FOODS, kcalFromMacros, portionLabel, scale, searchFoods, servingStep } from '../foods';
import { glyphFor } from '../icons';
import { measureMaintenance } from '../measured';
import {
  customTargets,
  expectedShare,
  paceOf,
  mealAt,
  mealBudgets,
  nextMealPlan,
  remaining,
  totals,
  type DailyTargets,
  type LoggedFood,
} from '../plan';
import { energyPicks, plateFor, proteinPicks, suggestForDay, weekInsight } from '../suggest';

const at = (h: number, m = 0) => new Date(2026, 10, 16, h, m);
const targets: DailyTargets = { kcal: 2400, proteinG: 150, carbsG: 270, fatG: 70, source: 'goal' };
const food = (key: string) => builtInFood(`b:${key}`)!;
const log = (key: string, meal: LoggedFood['meal'], servings = 1): LoggedFood => ({ ...food(key), meal, servings });

describe('food list', () => {
  it('has unique keys and values that add up', () => {
    expect(new Set(FOODS.map((f) => f.key)).size).toBe(FOODS.length);
    for (const f of FOODS) {
      // Alcohol has calories that aren't protein, carbs or fat; everything else should be within ~20%.
      if (f.key === 'b:beer') continue;
      const implied = kcalFromMacros(f);
      expect(Math.abs(implied - f.kcal), f.name).toBeLessThanOrEqual(Math.max(15, f.kcal * 0.2));
    }
  });
  it('labels portions the way people say them', () => {
    expect(portionLabel(food('chicken-breast'), 1.5)).toBe('150 g');
    expect(portionLabel(food('egg'), 3)).toBe('3 × large egg');
    expect(portionLabel(food('sinigang'), 1.5)).toBe('1.5 × bowl');
    expect(portionLabel(food('rice-white'), 1.5)).toBe('1.5 × cup');
    expect(portionLabel(food('kamote'), 1.5)).toBe('171 g');
    expect(portionLabel(food('avocado'), 0.5)).toBe('50 g');
    expect(portionLabel(food('whey'), 2)).toBe('2 × scoop');
    expect(portionLabel(food('egg'), 1)).toBe('1 large egg');
    expect(scale(food('egg'), 2).proteinG).toBeCloseTo(12.6);
  });
  it('adjusts portions in steps people can measure', () => {
    expect(servingStep(food('chicken-breast')) * 100).toBe(25); // 25 g
    expect(servingStep(food('egg'))).toBe(1);
    expect(servingStep(food('rice-white'))).toBe(0.5);
    expect(servingStep(food('sinigang'))).toBe(0.5);
  });
  it('searches without caring about case or accents', () => {
    expect(searchFoods(FOODS, 'CHICKEN cooked').map((f) => f.key)).toContain('b:chicken-breast');
    expect(searchFoods(FOODS, 'sinigang')).toHaveLength(1);
    expect(searchFoods(FOODS, '')).toHaveLength(FOODS.length);
  });
});

describe('food icons', () => {
  it('gives every built-in food its own glyph', () => {
    for (const f of FOODS) if (f.key !== 'b:tapsilog') expect(glyphFor(f), f.name).not.toBe('plate');
  });
  it('guesses from the name for your own foods', () => {
    expect(glyphFor({ key: 'c:4', name: "Mom's chicken curry" })).toBe('drumstick');
    expect(glyphFor({ key: 'c:5', name: 'Overnight oats' })).toBe('grain');
    expect(glyphFor({ key: 'c:6', baseKey: 'b:sinigang', name: 'Sinigang (big bowl)' })).toBe('soup');
    expect(glyphFor({ foodKey: null, name: 'Quick add' })).toBe('bolt');
    expect(glyphFor({ foodKey: 'c:9', name: 'Something new' })).toBe('plate');
  });
});

describe('targets and budgets', () => {
  it('fills custom targets with a sensible fat floor', () => {
    const t = customTargets(2000, 160, 80);
    expect(t.fatG).toBeGreaterThanOrEqual(48);
    expect(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9).toBeGreaterThan(1950);
    expect(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9).toBeLessThan(2050);
  });
  it('re-splits what is left over the meals not eaten yet', () => {
    const fresh = mealBudgets(targets, []);
    expect(fresh.find((b) => b.meal === 'dinner')!.kcal).toBe(720);
    // A 1,000 kcal lunch: dinner and snacks share the 1,400 left; breakfast is still open too.
    const after = mealBudgets(targets, [
      { meal: 'lunch', kcal: 1000, proteinG: 40, carbsG: 100, fatG: 40, servings: 1 },
    ]);
    const sum = after.filter((b) => !b.logged).reduce((s, b) => s + b.kcal, 0);
    expect(sum).toBeGreaterThanOrEqual(1390);
    expect(sum).toBeLessThanOrEqual(1410);
    expect(after.find((b) => b.meal === 'lunch')!.logged).toBe(true);
  });
  it("tells what's left and plans the next empty meal", () => {
    const entries = [log('chicken-breast', 'lunch', 2), log('rice-white', 'lunch')];
    const left = remaining(targets, entries);
    expect(left.kcal).toBeCloseTo(2400 - 330 - 205);
    expect(left.proteinG).toBeCloseTo(150 - 62 - 4.3);
    const next = nextMealPlan(targets, entries, 'lunch')!;
    expect(next.meal).toBe('dinner');
    expect(next.kcal).toBeGreaterThan(0);
    // Snacks after dinner; nothing after snacks.
    expect(nextMealPlan(targets, [log('egg', 'dinner')], 'dinner')!.meal).toBe('snack');
    expect(nextMealPlan(targets, [log('egg', 'snack')], 'snack')).toBeNull();
  });
  it('knows where the day should be by now', () => {
    expect(expectedShare(at(5))).toBe(0);
    expect(expectedShare(at(10, 30))).toBeCloseTo(0.25);
    expect(expectedShare(at(23))).toBe(1);
    expect(paceOf(600, 2400, at(10, 30))).toBe('on_pace');
    expect(paceOf(1500, 2400, at(9))).toBe('ahead');
    expect(paceOf(300, 2400, at(16))).toBe('behind');
    expect(paceOf(2600, 2400, at(16))).toBe('over');
    expect(paceOf(2350, 2400, at(20))).toBe('done');
  });
  it('knows which meal it is', () => {
    expect(mealAt(at(7))).toBe('breakfast');
    expect(mealAt(at(12, 30))).toBe('lunch');
    expect(mealAt(at(15, 30))).toBe('snack');
    expect(mealAt(at(19))).toBe('dinner');
  });
});

describe('picks', () => {
  it('closes a protein gap with lean foods that fit the meal and the budget', () => {
    const picks = proteinPicks(FOODS, { proteinG: 40, kcalMax: 400, meal: 'dinner' });
    expect(picks.length).toBe(3);
    for (const p of picks) {
      expect(p.values.kcal).toBeLessThanOrEqual(400);
      expect(p.values.proteinG).toBeGreaterThanOrEqual(20);
      expect(p.food.meals === undefined || p.food.meals.includes('dinner')).toBe(true);
    }
    // Spread over different kinds of food where it can.
    expect(new Set(picks.map((p) => p.food.group)).size).toBeGreaterThanOrEqual(2);
  });
  it('prefers foods the user already eats', () => {
    const picks = proteinPicks(FOODS, { proteinG: 30, kcalMax: 400, meal: 'lunch', recentKeys: ['b:tilapia'] });
    expect(picks[0].food.key).toBe('b:tilapia');
  });
  it('never suggests an impossible portion', () => {
    expect(proteinPicks(FOODS, { proteinG: 40, kcalMax: 30, meal: 'lunch' })).toHaveLength(0);
  });
  it('adds energy close to what is missing', () => {
    const picks = energyPicks(FOODS, { kcal: 500, meal: 'dinner' });
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) expect(p.values.kcal).toBeLessThanOrEqual(550);
  });
});

describe('plateFor', () => {
  it('covers protein, carbs and fat for a meal', () => {
    const need = { kcal: 700, proteinG: 45, carbsG: 70, fatG: 20 };
    const plate = plateFor(FOODS, need, { meal: 'dinner' });
    expect(plate.map((p) => p.role)).toEqual(['protein', 'carbs', 'fat']);
    const sum = plate.reduce(
      (t, p) => ({ kcal: t.kcal + p.values.kcal, c: t.c + p.values.carbsG, f: t.f + p.values.fatG }),
      { kcal: 0, c: 0, f: 0 },
    );
    expect(sum.kcal).toBeLessThanOrEqual(need.kcal + 60);
    expect(sum.c).toBeGreaterThan(need.carbsG * 0.6);
    expect(sum.f).toBeGreaterThan(need.fatG * 0.5);
  });
  it('skips what is already covered', () => {
    const plate = plateFor(FOODS, { kcal: 300, proteinG: 5, carbsG: 60, fatG: 2 }, { meal: 'lunch' });
    expect(plate.map((p) => p.role)).toEqual(['carbs']);
  });
});

describe('suggestForDay', () => {
  const base = { foods: FOODS, goal: 'lose_fat' as const, weightKg: 75, trainedToday: false, recentKeys: [], targets };

  it('starts the day with a breakfast plate', () => {
    const s = suggestForDay({ ...base, now: at(7), entries: [] });
    expect(s[0].id).toBe('start');
    expect(s[0].title).toContain('Breakfast');
    expect(s[0].hint).toMatch(/protein · .* carbs · .* fat/);
    expect(s[0].picks!.length).toBeGreaterThan(1);
  });
  it('plans the next meal once this one is logged, without repeating it', () => {
    const lunch = { ...log('tinola', 'lunch'), foodKey: 'b:tinola' };
    const s = suggestForDay({ ...base, now: at(13), entries: [lunch] });
    const p = s.find((x) => x.id === 'plate')!;
    expect(p.meal).toBe('dinner');
    expect(p.picks!.some((x) => x.food.key === 'b:tinola')).toBe(false);
  });
  it('skips past every meal that is already logged', () => {
    const s = suggestForDay({ ...base, now: at(13), entries: [log('tinola', 'lunch'), log('egg', 'dinner')] });
    expect(s.find((x) => x.id === 'plate')!.meal).toBe('snack');
  });
  it('fills carbs and fat once protein is done', () => {
    const s = suggestForDay({
      ...base,
      goal: 'gain_muscle',
      now: at(12),
      entries: [log('chicken-breast', 'breakfast', 2.5), log('whey', 'breakfast', 2)],
    });
    const roles = s.find((x) => x.id === 'plate')!.picks!.map((p) => p.role);
    expect(roles).toContain('carbs');
  });
  it('is calm about going over on a cut', () => {
    const big: LoggedFood = { meal: 'dinner', kcal: 3000, proteinG: 160, carbsG: 300, fatG: 120, servings: 1 };
    const s = suggestForDay({ ...base, now: at(21), entries: [big] });
    expect(s[0].id).toBe('over');
    expect(s[0].body).toMatch(/one day/i);
  });
  it('pushes a lean bulk that is behind late in the day', () => {
    const s = suggestForDay({
      ...base,
      goal: 'gain_muscle',
      now: at(19),
      entries: [log('chicken-breast', 'lunch', 2)],
    });
    expect(s.some((x) => x.id === 'bulk-behind')).toBe(true);
  });
  it('says so when the day is on target', () => {
    const day: LoggedFood = { meal: 'dinner', kcal: 2400, proteinG: 150, carbsG: 270, fatG: 70, servings: 1 };
    const s = suggestForDay({ ...base, now: at(21), entries: [day] });
    expect(s[0].id).toBe('on-target');
  });
  it('totals servings correctly', () => {
    expect(totals([log('egg', 'breakfast', 3)]).kcal).toBeCloseTo(216);
  });
});

describe('weekInsight', () => {
  const day = (kcal: number, proteinG = 150) => ({ day: '2026-11-10', kcal, proteinG, carbsG: 0, fatG: 0 });
  it('waits for three logged days', () => {
    expect(weekInsight([day(2400), day(0)], targets, 'lose_fat', 'too_slow').avgKcal).toBeNull();
  });
  it('explains a slow cut by the intake', () => {
    const w = weekInsight([day(2700), day(2650), day(2800), day(2600)], targets, 'lose_fat', 'too_slow');
    expect(w.tone).toBe('warn');
    expect(w.title).toMatch(/over/);
  });
  it('praises a consistent week', () => {
    const w = weekInsight([day(2380), day(2420), day(2400)], targets, 'lose_fat', 'on_track');
    expect(w.tone).toBe('good');
    expect(w.onTargetDays).toBe(3);
  });
  it('flags low protein', () => {
    const w = weekInsight([day(2400, 90), day(2400, 95), day(2400, 100)], targets, 'recomp', 'on_track');
    expect(w.title).toMatch(/Protein/);
  });
});

describe('measureMaintenance', () => {
  const key = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const start = new Date(2026, 9, 1, 8);
  const daysFrom = (n: number) => new Date(start.getTime() + n * 86_400_000);

  it('works out what the user really burns', () => {
    // 21 days at 2,200 kcal while losing 0.5 kg a week → about 2,200 + 550 = 2,750 maintenance.
    const intake = Array.from({ length: 21 }, (_, i) => ({ day: key(daysFrom(i)), kcal: 2200 }));
    const weighIns = [0, 7, 14, 21].map((d) => ({ date: daysFrom(d), weightKg: 80 - (d / 7) * 0.5 }));
    const r = measureMaintenance(intake, weighIns, daysFrom(22));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.maintenance).toBeGreaterThan(2700);
      expect(r.value.maintenance).toBeLessThan(2800);
      expect(r.value.kgPerWeek).toBeCloseTo(-0.5, 2);
    }
  });
  it('ignores weigh-ins from before food logging started', () => {
    const intake = Array.from({ length: 5 }, (_, i) => ({ day: key(daysFrom(30 + i)), kcal: 2000 }));
    const weighIns = [0, 7, 14, 21, 28, 35].map((d) => ({ date: daysFrom(d), weightKg: 80 }));
    const r = measureMaintenance(intake, weighIns, daysFrom(36));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/two weigh-ins|days apart/);
  });
  it('waits for enough days and enough logging', () => {
    const weighIns = [0, 7].map((d) => ({ date: daysFrom(d), weightKg: 80 }));
    expect(measureMaintenance([], weighIns, daysFrom(8)).ok).toBe(false);
    const sparse = [0, 3, 9].map((i) => ({ day: key(daysFrom(i)), kcal: 2000 }));
    const two = [0, 14].map((d) => ({ date: daysFrom(d), weightKg: 80 }));
    const r = measureMaintenance(sparse, two, daysFrom(15));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/most days/);
  });
});
