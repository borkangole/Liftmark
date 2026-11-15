import { describe, expect, it } from 'vitest';

import {
  analyzeTrend,
  loadTypeOf,
  scoreContext,
  setScore,
  suggestNextSession,
  summarizeSession,
  toScoredSessions,
  type Session,
} from '..';

const day = (n: number) => new Date(2026, 9, n);
const session = (n: number, sets: [number, number][]): Session => ({
  date: day(n),
  sets: sets.map(([weight, reps]) => ({ weight, reps })),
});

describe('loadTypeOf', () => {
  it('classifies weighted, bodyweight and timed lifts', () => {
    expect(loadTypeOf({ equipment: 'barbell', measure: 'reps' })).toBe('weighted');
    expect(loadTypeOf({ equipment: 'bodyweight', measure: 'reps' })).toBe('bodyweight');
    expect(loadTypeOf({ equipment: 'bodyweight', measure: 'time' })).toBe('timed');
  });
});

describe('setScore', () => {
  it('adds bodyweight to bodyweight lifts', () => {
    const ctx = scoreContext({ equipment: 'bodyweight' }, 70);
    // Pull-up with no added weight: 70 × (1 + 8/30)
    expect(setScore({ weight: 0, reps: 8 }, ctx)).toBeCloseTo(88.67, 2);
    expect(setScore({ weight: 10, reps: 8 }, ctx)).toBeCloseTo(101.33, 2);
  });
  it('scores timed holds by seconds', () => {
    const ctx = scoreContext({ equipment: 'bodyweight', measure: 'time' }, 70);
    expect(setScore({ weight: 0, reps: 45 }, ctx)).toBe(45);
  });
  it('falls back to a default bodyweight without a profile', () => {
    expect(scoreContext({ equipment: 'bodyweight' }, null).bodyweightKg).toBe(75);
  });
});

describe('bodyweight lifts are tracked', () => {
  const ctx = scoreContext({ equipment: 'bodyweight' }, 70);
  const pullups = [
    session(1, [
      [0, 6],
      [0, 6],
    ]),
    session(3, [
      [0, 7],
      [0, 6],
    ]),
    session(5, [
      [0, 8],
      [0, 7],
    ]),
  ];

  it('get a real score instead of 0', () => {
    const scored = toScoredSessions(pullups, ctx);
    expect(summarizeSession(scored[2]).bestE1rm).toBeGreaterThan(80);
  });
  it('show as progressing when reps go up', () => {
    expect(analyzeTrend(toScoredSessions(pullups, ctx)).status).toBe('progressing');
  });
  it('suggest more reps at bodyweight, then added weight', () => {
    const trend = analyzeTrend(toScoredSessions(pullups, ctx));
    const opts = {
      repRange: { min: 6, max: 12 },
      increment: 2.5,
      type: 'bodyweight' as const,
      formatWeight: (kg: number) => `${kg} kg`,
    };
    const next = suggestNextSession(pullups[2], trend, opts)!;
    expect(next).toMatchObject({ kind: 'add_reps', weight: 0, targetReps: 8 });
    expect(next.reason).toBe('Stay at bodyweight and aim for 8 reps on every set.');

    const maxed = suggestNextSession(
      session(7, [
        [0, 12],
        [0, 12],
      ]),
      trend,
      opts,
    )!;
    expect(maxed).toMatchObject({ kind: 'add_weight', weight: 2.5 });
    expect(maxed.reason).toContain('Add 2.5 kg with a belt or vest');
  });
  it('deload with fewer reps when nothing is added', () => {
    const regressing = [session(1, [[0, 10]]), session(3, [[0, 9]]), session(5, [[0, 8]]), session(7, [[0, 7]])];
    const trend = analyzeTrend(toScoredSessions(regressing, ctx));
    expect(trend.status).toBe('regressing');
    const next = suggestNextSession(regressing[3], trend, {
      repRange: { min: 6, max: 12 },
      increment: 2.5,
      type: 'bodyweight',
    })!;
    expect(next).toMatchObject({ kind: 'deload', weight: 0, targetReps: 6 });
  });
});

describe('timed holds', () => {
  const ctx = scoreContext({ equipment: 'bodyweight', measure: 'time' }, 70);
  const planks = [
    session(1, [
      [0, 30],
      [0, 30],
    ]),
    session(3, [
      [0, 35],
      [0, 30],
    ]),
    session(5, [
      [0, 40],
      [0, 35],
    ]),
  ];

  it('trend on hold time', () => {
    const trend = analyzeTrend(toScoredSessions(planks, ctx), { metric: 'hold time' });
    expect(trend.status).toBe('progressing');
    expect(trend.allTimeBestE1rm).toBe(40);
    expect(trend.reason).toBe('New best hold time last session.');
  });
  it('suggest the next 5-second step', () => {
    const trend = analyzeTrend(toScoredSessions(planks, ctx));
    const next = suggestNextSession(planks[2], trend, {
      repRange: { min: 30, max: 60 },
      increment: 2.5,
      type: 'timed',
    })!;
    expect(next).toMatchObject({ kind: 'add_reps', weight: 0, targetReps: 45, sets: 2 });
    expect(next.reason).toBe('Your best hold was 40 s. Aim for 45 s on every set.');
  });
});
