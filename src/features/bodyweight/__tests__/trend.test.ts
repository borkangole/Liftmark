import { describe, expect, it } from 'vitest';

import {
  analyzeBodyweight,
  dateFromKey,
  dayKeyOf,
  isMorning,
  smoothTrend,
  targetConflict,
  targetRange,
  weekStart,
  weeklyEntries,
  weighInStatus,
  type BodyEntry,
} from '../trend';

const now = new Date(2026, 10, 16, 8); // Monday morning, 16 Nov 2026
/** One weigh-in a week for `weeks` weeks up to today, following `fn(weeksAgo)`. */
function weekly(weeks: number, fn: (weeksAgo: number) => number): BodyEntry[] {
  const out: BodyEntry[] = [];
  for (let w = weeks; w >= 0; w--) {
    out.push({ date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - w * 7, 7), weightKg: fn(w) });
  }
  return out;
}
// Week-to-week noise of about ±0.4 kg.
const noise = (w: number) => [0.3, -0.4, 0.1, 0.4, -0.2, -0.3, 0.1][w % 7];

describe('smoothTrend (weekly)', () => {
  it('holds steady through ordinary week-to-week noise', () => {
    const t = smoothTrend(weekly(8, (w) => 80 + noise(w)));
    expect(Math.abs(t.at(-1)!.trendKg - 80)).toBeLessThan(0.3);
  });
  it('keeps one bloated morning from swinging the trend', () => {
    const t = smoothTrend(weekly(6, (w) => (w === 0 ? 81.5 : 80)));
    // A 1.5 kg spike moves the trend well under half of that.
    expect(t.at(-1)!.trendKg - 80).toBeLessThan(0.75);
  });
});

describe('analyzeBodyweight (weekly)', () => {
  it('waits for three weekly weigh-ins over two weeks', () => {
    expect(analyzeBodyweight([], { goal: 'lose_fat', now }).headline).toBe('Log your first weigh-in');
    const two = analyzeBodyweight(weekly(1, () => 80), { goal: 'lose_fat', now });
    expect(two.status).toBe('start');
    expect(two.tip).toContain('1 more weekly weigh-in');
    expect(analyzeBodyweight(weekly(2, () => 80), { goal: 'lose_fat', now }).status).not.toBe('start');
  });

  it('praises a steady cut', () => {
    // -0.5 kg/week at ~80 kg ≈ -0.6%/week: inside lose_fat's 0.25–0.75%.
    const a = analyzeBodyweight(weekly(6, (w) => 79 + w * 0.5 + noise(w) / 2), { goal: 'lose_fat', now });
    expect(a.status).toBe('on_track');
    expect(a.weeklyKg!).toBeLessThan(-0.35);
    expect(a.weeklyKg!).toBeGreaterThan(-0.7);
    expect(a.headline).toContain('right on pace');
    expect(a.calorieAdjust).toBeNull();
  });

  it('is not thrown off by one bloated week in a steady cut', () => {
    const entries = weekly(6, (w) => 79 + w * 0.5 + (w === 0 ? 1.2 : 0));
    const a = analyzeBodyweight(entries, { goal: 'lose_fat', now });
    expect(a.status).not.toBe('wrong_way');
  });

  it('warns when losing too fast, and suggests eating more', () => {
    const a = analyzeBodyweight(weekly(5, (w) => 78 + w * 1.4), { goal: 'lose_fat', now });
    expect(a.status).toBe('too_fast');
    expect(a.calorieAdjust!).toBeGreaterThan(0);
    expect(a.tip).toMatch(/Eat about \d+ kcal a day more/);
  });

  it('flags gaining when the goal is to lose', () => {
    const a = analyzeBodyweight(weekly(5, (w) => 80 - w * 0.4), { goal: 'lose_weight', now });
    expect(a.status).toBe('wrong_way');
    expect(a.headline).toContain('your goal is to lose');
    expect(a.calorieAdjust!).toBeLessThan(0);
  });

  it('calls a stalled bulk, and links stalling lifts', () => {
    const a = analyzeBodyweight(weekly(5, () => 70), {
      goal: 'gain_muscle',
      now,
      lifts: { progressing: 0, stalling: 2, regressing: 0 },
    });
    expect(a.status).toBe('too_slow');
    expect(a.headline).toContain('Holding steady');
    expect(a.tip).toContain('Lifts are stalling too');
  });

  it('judges a bulk by experience level', () => {
    // +0.25 kg/week at 70 kg ≈ +0.36%/week.
    const entries = weekly(5, (w) => 71.25 - w * 0.25);
    expect(analyzeBodyweight(entries, { goal: 'gain_muscle', level: 'advanced', now }).status).toBe('too_fast');
    expect(analyzeBodyweight(entries, { goal: 'gain_muscle', level: 'beginner', now }).status).toBe('on_track');
  });

  it('recognises a recomp when weight holds and lifts climb', () => {
    const a = analyzeBodyweight(weekly(6, (w) => 75 + noise(w) / 2), {
      goal: 'recomp',
      now,
      lifts: { progressing: 3, stalling: 1, regressing: 0 },
    });
    expect(a.status).toBe('on_track');
    expect(a.tip).toContain('recomposition working');
  });

  it('estimates weeks to a target only when heading toward it', () => {
    const cutting = weekly(6, (w) => 79 + w * 0.5);
    const toward = analyzeBodyweight(cutting, { goal: 'lose_fat', now, targetKg: 75 });
    expect(toward.weeksToTarget).toBeGreaterThanOrEqual(7);
    expect(toward.weeksToTarget).toBeLessThanOrEqual(10);
    expect(analyzeBodyweight(cutting, { goal: 'lose_fat', now, targetKg: 85 }).weeksToTarget).toBeNull();
  });

  it('gives no target estimate when the target contradicts the goal', () => {
    const gaining = weekly(5, (w) => 72 - w * 0.15);
    const a = analyzeBodyweight(gaining, { goal: 'lose_fat', now, targetKg: 75 });
    expect(a.status).toBe('wrong_way');
    expect(a.weeksToTarget).toBeNull();
    expect(targetConflict('lose_fat', 75, 72)).toBe('above');
    expect(targetConflict('gain_muscle', 70, 72)).toBe('below');
    expect(targetConflict('lose_fat', 68, 72)).toBeNull();
  });

  it('uses the user unit in its text', () => {
    const a = analyzeBodyweight(weekly(5, (w) => 78 + w * 1.4), {
      goal: 'lose_fat',
      now,
      format: (kg) => `${(Math.abs(kg) / 0.4536).toFixed(1)} lb`,
    });
    expect(a.headline).toMatch(/Losing \d\.\d lb\/week/);
  });
});

describe('weekly schedule', () => {
  it('anchors weeks to the weigh-in day', () => {
    // Weigh-in day Monday (1): Wednesday 18 Nov belongs to the week starting Monday 16 Nov.
    expect(dayKeyOf(weekStart(new Date(2026, 10, 18, 9), 1))).toBe('2026-11-16');
    // Weigh-in day Friday (5): Monday 16 Nov belongs to the week starting Friday 13 Nov.
    expect(dayKeyOf(weekStart(new Date(2026, 10, 16, 9), 5))).toBe('2026-11-13');
  });

  it('keeps one weigh-in per week, the latest', () => {
    const list = weeklyEntries(
      [
        { date: new Date(2026, 10, 16, 7), weightKg: 80 },
        { date: new Date(2026, 10, 18, 7), weightKg: 79.6 }, // same week, logged later
        { date: new Date(2026, 10, 23, 7), weightKg: 79.4 },
      ],
      1,
    );
    expect(list.map((e) => e.weightKg)).toEqual([79.6, 79.4]);
  });

  it('knows when this week is done and when the next one is due', () => {
    const before = weighInStatus([{ date: new Date(2026, 10, 9, 7), weightKg: 80 }], 1, now);
    expect(before.due).toBe(true);
    expect(dayKeyOf(before.next)).toBe('2026-11-16');
    const after = weighInStatus([{ date: new Date(2026, 10, 16, 7), weightKg: 80 }], 1, now);
    expect(after.due).toBe(false);
    expect(dayKeyOf(after.next)).toBe('2026-11-23');
  });

  it('treats before 11 am as morning', () => {
    expect(isMorning(new Date(2026, 10, 16, 7, 30))).toBe(true);
    expect(isMorning(new Date(2026, 10, 16, 14))).toBe(false);
  });
});

describe('targets and days', () => {
  it('keeps every range ordered low → high', () => {
    for (const g of ['lose_weight', 'lose_fat', 'recomp', 'gain_muscle'] as const) {
      const [lo, hi] = targetRange(g, 'intermediate');
      expect(lo).toBeLessThan(hi);
    }
  });
  it('round-trips day keys', () => {
    expect(dayKeyOf(dateFromKey('2026-11-14'))).toBe('2026-11-14');
  });
});
