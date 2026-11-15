import { describe, expect, it } from 'vitest';

import { presetExercises } from '@/db/seed';
import { bmiCategory, calculateBmi, cmFromFeetInches, feetInchesFromCm } from '../bmi';
import { recommendPlan, repRangeFor, COMPOUND_LIFTS } from '../recommend';
import { startingWeight } from '../startingWeight';

describe('BMI', () => {
  it('calculates kg/m²', () => expect(calculateBmi(70, 175)).toBeCloseTo(22.86, 2));
  it('uses WHO categories', () => {
    expect(bmiCategory(18.4)).toBe('underweight');
    expect(bmiCategory(18.5)).toBe('healthy');
    expect(bmiCategory(25)).toBe('overweight');
    expect(bmiCategory(30)).toBe('obese');
  });
  it('converts feet and inches', () => {
    expect(cmFromFeetInches(5, 9)).toBeCloseTo(175.26, 1);
    expect(feetInchesFromCm(175.26)).toEqual({ feet: 5, inches: 9 });
  });
});

describe('recommendPlan', () => {
  const plan = (level: 'beginner' | 'intermediate' | 'advanced', days: number, goal = 'muscle' as const) =>
    recommendPlan({ level, daysPerWeek: days, goal }).preset.key;

  it('gives beginners full body on 2–3 days', () => {
    expect(plan('beginner', 2)).toBe('full-body');
    expect(plan('beginner', 3)).toBe('full-body');
  });
  it('picks upper/lower for 4 days at any level', () => {
    expect(plan('beginner', 4)).toBe('upper-lower');
    expect(plan('advanced', 4)).toBe('upper-lower');
  });
  it('keeps beginners on upper/lower even with more days', () => {
    expect(plan('beginner', 6)).toBe('upper-lower');
  });
  it('gives intermediates PPL on 5–6 days', () => {
    expect(plan('intermediate', 5)).toBe('ppl');
    expect(plan('intermediate', 6)).toBe('ppl');
  });
  it('reserves the bro split for advanced lifters chasing size on 5 days', () => {
    expect(plan('advanced', 5, 'muscle')).toBe('bro-split');
    expect(recommendPlan({ level: 'advanced', daysPerWeek: 5, goal: 'strength' }).preset.key).toBe('ppl');
  });
  it('explains itself and sets rest by goal', () => {
    const r = recommendPlan({ level: 'beginner', daysPerWeek: 3, goal: 'strength' });
    expect(r.reasons.length).toBeGreaterThanOrEqual(3);
    expect(r.restSeconds).toBe(180);
  });
});

describe('repRangeFor', () => {
  it('uses lower reps for compound lifts when chasing strength', () => {
    expect(repRangeFor('strength', 'Barbell Back Squat')).toEqual({ min: 3, max: 6 });
    expect(repRangeFor('strength', 'Lateral Raise')).toEqual({ min: 6, max: 10 });
  });
  it('only lists real library exercises as compounds', () => {
    const library = new Set(presetExercises.map((e) => e.name));
    expect([...COMPOUND_LIFTS].filter((n) => !library.has(n))).toEqual([]);
  });
});

describe('startingWeight', () => {
  const base = { bodyweightKg: 80, level: 'beginner' as const, sex: 'male' as const, increment: 2.5 };
  it('scales from bodyweight and rounds to the plate step', () => {
    expect(startingWeight({ ...base, exerciseName: 'Barbell Bench Press' })).toBe(35); // 36 → 35
  });
  it('goes heavier with experience', () => {
    expect(startingWeight({ ...base, level: 'advanced', exerciseName: 'Barbell Back Squat' })).toBe(87.5);
  });
  it('starts women lighter on upper-body lifts', () => {
    const m = startingWeight({ ...base, exerciseName: 'Overhead Press' })!;
    const f = startingWeight({ ...base, sex: 'female', exerciseName: 'Overhead Press' })!;
    expect(f).toBeLessThan(m);
  });
  it('uses bodyweight for pull-ups and dips', () => {
    expect(startingWeight({ ...base, exerciseName: 'Pull-up' })).toBe(0);
  });
  it('never suggests less than one plate step', () => {
    expect(startingWeight({ ...base, bodyweightKg: 40, increment: 1, exerciseName: 'Lateral Raise' })).toBe(2);
  });
  it('has an estimate or bodyweight rule for every library exercise', () => {
    const missing = presetExercises
      .map((e) => e.name)
      .filter((n) => startingWeight({ ...base, exerciseName: n }) === null);
    expect(missing).toEqual([]);
  });
});
