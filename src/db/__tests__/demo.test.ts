import { describe, expect, it } from 'vitest';

import { buildProgressOverview, type ProgressRow } from '@/features/progress/overview';
import { analyzeBodyweight } from '@/features/bodyweight/trend';
import { buildDemoBodyweights, buildDemoWorkouts } from '../demo';

const DEMO_LIFTS = ['Barbell Bench Press', 'Barbell Back Squat', 'Lat Pulldown', 'Overhead Press', 'Barbell Row', 'Pull-up', 'Plank'];

describe('demo data', () => {
  it('shows a progressing, a stalling and a regressing lift', () => {
    const now = new Date(2026, 10, 9, 20); // a Monday evening
    const rows: ProgressRow[] = buildDemoWorkouts(now).flatMap((w, workoutId) =>
      w.sets.map((s) => ({
        workoutId,
        startedAt: w.startedAt,
        exerciseId: DEMO_LIFTS.indexOf(s.exercise),
        exerciseName: s.exercise,
        muscleGroup: 'x',
        equipment: s.exercise === 'Pull-up' || s.exercise === 'Plank' ? 'bodyweight' : 'barbell',
        measure: s.exercise === 'Plank' ? ('time' as const) : ('reps' as const),
        repRangeMin: 5,
        repRangeMax: 8,
        weightIncrement: 2.5,
        reps: s.reps,
        weight: s.weight,
        isWarmup: s.isWarmup,
      })),
    );
    const o = buildProgressOverview(rows, { now, bodyweightKg: 72 });
    const status = Object.fromEntries(o.lifts.map((l) => [l.name, l.trend.status]));

    expect(status['Barbell Bench Press']).toBe('progressing');
    expect(status['Barbell Back Squat']).toBe('progressing');
    expect(status['Overhead Press']).toBe('stalling');
    expect(status['Barbell Row']).toBe('regressing');
    expect(status['Pull-up']).toBe('progressing');
    expect(status['Plank']).toBe('progressing');
    expect(o.workoutsThisWeek).toBe(1);
    expect(o.weekStreak).toBeGreaterThanOrEqual(10);
  });
});

describe('demo bodyweight', () => {
  it('reads as an on-track lean bulk for an intermediate lifter', () => {
    const now = new Date(2026, 10, 9, 20);
    const a = analyzeBodyweight(buildDemoBodyweights(now), { goal: 'gain_muscle', level: 'intermediate', now });
    expect(a.status).toBe('on_track');
    expect(a.weeklyKg!).toBeGreaterThan(0.05);
  });
});

