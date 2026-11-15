import { describe, expect, it } from 'vitest';

import type { Profile } from '@/features/profile/types';
import { activityFactor, recommendCalories, restingCalories } from '../nutrition';

const base: Profile = { age: 24, sex: 'male', heightCm: 175, weightKg: 72, level: 'intermediate', goal: 'muscle', daysPerWeek: 4 };

describe('energy estimates', () => {
  it('matches the Mifflin-St Jeor equation', () => {
    // 10×72 + 6.25×175 − 5×24 + 5 = 1698.75
    expect(restingCalories(base)).toBeCloseTo(1698.75, 2);
    expect(restingCalories({ ...base, sex: 'female' })).toBeCloseTo(1532.75, 2);
  });
  it('adds training days to lifestyle activity, capped', () => {
    expect(activityFactor('sitting', 4)).toBeCloseTo(1.34, 2);
    expect(activityFactor('physical', 7)).toBeLessThanOrEqual(1.9);
  });
});

describe('recommendCalories', () => {
  it('puts a lean bulk a little above maintenance', () => {
    const a = recommendCalories(base, 'gain_muscle', 'sitting');
    expect(a.adjustment).toBeGreaterThan(100);
    expect(a.adjustment).toBeLessThan(400);
    expect(a.target).toBe(a.maintenance + a.adjustment);
    expect(a.caution).toBeNull();
  });

  it('puts a cut below maintenance with more protein', () => {
    const cut = recommendCalories(base, 'lose_fat', 'sitting');
    const bulk = recommendCalories(base, 'gain_muscle', 'sitting');
    expect(cut.adjustment).toBeLessThan(-150);
    expect(cut.macros.proteinG).toBeGreaterThan(bulk.macros.proteinG); // 2.0 vs 1.8 g/kg
    expect(cut.macros.proteinG).toBe(145); // 72 × 2.0 → nearest 5
  });

  it('keeps recomp at maintenance', () => {
    const a = recommendCalories(base, 'recomp', 'on_feet');
    expect(a.adjustment).toBe(0);
  });

  it('macros add up to the calories', () => {
    const a = recommendCalories(base, 'lose_weight', 'sitting');
    const kcal = a.macros.proteinG * 4 + a.macros.carbsG * 4 + a.macros.fatG * 9;
    expect(Math.abs(kcal - a.target)).toBeLessThan(40);
  });

  it('refuses to cut someone underweight', () => {
    const thin = { ...base, weightKg: 52 }; // BMI 17.0
    const a = recommendCalories(thin, 'lose_fat', 'sitting');
    expect(a.adjustment).toBe(0);
    expect(a.caution).toContain('below the healthy range');
  });

  it('allows a faster loss and sizes protein sensibly with a high BMI', () => {
    const heavy = { ...base, weightKg: 110 }; // BMI 35.9
    const a = recommendCalories(heavy, 'lose_weight', 'sitting');
    // Protein from a BMI-25 weight at 175 cm (76.6 kg × 2.0), not 110 kg × 2.0.
    expect(a.macros.proteinG).toBe(155);
    expect(a.adjustment).toBeLessThan(-500);
    expect(-a.adjustment).toBeLessThanOrEqual(0.25 * a.maintenance + 50);
  });

  it('suggests a recomp to someone with a higher BMI who wants to bulk', () => {
    const a = recommendCalories({ ...base, weightKg: 85 }, 'gain_muscle', 'sitting'); // BMI 27.8
    expect(a.caution).toContain('recomp');
  });

  it('only shows maintenance to under-18s', () => {
    const a = recommendCalories({ ...base, age: 16 }, 'lose_weight', 'sitting');
    expect(a.adjustment).toBe(0);
    expect(a.caution).toContain('under 18');
  });

  it('never goes below a safe floor', () => {
    const small = { ...base, sex: 'female' as const, weightKg: 50, heightCm: 150, age: 60, daysPerWeek: 2 };
    const a = recommendCalories(small, 'lose_weight', 'sitting');
    expect(a.target).toBeGreaterThanOrEqual(1200);
  });

  it('shifts the target when the weigh-ins show you are off pace', () => {
    const plan = recommendCalories(base, 'gain_muscle', 'sitting');
    const stalled = recommendCalories(base, 'gain_muscle', 'sitting', { status: 'too_slow', calorieAdjust: 200 });
    expect(stalled.target).toBe(plan.target + 200);
    expect(stalled.fromTrend).toBe(true);
    expect(stalled.reasons.at(-1)).toContain('from your weigh-ins');
    const onTrack = recommendCalories(base, 'gain_muscle', 'sitting', { status: 'on_track', calorieAdjust: null });
    expect(onTrack.target).toBe(plan.target);
  });
});
