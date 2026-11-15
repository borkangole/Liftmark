import { describe, expect, it } from 'vitest';

import {
  averageSteps,
  lifestyleFromSteps,
  nightsFrom,
  recentSleep,
  recoveryHoursFor,
  weighInsToImport,
} from '../health';

const today = '2026-11-15';
const day = (d: number) => `2026-11-${String(d).padStart(2, '0')}`;

describe('steps', () => {
  it('averages the last week of real days, ignoring today and days the watch was off', () => {
    const days = [8, 9, 10, 11, 12, 13, 14].map((d) => ({ day: day(d), steps: 8000 }));
    days[2].steps = 120; // not worn
    expect(averageSteps([...days, { day: today, steps: 300 }], today)).toBe(8000);
  });

  it('needs a few days before it trusts the number', () => {
    expect(averageSteps([{ day: day(14), steps: 9000 }], today)).toBeNull();
  });

  it('maps to the calorie lifestyle', () => {
    expect([lifestyleFromSteps(4000), lifestyleFromSteps(8000), lifestyleFromSteps(13000)]).toEqual([
      'sitting',
      'on_feet',
      'physical',
    ]);
  });
});

describe('sleep', () => {
  it('merges overlapping phone + watch records and assigns nights to the morning', () => {
    const nights = nightsFrom([
      { start: new Date(2026, 10, 13, 23), end: new Date(2026, 10, 14, 6) },
      { start: new Date(2026, 10, 14, 5), end: new Date(2026, 10, 14, 7) }, // overlaps
      { start: new Date(2026, 10, 15, 0, 30), end: new Date(2026, 10, 15, 5, 30) },
      { start: new Date(2026, 10, 15, 14), end: new Date(2026, 10, 15, 14, 30) }, // nap
    ]);
    expect(nights.map((n) => [n.day, n.hours])).toEqual([
      ['2026-11-14', 8],
      ['2026-11-15', 5.5],
    ]);
  });

  it('short sleep slows recovery', () => {
    const short = recentSleep(
      [
        { day: day(13), hours: 5 },
        { day: day(14), hours: 5.5 },
        { day: today, hours: 5 },
      ],
      today,
    );
    expect(short?.short).toBe(true);
    expect(recoveryHoursFor(short)).toBeGreaterThan(72);
    expect(recoveryHoursFor(recentSleep([{ day: today, hours: 8 }], today))).toBe(72);
    expect(recoveryHoursFor(null)).toBe(72);
  });
});

describe('weighInsToImport', () => {
  it('one per weigh-in week, morning first, skipping weeks already logged', () => {
    const picks = weighInsToImport(
      [
        { date: new Date(2026, 10, 9, 19), kg: 80.4 }, // Mon evening
        { date: new Date(2026, 10, 11, 7), kg: 79.83 }, // Wed morning: wins the week
        { date: new Date(2026, 10, 12, 7), kg: 79.9 },
        { date: new Date(2026, 10, 3, 7), kg: 80.6 }, // week already logged by hand
      ],
      ['2026-11-04'],
      1,
    );
    expect(picks).toEqual([{ date: new Date(2026, 10, 11, 7), kg: 79.8 }]);
  });

  it('ignores impossible readings', () => {
    expect(weighInsToImport([{ date: new Date(2026, 10, 11, 7), kg: 4 }], [], 1)).toEqual([]);
  });
});
