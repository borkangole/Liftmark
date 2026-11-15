import { describe, expect, it } from 'vitest';

import {
  analyzeTrend,
  applyFix,
  fixOptions,
  planBroken,
  startPlan,
  suggestWithPlan,
  switchRange,
  type PlateauEpisode,
  type Session,
} from '../index';

const day = (n: number) => new Date(2026, 0, n, 18);
const session = (n: number, weight: number, reps: number, count = 3): Session => ({
  date: day(n),
  sets: Array.from({ length: count }, () => ({ weight, reps })),
});
const stalled = [
  session(2, 90, 8),
  session(6, 95, 8),
  session(9, 100, 8),
  session(13, 100, 7),
  session(16, 100, 7),
  session(20, 100, 7),
  session(23, 100, 7),
];
const trend = analyzeTrend(stalled, { level: 'intermediate', now: day(24) });
const opts = { repRange: { min: 6, max: 10 }, increment: 2.5 };
const ep = (exerciseId: number, fix: PlateauEpisode['fix'], sessions: number): PlateauEpisode => ({
  exerciseId,
  name: exerciseId === 1 ? 'Bench' : 'Squat',
  fix,
  cause: 'adapted',
  startedAt: '2025-10-01T00:00:00Z',
  brokenAt: '2025-10-20T00:00:00Z',
  sessions,
  days: 19,
});

describe('fixOptions', () => {
  it('offers fixes that match the cause', () => {
    expect(fixOptions('cutting', [], 1).map((o) => o.fix)).toEqual(['hold', 'deload']);
    expect(fixOptions('adapted', [], 1)[0]).toMatchObject({ fix: 'rep_range', recommended: true, note: null });
  });
  it('puts what worked for you first, and says so', () => {
    const opts = fixOptions('adapted', [ep(2, 'deload', 2)], 1);
    expect(opts[0].fix).toBe('deload');
    expect(opts[0].note).toBe('Broke your Squat plateau in 2 sessions');
  });
  it('trusts this lift over another', () => {
    const opts = fixOptions('adapted', [ep(2, 'deload', 2), ep(1, 'add_set', 3)], 1);
    expect(opts[0].fix).toBe('add_set');
  });
});

describe('plans', () => {
  const base = {
    exerciseId: 1,
    cause: 'adapted' as const,
    bestE1rm: trend.allTimeBestE1rm,
    sessionCount: 7,
    repRange: opts.repRange,
    lastSession: stalled.at(-1),
    now: day(24),
  };

  it('switches to a heavier range from higher reps, and back', () => {
    expect(switchRange({ min: 6, max: 10 })).toEqual({ min: 4, max: 6 });
    expect(switchRange({ min: 3, max: 5 })).toEqual({ min: 8, max: 12 });
  });

  it('starts a deload with one lighter session, then builds back', () => {
    const plan = startPlan('deload', base);
    const first = suggestWithPlan(stalled, trend, opts, plan)!;
    expect(first.kind).toBe('deload');
    expect(first.weight).toBe(90);
    expect(first.targetReps).toBe(10);
    const after = [...stalled, session(26, 90, 10)];
    const next = suggestWithPlan(after, trend, opts, plan)!;
    expect(next.kind).not.toBe('deload');
    expect(next.weight).toBeGreaterThanOrEqual(90);
  });

  it('holds the weight on a cut instead of deloading', () => {
    const plan = startPlan('hold', { ...base, cause: 'cutting' });
    const s = suggestWithPlan(stalled, trend, opts, plan)!;
    expect(s.weight).toBe(100);
    expect(s.targetReps).toBe(7);
    expect(s.reason).toMatch(/hold/i);
  });

  it('moves to the new rep range at a matching weight', () => {
    const plan = startPlan('rep_range', base);
    expect(plan.repRange).toEqual({ min: 4, max: 6 });
    const s = suggestWithPlan(stalled, trend, opts, plan)!;
    expect(s.targetReps).toBe(6);
    // 100 × 7 ≈ 123 e1RM → about 105 kg for 6, a little under to start.
    expect(s.weight).toBeGreaterThan(100);
    expect(s.weight).toBeLessThan(110);
  });

  it('adds a set', () => {
    const plan = startPlan('add_set', base);
    expect(plan.sets).toBe(4);
    expect(suggestWithPlan(stalled, trend, opts, plan)!.sets).toBe(4);
  });

  it('knows when the plateau is broken', () => {
    const plan = startPlan('deload', base);
    expect(planBroken(plan, trend.allTimeBestE1rm)).toBe(false);
    expect(planBroken(plan, trend.allTimeBestE1rm + 1)).toBe(true);
  });

  it('leaves timed holds alone', () => {
    const plan = startPlan('deload', base);
    const normal = { kind: 'add_reps' as const, weight: 0, targetReps: 45, sets: 3, reason: 'x' };
    expect(
      applyFix(normal, plan, { lastSession: stalled.at(-1), sessionsSince: 0, increment: 2.5, type: 'timed' }),
    ).toBe(normal);
  });
});

describe('early warning', () => {
  it('flags a lift that is about to stall', () => {
    const almost = [
      session(2, 90, 8),
      session(6, 95, 8),
      session(9, 100, 8),
      session(13, 100, 7),
      session(16, 100, 7),
      session(20, 100, 7),
    ];
    const t = analyzeTrend(almost, { level: 'intermediate', now: day(21) });
    expect(t.status).toBe('progressing');
    expect(t.slowing).toBe(true);
    expect(t.reason).toMatch(/Make the next one count/);
  });
  it('does not flag a lift that just set a best', () => {
    const t = analyzeTrend(stalled.slice(0, 3), { level: 'intermediate', now: day(10) });
    expect(t.slowing).toBe(false);
  });
});
