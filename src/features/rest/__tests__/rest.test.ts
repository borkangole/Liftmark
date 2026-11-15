import { describe, expect, it } from 'vitest';

import { recommendRest, resolveRest, restTier, type RestExercise } from '../rest';

const ex = (o: Partial<RestExercise> & { name: string }): RestExercise => ({
  equipment: 'barbell',
  muscleGroup: 'chest',
  repRangeMax: 10,
  ...o,
});
const squat = ex({ name: 'Barbell Back Squat', muscleGroup: 'quads', repRangeMax: 8 });
const pulldown = ex({ name: 'Lat Pulldown', equipment: 'cable', muscleGroup: 'back' });
const curl = ex({ name: 'Barbell Curl', muscleGroup: 'biceps', repRangeMax: 12 });
const plank = ex({ name: 'Plank', equipment: 'bodyweight', muscleGroup: 'core', measure: 'time', repRangeMax: 60 });
const muscle = { goal: 'muscle' as const, level: 'intermediate' as const };

describe('restTier', () => {
  it('classifies library lifts', () => {
    expect(restTier(squat)).toBe('heavy');
    expect(restTier(pulldown)).toBe('compound');
    expect(restTier(curl)).toBe('isolation');
    expect(restTier(plank)).toBe('hold');
  });
  it('treats multi-group custom lifts as compound, barbell big-muscle ones as heavy', () => {
    expect(restTier(ex({ name: 'Landmine Press', isCustom: true, equipment: 'other', muscleGroup: 'shoulders', targetMuscles: ['frontDelts', 'triceps'] }))).toBe('compound');
    expect(restTier(ex({ name: 'Zercher Squat', isCustom: true, muscleGroup: 'quads', targetMuscles: ['quads', 'glutes', 'hamstrings'] }))).toBe('heavy');
    expect(restTier(ex({ name: 'Cable Kickback', isCustom: true, equipment: 'cable', muscleGroup: 'triceps', targetMuscles: ['triceps'] }))).toBe('isolation');
  });
});

describe('recommendRest', () => {
  it('follows the evidence tiers for a trained lifter', () => {
    expect(recommendRest(squat, muscle).seconds).toBe(180);
    expect(recommendRest(pulldown, muscle).seconds).toBe(150);
    expect(recommendRest(curl, muscle).seconds).toBe(90);
    expect(recommendRest(plank, muscle).seconds).toBe(60);
  });
  it('never drops below 90 s for resistance work, even on a fat-loss goal', () => {
    const fat = { goal: 'fat_loss' as const, level: 'beginner' as const };
    expect(recommendRest(curl, fat).seconds).toBe(90);
    expect(recommendRest(pulldown, fat).seconds).toBeGreaterThanOrEqual(90);
  });
  it('gives trained lifters over 2 min on big lifts when the goal is strength', () => {
    const strength = { goal: 'strength' as const, level: 'advanced' as const };
    expect(recommendRest(squat, strength).seconds).toBe(240);
    expect(recommendRest(pulldown, strength).seconds).toBeGreaterThan(120);
  });
  it('keeps beginners in the 60–150 s range on assistance lifts', () => {
    const beginner = { goal: 'muscle' as const, level: 'beginner' as const };
    expect(recommendRest(pulldown, beginner).seconds).toBe(120);
  });
  it('rests longer for very heavy, low-rep sets', () => {
    expect(recommendRest({ ...pulldown, repRangeMax: 5 }, muscle).seconds).toBe(180);
  });
});

describe('resolveRest', () => {
  it('prefers the per-exercise value, then a fixed default, then smart', () => {
    expect(resolveRest({ ...curl, restSeconds: 45 }, { mode: 'smart', fixedSeconds: 120 })).toEqual({ seconds: 45, source: 'custom' });
    expect(resolveRest(curl, { mode: 'fixed', fixedSeconds: 120 })).toEqual({ seconds: 120, source: 'fixed' });
    expect(resolveRest(squat, { mode: 'smart', fixedSeconds: 120, profile: muscle })).toEqual({ seconds: 180, source: 'smart' });
  });
});
