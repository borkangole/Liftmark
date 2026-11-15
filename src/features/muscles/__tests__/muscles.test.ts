import { describe, expect, it } from 'vitest';

import { presetExercises } from '@/db/seed';
import { BACK, FRONT, shapeState } from '../bodyMap';
import { EXERCISE_TARGETS, getTargets, MUSCLES } from '../targets';

describe('muscle targets', () => {
  it('covers every library exercise', () => {
    const missing = presetExercises.map((e) => e.name).filter((n) => !EXERCISE_TARGETS[n]);
    expect(missing).toEqual([]);
  });

  it('every muscle appears on the body map', () => {
    const drawn = new Set([...FRONT, ...BACK].flatMap((s) => s.muscles));
    expect(MUSCLES.filter((m) => !drawn.has(m))).toEqual([]);
  });

  it('never lists a muscle as both primary and secondary', () => {
    for (const [name, t] of Object.entries(EXERCISE_TARGETS)) {
      expect(t.primary.filter((m) => t.secondary.includes(m)), name).toEqual([]);
    }
  });

  it('falls back to the muscle group for custom exercises', () => {
    expect(getTargets('My Weird Press', 'chest').primary).toEqual(['chest']);
  });

  it('marks primary over secondary', () => {
    const delt = FRONT.find((s) => s.muscles.includes('frontDelts'))!;
    expect(shapeState(delt, ['frontDelts'], ['frontDelts'])).toBe('primary');
    expect(shapeState(delt, [], ['frontDelts'])).toBe('secondary');
    expect(shapeState(delt, ['chest'], [])).toBe('idle');
    expect(shapeState({ muscles: [], base: true }, ['chest'], [])).toBe('structure');
  });
});

describe('flattened body map', () => {
  it('mirrors paths across the center line', async () => {
    const { mirrorPath } = await import('../bodyMap');
    expect(mirrorPath('M50 10 L40 20 Q30 30 20 40 Z').trim()).toBe('M70 10 L80 20 Q90 30 100 40 Z');
  });
});

describe('combineTargets', () => {
  it('keeps primary over secondary and dedupes', async () => {
    const { combineTargets } = await import('../targets');
    const c = combineTargets([
      { primary: ['chest'], secondary: ['triceps', 'frontDelts'] },
      { primary: ['triceps'], secondary: ['chest'] },
    ]);
    expect(c.primary).toEqual(['chest', 'triceps']);
    expect(c.secondary).toEqual(['frontDelts']);
  });
});
