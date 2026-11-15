import { describe, expect, it } from 'vitest';

import {
  analyzeTrend,
  detectPersonalRecords,
  estimateOneRepMax,
  roundToIncrement,
  suggestNextSession,
  summarizeSession,
  type Session,
} from '../index';

const day = (n: number) => new Date(2026, 0, n);
/** Shorthand: one session of `count` equal sets. */
const session = (n: number, weight: number, reps: number, count = 3): Session => ({
  date: day(n),
  sets: Array.from({ length: count }, () => ({ weight, reps })),
});

describe('estimateOneRepMax', () => {
  it('returns the weight for a single', () => expect(estimateOneRepMax(100, 1)).toBe(100));
  it('uses Epley for multiple reps', () => expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 1));
  it('handles empty sets', () => expect(estimateOneRepMax(0, 5)).toBe(0));
});

describe('summarizeSession', () => {
  it('ignores warm-up sets', () => {
    const s = summarizeSession({
      date: day(1),
      sets: [
        { weight: 40, reps: 10, isWarmup: true },
        { weight: 80, reps: 5 },
      ],
    });
    expect(s.volume).toBe(400);
    expect(s.topWeight).toBe(80);
  });
});

describe('detectPersonalRecords', () => {
  it('flags a heavier top set', () => {
    expect(detectPersonalRecords([session(1, 80, 5), session(2, 85, 5)])).toEqual(['e1rm', 'weight', 'volume']);
  });
  it('returns nothing on the first session', () => {
    expect(detectPersonalRecords([session(1, 80, 5)])).toEqual([]);
  });
});

describe('analyzeTrend', () => {
  it('needs at least 3 sessions', () => {
    expect(analyzeTrend([session(1, 80, 5)]).status).toBe('insufficient_data');
  });

  it('detects progress', () => {
    const history = [session(1, 80, 5), session(2, 82.5, 5), session(3, 85, 5), session(4, 87.5, 5)];
    expect(analyzeTrend(history).status).toBe('progressing');
  });

  it('detects a plateau', () => {
    const history = [session(1, 80, 5), session(2, 85, 5), session(3, 85, 4), session(4, 85, 4), session(5, 85, 4)];
    const trend = analyzeTrend(history);
    expect(trend.status).toBe('stalling');
    expect(trend.sessionsSincePr).toBe(3);
  });

  it('does not treat matching your best as progress', () => {
    const history = [session(1, 80, 5), session(2, 85, 5), session(3, 85, 5), session(4, 85, 5), session(5, 85, 5)];
    const trend = analyzeTrend(history);
    expect(trend.status).toBe('stalling');
    expect(trend.sessionsSincePr).toBe(3);
  });

  it('detects regression', () => {
    const history = [session(1, 90, 5), session(2, 87.5, 5), session(3, 85, 5), session(4, 80, 5)];
    expect(analyzeTrend(history).status).toBe('regressing');
  });
});

describe('analyzeTrend by training age', () => {
  // Best on day 1, then flat: every 3 days (beginner pace) or once a week.
  const flat = (days: number[]) => [session(days[0], 100, 5), ...days.slice(1).map((d) => session(d, 100, 4))];

  it("doesn't call a beginner stuck after one fast week", () => {
    const history = flat([1, 3, 5, 7]);
    expect(analyzeTrend(history, { level: 'beginner', now: day(8) }).status).toBe('progressing');
    expect(analyzeTrend(flat([1, 4, 8, 12]), { level: 'beginner', now: day(13) }).status).toBe('stalling');
  });
  it('gives advanced lifters longer', () => {
    const fourWeeks = flat([1, 8, 15, 22, 29]);
    expect(analyzeTrend(fourWeeks, { level: 'advanced', now: day(30) }).status).toBe('progressing');
    const sixWeeks = flat([1, 8, 15, 22, 29, 36, 43]);
    const trend = analyzeTrend(sixWeeks, { level: 'advanced', now: day(44) });
    expect(trend.status).toBe('stalling');
    expect(trend.reason).toMatch(/6 weeks/);
    expect(trend.bestDate).toEqual(day(1));
  });
  it('treats one bad session as noise, not a regression', () => {
    const history = [session(1, 95, 5), session(4, 97.5, 5), session(8, 100, 5), session(11, 90, 5)];
    expect(analyzeTrend(history, { now: day(12) }).status).not.toBe('regressing');
  });
});

describe('suggestNextSession', () => {
  const opts = { repRange: { min: 5, max: 8 }, increment: 2.5 };

  it('adds weight after hitting the top of the range on every set', () => {
    const history = [session(1, 80, 6), session(2, 80, 7), session(3, 80, 8)];
    const s = suggestNextSession(history.at(-1), analyzeTrend(history), opts);
    expect(s).toMatchObject({ kind: 'add_weight', weight: 82.5, targetReps: 5 });
  });

  it('adds reps when the range is not yet maxed', () => {
    const history = [session(1, 80, 5), session(2, 80, 6), session(3, 80, 6)];
    const s = suggestNextSession(history.at(-1), analyzeTrend(history), opts);
    expect(s).toMatchObject({ kind: 'add_reps', weight: 80, targetReps: 7 });
  });

  it('suggests a deload when regressing', () => {
    const history = [session(1, 90, 5), session(2, 87.5, 5), session(3, 85, 5), session(4, 80, 5)];
    const s = suggestNextSession(history.at(-1), analyzeTrend(history), opts);
    expect(s).toMatchObject({ kind: 'deload', weight: 72.5 });
  });

  it('returns null with no history', () => {
    expect(suggestNextSession(undefined, analyzeTrend([]), opts)).toBeNull();
  });
});

describe('roundToIncrement', () => {
  it('rounds to the nearest plate step', () => expect(roundToIncrement(73.4, 2.5)).toBe(72.5));
});
