import { describe, expect, it } from 'vitest';

import { getTargets, MUSCLES, registerCustomTargets, targetsForNames, type Muscle } from '@/features/muscles/targets';
import { loadTypeOf } from '@/features/progression/measure';
import { buildCustomExercise, MAX_MUSCLES, muscleLabel, MUSCLE_SECTIONS, toggleMuscle, checkName, cleanName, MUSCLE_GROUP, PICKABLE_MUSCLES } from '../custom';

describe('names', () => {
  it('cleans spacing', () => expect(cleanName('  incline   cable  fly ')).toBe('incline cable fly'));
  it('rejects short, long and duplicate names (any case)', () => {
    expect(checkName(' a ', [])).toBe('too_short');
    expect(checkName('x'.repeat(41), [])).toBe('too_long');
    expect(checkName('cable FLY', ['Cable Fly'])).toBe('taken');
    expect(checkName('Cable Crossover', ['Cable Fly'])).toBeNull();
  });
});

describe('buildCustomExercise', () => {
  it('files a weighted exercise under the right group with the exact muscle', () => {
    const e = buildCustomExercise({ name: ' Reverse  Pec Deck ', muscles: ['rearDelts'], type: 'weighted', repRange: { min: 10, max: 15 } });
    expect(e).toMatchObject({
      name: 'Reverse Pec Deck',
      muscleGroup: 'shoulders',
      primaryMuscle: 'rearDelts',
      equipment: 'other',
      measure: 'reps',
      repRangeMin: 10,
      repRangeMax: 15,
      isCustom: true,
    });
    expect(loadTypeOf({ equipment: e.equipment!, measure: e.measure })).toBe('weighted');
  });
  it('makes bodyweight and timed exercises score correctly', () => {
    const bw = buildCustomExercise({ name: 'Nordic Curl', muscles: ['hamstrings'], type: 'bodyweight', repRange: { min: 6, max: 10 } });
    expect(loadTypeOf({ equipment: bw.equipment!, measure: bw.measure })).toBe('bodyweight');
    const timed = buildCustomExercise({ name: 'Side Plank', muscles: ['obliques'], type: 'timed', repRange: { min: 6, max: 10 } });
    expect(loadTypeOf({ equipment: timed.equipment!, measure: timed.measure })).toBe('timed');
    expect(timed).toMatchObject({ repRangeMin: 30, repRangeMax: 60 });
  });
});

describe('targets for custom exercises', () => {
  it('maps every muscle to a group', () => {
    for (const m of MUSCLES) expect(MUSCLE_GROUP[m]).toBeTruthy();
    // The grouped list shows every pickable muscle exactly once.
    const listed = MUSCLE_SECTIONS.flatMap((s) => s.muscles);
    expect([...listed].sort()).toEqual([...PICKABLE_MUSCLES].sort());
  });
  it('highlights the picked muscle, not the whole group', () => {
    expect(getTargets('Reverse Pec Deck', 'shoulders', 'rearDelts')).toEqual({ primary: ['rearDelts'], secondary: ['traps'] });
  });
  it('resolves custom exercises by name once registered', () => {
    registerCustomTargets([{ name: 'Nordic Curl', primaryMuscle: 'hamstrings' }]);
    expect(targetsForNames(['Nordic Curl']).primary).toEqual(['hamstrings']);
    expect(getTargets('Nordic Curl', 'hamstrings').primary).toEqual(['hamstrings']);
  });
});

describe('several muscles per exercise', () => {
  it('toggles muscles on and off, keeping the pick order', () => {
    let list: Muscle[] = [];
    list = toggleMuscle(list, 'chest');
    list = toggleMuscle(list, 'triceps');
    list = toggleMuscle(list, 'frontDelts');
    expect(list).toEqual(['chest', 'triceps', 'frontDelts']);
    expect(toggleMuscle(list, 'triceps')).toEqual(['chest', 'frontDelts']);
  });
  it(`stops at ${MAX_MUSCLES} muscles`, () => {
    const full = MUSCLES.slice(0, MAX_MUSCLES);
    expect(toggleMuscle(full, MUSCLES[MAX_MUSCLES])).toBe(full);
  });
  it('files the exercise under the first muscle and keeps them all', () => {
    const e = buildCustomExercise({ name: 'Close-grip bench', muscles: ['triceps', 'chest'], type: 'weighted', repRange: { min: 6, max: 10 } });
    expect(e).toMatchObject({ muscleGroup: 'triceps', primaryMuscle: 'triceps', targetMuscles: ['triceps', 'chest'] });
    expect(() => buildCustomExercise({ name: 'x y', muscles: [], type: 'weighted', repRange: { min: 6, max: 10 } })).toThrow();
  });
  it('highlights every picked muscle as worked', () => {
    expect(getTargets('Close-grip bench', 'triceps', 'triceps', ['triceps', 'chest'])).toEqual({
      primary: ['chest', 'triceps'],
      secondary: [],
    });
    registerCustomTargets([{ name: 'Close-grip bench', primaryMuscle: 'triceps', targetMuscles: ['triceps', 'chest'] }]);
    expect(targetsForNames(['Close-grip bench']).primary).toEqual(['chest', 'triceps']);
  });
  it('still reads older single-muscle custom exercises', () => {
    expect(getTargets('Old one', 'shoulders', 'rearDelts', null)).toEqual({ primary: ['rearDelts'], secondary: ['traps'] });
  });
  it('labels lists compactly', () => {
    expect(muscleLabel({ muscleGroup: 'chest', targetMuscles: ['chest'] })).toBe('Chest');
    expect(muscleLabel({ muscleGroup: 'chest', targetMuscles: ['chest', 'triceps', 'frontDelts'] })).toBe('Chest, triceps +1');
    expect(muscleLabel({ muscleGroup: 'back' })).toBe('back');
  });
});

