import { describe, expect, it } from 'vitest';

import { suggestNextSession, type TrendResult } from '@/features/progression';
import { formatLoad, formatRepRange, formatSeconds, formatSet, formatTarget, formatWeight } from '../format';
import { fromDisplayWeight, progressionStepDisplay, progressionStepKg } from '../units';

describe('progression steps', () => {
  it('keeps kg increments as they are', () => {
    expect(progressionStepKg(2.5, 'kg')).toBe(2.5);
  });
  it('maps kg increments to real lb plates', () => {
    expect(progressionStepDisplay(2.5, 'lb')).toBe(5);
    expect(progressionStepDisplay(1, 'lb')).toBe(2.5);
    expect(progressionStepDisplay(2, 'lb')).toBe(5);
    expect(progressionStepDisplay(5, 'lb')).toBe(10);
  });
});

describe('suggestions in lb land on whole plates', () => {
  const trend: TrendResult = { status: 'progressing', slopePerSession: 0.02, sessionsSincePr: 0, daysSincePr: 0, bestDate: null, slowing: false, allTimeBestE1rm: 0, reason: '' };
  const fmt = (kg: number) => formatWeight(kg, 'lb');

  it('adds 5 lb, not 2.5 kg', () => {
    const last = { date: new Date(), sets: [0, 1, 2].map(() => ({ weight: fromDisplayWeight(170, 'lb'), reps: 8 })) };
    const next = suggestNextSession(last, trend, { repRange: { min: 6, max: 8 }, increment: progressionStepKg(2.5, 'lb'), formatWeight: fmt })!;
    expect(fmt(next.weight)).toBe('175 lb');
    expect(next.reason).toBe('You hit 8+ reps on every set at 170 lb. Go up to 175 lb.');
  });
  it('snaps a kg-logged weight to whole plates when holding', () => {
    const last = { date: new Date(), sets: [0, 1].map(() => ({ weight: 77.5, reps: 7 })) };
    const opts = { repRange: { min: 6, max: 10 }, increment: progressionStepKg(2.5, 'lb'), formatWeight: fmt, snapToIncrement: true };
    const next = suggestNextSession(last, trend, opts)!;
    expect(fmt(next.weight)).toBe('170 lb'); // 77.5 kg = 170.9 lb
    expect(next.reason).toBe('Stay at 170 lb and aim for 8 reps on every set.');
  });
  it('rounds a deload to whole plates too', () => {
    const last = { date: new Date(), sets: [{ weight: fromDisplayWeight(185, 'lb'), reps: 5 }] };
    const regressing = { ...trend, status: 'regressing' as const, reason: 'Dropping.' };
    const next = suggestNextSession(last, regressing, { repRange: { min: 5, max: 8 }, increment: progressionStepKg(2.5, 'lb'), formatWeight: fmt })!;
    expect(fmt(next.weight)).toBe('165 lb'); // 185 × 0.9 = 166.5 → nearest 5 lb
    expect(next.reason).toBe('Dropping. Drop to 165 lb for a lighter session, then build back up.');
  });
});

describe('set formatting', () => {
  it('formats each kind of set', () => {
    expect(formatSet({ weight: 77.5, reps: 8 }, 'weighted', 'kg')).toBe('77.5 kg × 8');
    expect(formatSet({ weight: 0, reps: 10 }, 'bodyweight', 'kg')).toBe('BW × 10');
    expect(formatSet({ weight: 10, reps: 6 }, 'bodyweight', 'kg')).toBe('BW + 10 kg × 6');
    expect(formatSet({ weight: 0, reps: 45 }, 'timed', 'kg')).toBe('45 s');
  });
  it('formats targets, loads, holds and ranges', () => {
    expect(formatTarget({ sets: 3, targetReps: 8, weight: 0 }, 'bodyweight', 'kg')).toBe('3 × 8 @ BW');
    expect(formatTarget({ sets: 3, targetReps: 45, weight: 0 }, 'timed', 'kg')).toBe('3 × 45 s');
    expect(formatLoad(fromDisplayWeight(175, 'lb'), 'weighted', 'lb')).toBe('175 lb');
    expect(formatSeconds(90)).toBe('1:30');
    expect(formatRepRange(30, 60, 'timed')).toBe('30–60 s');
    expect(formatRepRange(6, 10, 'weighted')).toBe('6–10 reps');
  });
});
