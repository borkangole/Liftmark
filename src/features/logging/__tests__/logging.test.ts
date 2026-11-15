import { describe, expect, it } from 'vitest';

import { formatDuration, formatNumber } from '@/lib/format';
import { parseNumberInput, prefillSet } from '../prefill';

const suggestion = { kind: 'add_reps' as const, weight: 80, targetReps: 7, sets: 3, reason: '' };

describe('prefillSet', () => {
  it('repeats the set just logged', () => {
    expect(prefillSet({ lastLogged: { weight: 85, reps: 5 }, suggestion })).toEqual({
      weight: 85,
      reps: 5,
      source: 'this_workout',
    });
  });
  it('uses the suggestion for the first set', () => {
    expect(prefillSet({ suggestion })).toMatchObject({ weight: 80, reps: 7, source: 'suggestion' });
  });
  it('falls back to last session', () => {
    expect(prefillSet({ lastSessionTopSet: { weight: 60, reps: 10 } }).source).toBe('last_session');
  });
  it('uses the profile estimate for a brand new exercise', () => {
    expect(prefillSet({ starter: { weight: 35, reps: 10 } })).toEqual({ weight: 35, reps: 10, source: 'profile' });
  });
  it('is empty with no history and no profile', () => {
    expect(prefillSet({})).toEqual({ weight: null, reps: null, source: 'none' });
  });
});

describe('parseNumberInput', () => {
  it('accepts comma decimals', () => expect(parseNumberInput('82,5')).toBe(82.5));
  it('rejects junk and negatives', () => {
    expect(parseNumberInput('abc')).toBeNull();
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('-5')).toBeNull();
  });
});

describe('format', () => {
  it('trims float noise', () => expect(formatNumber(82.50000001)).toBe('82.5'));
  it('formats durations', () => {
    expect(formatDuration(75_000)).toBe('1:15');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });
});
