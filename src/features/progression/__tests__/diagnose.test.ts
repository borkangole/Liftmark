import { describe, expect, it } from 'vitest';

import { analyzeTrend, diagnoseStall, restGaps, type Session, type StallContext } from '../index';

const day = (n: number) => new Date(2026, 0, n, 18);
const key = (n: number) => `2026-01-${String(n).padStart(2, '0')}`;
const session = (n: number, weight: number, reps: number, count = 3): Session => ({
  date: day(n),
  sets: Array.from({ length: count }, () => ({ weight, reps })),
});
// Progress to a best on day 13, then flat twice a week for three weeks.
const stalled = [
  session(2, 90, 5),
  session(6, 95, 5),
  session(9, 97.5, 5),
  session(13, 100, 5),
  session(16, 100, 4),
  session(20, 100, 4),
  session(23, 100, 4),
  session(27, 100, 4),
  session(30, 100, 4),
];
const trend = analyzeTrend(stalled, { level: 'intermediate', now: day(31) });

const base: StallContext = {
  now: day(31),
  sessions: stalled,
  liftCount: 6,
  otherStuck: 0,
  goal: 'gain_muscle',
  targets: { kcal: 2800, proteinG: 150 },
  maintenance: 2600,
  food: Array.from({ length: 15 }, (_, i) => ({ day: key(14 + i), kcal: 2800, proteinG: 150 })),
  weighIns: [
    { date: day(14), weightKg: 75 },
    { date: day(21), weightKg: 75.2 },
    { date: day(28), weightKg: 75.4 },
  ],
};

describe('diagnoseStall', () => {
  it('is stalling to begin with', () => {
    expect(trend.status).toBe('stalling');
    expect(diagnoseStall(trend, base).since).toEqual(day(13));
  });

  it('says the programme has adapted when nothing else explains it', () => {
    expect(diagnoseStall(trend, base).causes.map((c) => c.id)).toEqual(['adapted']);
  });

  it('blames recovery when several lifts are stuck', () => {
    const d = diagnoseStall(trend, { ...base, otherStuck: 3 });
    expect(d.causes[0].id).toBe('systemic');
    expect(d.causes[0].detail).toContain('4 of your 6');
  });

  it('expects a stall on a cut', () => {
    const d = diagnoseStall(trend, {
      ...base,
      goal: 'lose_fat',
      weighIns: [
        { date: day(14), weightKg: 80 },
        { date: day(28), weightKg: 79 },
      ],
    });
    expect(d.causes[0].id).toBe('cutting');
    expect(d.causes[0].detail).toMatch(/−0\.50 kg a week/);
  });

  it("doesn't blame a cut when the weight is going up", () => {
    const d = diagnoseStall(trend, { ...base, goal: 'lose_fat' });
    expect(d.causes.some((c) => c.id === 'cutting')).toBe(false);
  });

  it('spots eating under maintenance and low protein from the food log', () => {
    const food = base.food.map((d) => ({ ...d, kcal: 2100, proteinG: 95 }));
    const flat = [
      { date: day(14), weightKg: 75 },
      { date: day(28), weightKg: 75 },
    ];
    const ids = diagnoseStall(trend, { ...base, food, weighIns: flat }).causes.map((c) => c.id);
    expect(ids).toContain('undereating');
    expect(ids).toContain('protein');
  });

  it('notices training less often and fewer sets', () => {
    const lessOften = [
      ...stalled.slice(0, 4),
      session(22, 100, 4, 2),
      session(31, 100, 4, 2),
      session(40, 100, 4, 2),
      session(49, 100, 4, 2),
    ];
    const t = analyzeTrend(lessOften, { level: 'intermediate', now: day(50) });
    expect(t.status).toBe('stalling');
    const ids = diagnoseStall(t, { ...base, now: day(50), sessions: lessOften }).causes.map((c) => c.id);
    expect(ids).toContain('frequency');
    expect(ids).toContain('volume');
  });

  it('notices short rest', () => {
    const d = diagnoseStall(trend, { ...base, rests: [70, 75, 80, 72, 78, 74, 76], recommendedRestSeconds: 180 });
    expect(d.causes.some((c) => c.id === 'rest')).toBe(true);
  });

  it("trusts the scale over a food log that's missing food", () => {
    const food = base.food.map((d) => ({ ...d, kcal: 1500 }));
    expect(diagnoseStall(trend, { ...base, food }).causes.some((c) => c.id === 'undereating')).toBe(false);
  });

  it('asks for a food log when there is none', () => {
    const ids = diagnoseStall(trend, { ...base, food: [] }).causes.map((c) => c.id);
    expect(ids).toContain('no_food_log');
  });

  it('says nothing for a lift that is moving', () => {
    const moving = analyzeTrend(stalled.slice(0, 4), { level: 'intermediate', now: day(14) });
    expect(diagnoseStall(moving, base).causes).toEqual([]);
  });
});

describe('restGaps', () => {
  it('measures time between working sets in each workout', () => {
    const t = (s: number) => new Date(2026, 0, 1, 18, 0, s);
    const gaps = restGaps([
      { workoutId: 1, loggedAt: t(0), isWarmup: true },
      { workoutId: 1, loggedAt: t(60), isWarmup: false },
      { workoutId: 1, loggedAt: t(200), isWarmup: false },
      { workoutId: 2, loggedAt: t(0), isWarmup: false },
      { workoutId: 2, loggedAt: t(150), isWarmup: false },
    ]);
    expect(gaps.sort()).toEqual([140, 150]);
  });
});
