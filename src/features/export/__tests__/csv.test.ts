import { describe, expect, it } from 'vitest';

import { buildCsv, csvField } from '../csv';

describe('csvField', () => {
  it('leaves plain values alone', () => expect(csvField('Bench')).toBe('Bench'));
  it('quotes commas and escapes quotes', () => {
    expect(csvField('Push, heavy')).toBe('"Push, heavy"');
    expect(csvField('The "big" day')).toBe('"The ""big"" day"');
  });
  it('renders empty for null', () => expect(csvField(null)).toBe(''));
});

describe('buildCsv', () => {
  const day = new Date(2026, 10, 9, 18, 5);
  const base = {
    workoutId: 1,
    workoutName: 'Push, A',
    startedAt: day,
    endedAt: day,
    exerciseId: 1,
    exerciseName: 'Barbell Bench Press',
    equipment: 'barbell',
    measure: 'reps' as const,
  };
  const csv = buildCsv([
    { ...base, setId: 1, order: 0, reps: 10, weight: 40, isWarmup: true },
    { ...base, setId: 2, order: 1, reps: 5, weight: 100, isWarmup: false },
    { ...base, setId: 3, order: 2, reps: 5, weight: 100, isWarmup: false },
  ]);
  const lines = csv.trim().split('\n');

  it('has a header and one line per set', () => {
    expect(lines[0]).toBe('date,time,workout,exercise,set,weight_kg,weight_lb,reps,warmup,est_1rm_kg,seconds');
    expect(lines).toHaveLength(4);
  });
  it('numbers working sets and marks warm-ups', () => {
    expect(lines[1]).toBe('2026-11-09,18:05,"Push, A",Barbell Bench Press,W,40,88.2,10,true,,');
    expect(lines[2]).toBe('2026-11-09,18:05,"Push, A",Barbell Bench Press,1,100,220.5,5,false,116.7,');
    expect(lines[3].split(',')[5]).toBe('2');
  });
  it('includes bodyweight in the 1RM of bodyweight lifts', () => {
    const [, line] = buildCsv(
      [{ ...base, exerciseName: 'Pull-up', equipment: 'bodyweight', setId: 9, order: 0, reps: 8, weight: 10, isWarmup: false }],
      { bodyweightKg: 70 },
    )
      .trim()
      .split('\n');
    // (70 + 10) × (1 + 8/30) = 101.3
    expect(line).toBe('2026-11-09,18:05,"Push, A",Pull-up,1,10,22,8,false,101.3,');
  });
  it('puts timed holds in the seconds column', () => {
    const [, line] = buildCsv([
      { ...base, exerciseName: 'Plank', equipment: 'bodyweight', measure: 'time', setId: 10, order: 0, reps: 45, weight: 0, isWarmup: false },
    ])
      .trim()
      .split('\n');
    expect(line).toBe('2026-11-09,18:05,"Push, A",Plank,1,0,0,,false,,45');
  });
});
