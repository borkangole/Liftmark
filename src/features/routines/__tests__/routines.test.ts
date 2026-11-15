import { describe, expect, it } from 'vitest';

import { presetExercises } from '@/db/seed';
import { nextRoutineDay } from '../nextDay';
import { SPLIT_PRESETS } from '../presets';

describe('split presets', () => {
  const library = new Set(presetExercises.map((e) => e.name));

  it.each(SPLIT_PRESETS.map((p) => [p.name, p] as const))('%s only uses exercises from the library', (_, preset) => {
    const missing = preset.days.flatMap((d) => d.exercises.map((e) => e.name)).filter((n) => !library.has(n));
    expect(missing).toEqual([]);
  });

  it('has unique keys', () => {
    expect(new Set(SPLIT_PRESETS.map((p) => p.key)).size).toBe(SPLIT_PRESETS.length);
  });
});

describe('nextRoutineDay', () => {
  const days = [{ id: 10 }, { id: 11 }, { id: 12 }];
  it('starts at day one', () => expect(nextRoutineDay(days, null)?.id).toBe(10));
  it('moves to the next day', () => expect(nextRoutineDay(days, 10)?.id).toBe(11));
  it('wraps around', () => expect(nextRoutineDay(days, 12)?.id).toBe(10));
  it('restarts if the last day was deleted', () => expect(nextRoutineDay(days, 99)?.id).toBe(10));
  it('handles an empty routine', () => expect(nextRoutineDay([], null)).toBeUndefined());
});
