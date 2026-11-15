import { describe, expect, it } from 'vitest';

import { addDays, startOfWeek } from '../dates';
import { buildProgressOverview, type ProgressRow } from '../overview';

const now = new Date(2026, 10, 11, 12); // Wed 11 Nov 2026
let workoutId = 0;

/** One workout per entry: [daysAgo, weight, reps] for a single exercise. */
function lift(
  exerciseId: number,
  name: string,
  sessions: [number, number, number][],
  extra: Partial<ProgressRow> = {},
): ProgressRow[] {
  return sessions.flatMap(([daysAgo, weight, reps]) => {
    const id = ++workoutId;
    const startedAt = addDays(now, -daysAgo);
    return [0, 1, 2].map(() => ({
      workoutId: id,
      startedAt,
      exerciseId,
      exerciseName: name,
      muscleGroup: 'chest',
      equipment: 'barbell',
      measure: 'reps' as const,
      repRangeMin: 5,
      repRangeMax: 8,
      weightIncrement: 2.5,
      reps,
      weight,
      isWarmup: false,
      ...extra,
    }));
  });
}

const rows = [
  ...lift(1, 'Bench', [
    [28, 80, 5],
    [21, 82.5, 5],
    [14, 85, 5],
    [7, 87.5, 5],
    [0, 90, 5],
  ]),
  ...lift(2, 'Row', [
    [27, 70, 8],
    [20, 67.5, 8],
    [13, 65, 8],
    [6, 60, 8],
  ]),
  ...lift(3, 'Curl', [[1, 20, 10]]),
];

describe('startOfWeek', () => {
  it('returns Monday', () => {
    const monday = startOfWeek(now);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(9);
  });
});

describe('buildProgressOverview', () => {
  const o = buildProgressOverview(rows, { now, rangeWeeks: 12 });

  it('puts regressing lifts first and new lifts last', () => {
    expect(o.lifts.map((l) => l.name)).toEqual(['Row', 'Bench', 'Curl']);
    expect(o.needsAttention.map((l) => l.name)).toEqual(['Row']);
  });

  it('counts statuses', () => {
    expect(o.statusCounts).toMatchObject({ progressing: 1, regressing: 1, insufficient_data: 1 });
  });

  it('computes change over the range', () => {
    const bench = o.lifts.find((l) => l.name === 'Bench')!;
    expect(bench.change).toBeCloseTo(90 / 80 - 1, 5);
    expect(bench.series).toHaveLength(5);
  });

  it('records PR events newest first', () => {
    expect(o.recentPrs[0].name).toBe('Bench');
    expect(o.rangePrCount).toBe(4);
  });

  it('tracks this week and the weekly streak', () => {
    expect(o.workoutsThisWeek).toBe(2); // bench today + curl yesterday
    expect(o.weekStreak).toBe(5);
  });

  it('buckets volume into 8 weeks ending this week', () => {
    expect(o.weeklyVolume).toHaveLength(8);
    expect(o.weeklyVolume.at(-1)!.volume).toBe(90 * 5 * 3 + 20 * 10 * 3);
  });

  it('handles no data', () => {
    const empty = buildProgressOverview([], { now });
    expect(empty.lifts).toEqual([]);
    expect(empty.weekStreak).toBe(0);
  });
});

describe('bodyweight and timed lifts', () => {
  const o = buildProgressOverview(
    [
      ...lift(
        50,
        'Pull-up',
        [
          [20, 0, 6],
          [13, 0, 7],
          [6, 0, 8],
        ],
        { equipment: 'bodyweight', repRangeMin: 6, repRangeMax: 12 },
      ),
      ...lift(
        51,
        'Plank',
        [
          [20, 0, 30],
          [13, 0, 40],
          [6, 0, 50],
        ],
        { equipment: 'bodyweight', measure: 'time' },
      ),
    ],
    { now, bodyweightKg: 70 },
  );
  const pullup = o.lifts.find((l) => l.name === 'Pull-up')!;
  const plank = o.lifts.find((l) => l.name === 'Plank')!;

  it('show up on the Progress tab', () => {
    expect(pullup).toBeDefined();
    expect(plank).toBeDefined();
  });
  it('score pull-ups with bodyweight and planks in seconds', () => {
    expect(pullup.type).toBe('bodyweight');
    expect(pullup.latestE1rm).toBeCloseTo(70 * (1 + 8 / 30), 1);
    expect(plank.type).toBe('timed');
    expect(plank.latestE1rm).toBe(50);
    expect(plank.trend.status).toBe('progressing');
  });
  it('suggest reps for pull-ups and a longer hold for planks', () => {
    expect(pullup.suggestion).toMatchObject({ weight: 0, targetReps: 9 });
    expect(plank.suggestion).toMatchObject({ weight: 0, targetReps: 55 });
  });
});
