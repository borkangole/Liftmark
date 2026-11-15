import { describe, expect, it } from 'vitest';

import { buildYear, weeksOf, type DayWorkout } from '../year';

const now = new Date(2026, 10, 15, 16); // Sun 15 Nov 2026
let id = 0;
const w = (y: number, m: number, d: number, h = 9): DayWorkout => ({ id: ++id, name: 'Push', startedAt: new Date(y, m, d, h) });

describe('buildYear', () => {
  it('counts trained days against the days so far', () => {
    const y = buildYear([w(2026, 0, 1), w(2026, 0, 1, 18), w(2026, 10, 14), w(2025, 5, 1)], 2026, now);
    expect(y.trainedDays).toBe(2);
    expect(y.countedDays).toBe(319); // 1 Jan – 15 Nov
    expect(y.months[0].days[0].workouts).toHaveLength(2);
    expect(y.years).toEqual([2025, 2026]);
  });

  it('starts weeks on Monday', () => {
    const y = buildYear([], 2026, now);
    expect(y.months[0].lead).toBe(3); // 1 Jan 2026 is a Thursday
    expect(y.months[1].lead).toBe(6); // 1 Feb 2026 is a Sunday
    expect(y.months[11].future).toBe(true);
    expect(y.months[10].days[14].today).toBe(true);
  });

  it('tracks streaks; an untrained today keeps the current one alive', () => {
    const y = buildYear([w(2026, 10, 12), w(2026, 10, 13), w(2026, 10, 14), w(2026, 2, 1), w(2026, 2, 2)], 2026, now);
    expect(y.currentStreak).toBe(3);
    expect(y.longestStreak).toBe(3);
    expect(y.bestMonth).toEqual({ label: 'Nov', days: 3 });
  });

  it('a rest day yesterday ends the current streak', () => {
    expect(buildYear([w(2026, 10, 13)], 2026, now).currentStreak).toBe(0);
  });

  it('counts the whole year for a past year', () => {
    const y = buildYear([w(2025, 11, 31)], 2025, now);
    expect(y.countedDays).toBe(365);
    expect(y.currentStreak).toBe(0);
  });
});

describe('weeksOf', () => {
  it('lays every month out as six Monday-first weeks', () => {
    const y = buildYear([], 2026, now);
    for (const m of y.months) {
      const weeks = weeksOf(m);
      expect(weeks).toHaveLength(6);
      expect(weeks.every((w) => w.length === 7)).toBe(true);
      expect(weeks.flat().filter(Boolean)).toHaveLength(m.days.length);
    }
    expect(weeksOf(y.months[1])[0][6]?.day).toBe(1); // Sun 1 Feb 2026
  });

  it('counts the month’s training days and workouts', () => {
    const y = buildYear([w(2026, 10, 3), w(2026, 10, 3, 18), w(2026, 10, 5)], 2026, now);
    expect(y.months[10].trained).toBe(2);
    expect(y.months[10].workouts).toBe(3);
  });
});
