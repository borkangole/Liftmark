import { describe, expect, it } from 'vitest';

import { buildHistory, findPrSets, type HistoryRow } from '../history';

let setId = 0;
const row = (
  workoutId: number,
  day: Date,
  exerciseId: number,
  weight: number,
  reps: number,
  extra: Partial<HistoryRow> = {},
): HistoryRow => ({
  workoutId,
  workoutName: `W${workoutId}`,
  startedAt: day,
  endedAt: new Date(day.getTime() + 60 * 60_000),
  exerciseId,
  exerciseName: exerciseId === 1 ? 'Bench' : 'Row',
  equipment: 'barbell',
  measure: 'reps',
  setId: ++setId,
  order: setId,
  reps,
  weight,
  isWarmup: false,
  ...extra,
});

const oct = new Date(2026, 9, 28, 18);
const nov1 = new Date(2026, 10, 2, 18);
const nov2 = new Date(2026, 10, 5, 18);

const rows = [
  row(1, oct, 1, 80, 5),
  row(1, oct, 2, 60, 8),
  row(2, nov1, 1, 40, 10, { isWarmup: true }),
  row(2, nov1, 1, 85, 5), // PR
  row(2, nov1, 1, 85, 5), // ties the PR it just set: not another PR
  row(3, nov2, 1, 82.5, 5),
  row(3, nov2, 2, 65, 8), // PR
];

describe('findPrSets', () => {
  const prs = findPrSets(rows);
  it('flags sets that beat every earlier set', () => {
    expect(prs.has(rows[3].setId)).toBe(true);
    expect(prs.has(rows[6].setId)).toBe(true);
  });
  it('ignores first sessions, ties, warm-ups and weaker sets', () => {
    expect(prs.has(rows[0].setId)).toBe(false);
    expect(prs.has(rows[4].setId)).toBe(false);
    expect(prs.has(rows[2].setId)).toBe(false);
    expect(prs.has(rows[5].setId)).toBe(false);
    expect(prs.size).toBe(2);
  });
});

describe('buildHistory', () => {
  const months = buildHistory(rows);
  it('groups by month, newest first', () => {
    expect(months.map((m) => m.key)).toEqual(['2026-11', '2026-10']);
    expect(months[0].workouts.map((w) => w.id)).toEqual([3, 2]);
  });
  it('totals working sets and volume, skipping warm-ups', () => {
    const w2 = months[0].workouts.find((w) => w.id === 2)!;
    expect(w2.setCount).toBe(2);
    expect(w2.volume).toBe(85 * 5 * 2);
    expect(w2.durationMs).toBe(60 * 60_000);
  });
  it('counts PR exercises per workout', () => {
    expect(months[0].workouts.map((w) => w.prCount)).toEqual([1, 1]);
    expect(months[1].workouts[0].prCount).toBe(0);
  });
  it('lists exercises in the order they were done', () => {
    expect(months[1].workouts[0].exerciseNames).toEqual(['Bench', 'Row']);
  });
  it('summarises every exercise with sets and its top set', () => {
    const w2 = months[0].workouts.find((w) => w.id === 2)!;
    expect(w2.exercises).toEqual([
      expect.objectContaining({ name: 'Bench', sets: 2, warmups: 1, topWeight: 85, topReps: 5, sameReps: true, isPr: true }),
    ]);
    const w3 = months[0].workouts.find((w) => w.id === 3)!;
    expect(w3.exercises.map((e) => [e.name, e.sets, e.isPr])).toEqual([
      ['Bench', 1, false],
      ['Row', 1, true],
    ]);
  });
  it('flags mixed reps and keeps the heaviest set as the top set', () => {
    const mixed = buildHistory([
      row(9, nov2, 1, 60, 10),
      row(9, nov2, 1, 70, 6),
      row(9, nov2, 1, 70, 8),
    ])[0].workouts[0].exercises[0];
    expect(mixed).toMatchObject({ sets: 3, topWeight: 70, topReps: 8, sameReps: false });
  });
});

describe('bodyweight PRs', () => {
  it('flags a pull-up PR when reps go up at bodyweight', () => {
    const pull = (w: number, d: Date, reps: number) =>
      row(w, d, 7, 0, reps, { exerciseName: 'Pull-up', equipment: 'bodyweight' });
    const r = [pull(20, oct, 6), pull(21, nov1, 8), pull(22, nov2, 7)];
    const prs = findPrSets(r, 70);
    expect(prs.has(r[1].setId)).toBe(true);
    expect(prs.has(r[2].setId)).toBe(false);
  });
});

