import { describe, expect, it } from 'vitest';

import type { ScoreContext, Session } from '@/features/progression';
import { compareSets, previousSetAt, recapSessions, relativeDay } from '../previous';

const weighted: ScoreContext = { type: 'weighted', bodyweightKg: 75 };
const timed: ScoreContext = { type: 'timed', bodyweightKg: 75 };
const day = (n: number) => new Date(2026, 10, n, 18);
const s = (n: number, sets: [number, number, boolean?][], workoutId = n): Session => ({
  date: day(n),
  workoutId,
  sets: sets.map(([weight, reps, isWarmup]) => ({ weight, reps, isWarmup: !!isWarmup })),
});

describe('previousSetAt', () => {
  const last = s(1, [[40, 10, true], [60, 8], [60, 8], [60, 6]]);
  it('matches working sets by position, skipping warm-ups', () => {
    expect(previousSetAt(last, 0)).toMatchObject({ weight: 60, reps: 8 });
    expect(previousSetAt(last, 2)).toMatchObject({ weight: 60, reps: 6 });
  });
  it('returns null past the end or with no history', () => {
    expect(previousSetAt(last, 3)).toBeNull();
    expect(previousSetAt(undefined, 0)).toBeNull();
  });
});

describe('compareSets', () => {
  it('detects more reps, more weight and drops', () => {
    expect(compareSets({ weight: 60, reps: 9 }, { weight: 60, reps: 8 }, weighted)).toBe('up');
    expect(compareSets({ weight: 62.5, reps: 8 }, { weight: 60, reps: 8 }, weighted)).toBe('up');
    expect(compareSets({ weight: 60, reps: 6 }, { weight: 60, reps: 8 }, weighted)).toBe('down');
    expect(compareSets({ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, weighted)).toBe('same');
  });
  it('compares holds by seconds', () => {
    expect(compareSets({ weight: 0, reps: 50 }, { weight: 0, reps: 45 }, timed)).toBe('up');
  });
});

describe('recapSessions', () => {
  const recap = recapSessions(
    [s(1, [[60, 8], [60, 8], [60, 6]]), s(4, [[40, 10, true], [62.5, 8], [62.5, 7]]), s(8, [[60, 5]])],
    weighted,
  );
  it('is newest first with labels, warm-ups and totals', () => {
    expect(recap.map((r) => r.workoutId)).toEqual([8, 4, 1]);
    expect(recap[1].sets.map((x) => x.label)).toEqual(['W', '1', '2']);
    expect(recap[1].warmups).toBe(1);
    expect(recap[1].totalReps).toBe(15);
    expect(recap[1].volumeKg).toBe(62.5 * 15);
  });
  it('marks the top set, change since last time and PRs', () => {
    expect(recap[1].sets[1].isTop).toBe(true);
    expect(recap[1].delta).toBeGreaterThan(0);
    expect(recap[1].isPr).toBe(true);
    expect(recap[0].delta).toBeLessThan(0);
    expect(recap[0].isPr).toBe(false);
    expect(recap[2].delta).toBeNull();
    expect(recap[2].isPr).toBe(false);
  });
});

describe('relativeDay', () => {
  const now = new Date(2026, 10, 14, 9);
  it('reads naturally', () => {
    expect(relativeDay(new Date(2026, 10, 14, 7), now)).toBe('Today');
    expect(relativeDay(new Date(2026, 10, 13, 22), now)).toBe('Yesterday');
    expect(relativeDay(new Date(2026, 10, 10), now)).toBe('4 days ago');
    expect(relativeDay(new Date(2026, 9, 24), now)).toBe('3 weeks ago');
  });
});
