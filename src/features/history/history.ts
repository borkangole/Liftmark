import { loadTypeOf, scoreContext, setScore, type LoadType, type Measure } from '@/features/progression';

/** One logged set from a finished workout, flattened from the DB join. */
export interface HistoryRow {
  workoutId: number;
  workoutName: string | null;
  startedAt: Date;
  endedAt: Date | null;
  exerciseId: number;
  exerciseName: string;
  equipment: string;
  measure: Measure;
  setId: number;
  order: number;
  reps: number;
  weight: number;
  isWarmup: boolean;
}

/** One exercise inside a finished workout, summarised for the history card. */
export interface HistoryExercise {
  exerciseId: number;
  name: string;
  type: LoadType;
  /** Working sets (warm-ups excluded). */
  sets: number;
  warmups: number;
  /** Heaviest working set; ties go to the one with more reps. */
  topWeight: number;
  topReps: number;
  /** True when every working set used the same reps — lets the card show "3 × 8". */
  sameReps: boolean;
  isPr: boolean;
}

export interface HistoryWorkout {
  id: number;
  name: string | null;
  startedAt: Date;
  durationMs: number;
  setCount: number;
  volume: number;
  exerciseNames: string[];
  /** Every exercise in the order it was done, so the card can list them all. */
  exercises: HistoryExercise[];
  /** How many exercises hit a new best estimated 1RM in this workout. */
  prCount: number;
}

export interface HistoryMonth {
  key: string; // "2026-11"
  label: string; // "November 2026"
  workouts: HistoryWorkout[];
  volume: number;
}

/**
 * Walks every set in time order and flags the ones that beat the best estimated 1RM
 * seen before them for that exercise. An exercise's very first session never counts as a PR.
 */
export function findPrSets(rows: HistoryRow[], bodyweightKg?: number | null): Set<number> {
  const sorted = [...rows].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime() || a.order - b.order,
  );
  const best = new Map<number, number>();
  const firstWorkout = new Map<number, number>();
  const prs = new Set<number>();
  for (const r of sorted) {
    if (r.isWarmup || r.reps <= 0) continue;
    if (!firstWorkout.has(r.exerciseId)) firstWorkout.set(r.exerciseId, r.workoutId);
    // e1RM for loaded lifts (bodyweight included for pull-ups etc.), seconds for timed holds.
    const e1rm = setScore(r, scoreContext(r, bodyweightKg));
    const prev = best.get(r.exerciseId) ?? 0;
    if (e1rm > prev) {
      if (firstWorkout.get(r.exerciseId) !== r.workoutId) prs.add(r.setId);
      best.set(r.exerciseId, e1rm);
    }
  }
  return prs;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Finished workouts grouped by month, newest first, with per-workout totals and PR counts. */
export function buildHistory(rows: HistoryRow[], { bodyweightKg }: { bodyweightKg?: number | null } = {}): HistoryMonth[] {
  const prSets = findPrSets(rows, bodyweightKg);
  const byWorkout = new Map<number, { rows: HistoryRow[] }>();
  for (const r of rows) {
    const entry = byWorkout.get(r.workoutId) ?? { rows: [] };
    entry.rows.push(r);
    byWorkout.set(r.workoutId, entry);
  }

  const workouts: HistoryWorkout[] = [...byWorkout.entries()].map(([id, { rows: wr }]) => {
    const first = wr[0];
    const working = wr.filter((r) => !r.isWarmup);
    const byExercise = new Map<number, HistoryExercise>();
    const repsSeen = new Map<number, Set<number>>();
    for (const r of [...wr].sort((a, b) => a.order - b.order)) {
      let ex = byExercise.get(r.exerciseId);
      if (!ex) {
        ex = { exerciseId: r.exerciseId, name: r.exerciseName, type: loadTypeOf(r), sets: 0, warmups: 0, topWeight: 0, topReps: 0, sameReps: true, isPr: false };
        byExercise.set(r.exerciseId, ex);
        repsSeen.set(r.exerciseId, new Set());
      }
      if (prSets.has(r.setId)) ex.isPr = true;
      if (r.isWarmup) {
        ex.warmups += 1;
        continue;
      }
      ex.sets += 1;
      repsSeen.get(r.exerciseId)!.add(r.reps);
      if (r.weight > ex.topWeight || (r.weight === ex.topWeight && r.reps > ex.topReps)) {
        ex.topWeight = r.weight;
        ex.topReps = r.reps;
      }
    }
    const exercises = [...byExercise.values()].map((ex) => ({ ...ex, sameReps: repsSeen.get(ex.exerciseId)!.size <= 1 }));
    const names = exercises.map((e) => e.name);
    const prExercises = new Set(wr.filter((r) => prSets.has(r.setId)).map((r) => r.exerciseId));
    return {
      id,
      name: first.workoutName,
      startedAt: first.startedAt,
      durationMs: first.endedAt ? first.endedAt.getTime() - first.startedAt.getTime() : 0,
      setCount: working.length,
      volume: working.reduce((sum, r) => sum + r.reps * r.weight, 0),
      exerciseNames: names,
      exercises,
      prCount: prExercises.size,
    };
  });

  workouts.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  const months: HistoryMonth[] = [];
  for (const w of workouts) {
    const key = monthKey(w.startedAt);
    let month = months.find((m) => m.key === key);
    if (!month) {
      month = {
        key,
        label: w.startedAt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        workouts: [],
        volume: 0,
      };
      months.push(month);
    }
    month.workouts.push(w);
    month.volume += w.volume;
  }
  return months;
}
