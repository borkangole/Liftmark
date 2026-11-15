import { inArray } from 'drizzle-orm';

import type { Db } from './client';
import { dayKeyOf, weekStart } from '@/features/bodyweight/trend';
import { bodyweights, exercises, sets, workouts, type NewWorkoutSet } from './schema';

/**
 * Dev-only: fills ~10 weeks of realistic training so the Progress tab can be demoed.
 * Lifts are shaped on purpose: most progress, Overhead Press stalls, Barbell Row regresses.
 * Pull-ups (bodyweight) and Plank (timed, seconds) show the non-barbell lifts.
 */
const round = (n: number, step = 2.5) => Math.round(n / step) * step;

/** `reps` are seconds for Plank. `warmup: false` skips the warm-up set (bodyweight work). */
type Plan = (i: number, n: number) => { weight: number; reps: number[]; warmup?: boolean };

const plans: Record<string, Plan> = {
  'Barbell Bench Press': (i, n) => ({
    weight: round(60 + 17.5 * (i / (n - 1))),
    reps: [6 + (i % 3), 6 + (i % 3), 5 + (i % 3)],
  }),
  'Barbell Back Squat': (i, n) => ({ weight: round(80 + 27.5 * (i / (n - 1))), reps: [5, 5, 5] }),
  'Lat Pulldown': (i, n) => ({ weight: round(45 + 12.5 * (i / (n - 1))), reps: [10, 10, 9] }),
  'Overhead Press': (i, n) => {
    const peak = Math.max(0, n - 6);
    return i < peak
      ? { weight: round(32.5 + i * 1.25, 1.25), reps: [6, 6, 5] }
      : { weight: round(32.5 + peak * 1.25, 1.25), reps: [5, 5, 4] };
  },
  // Bodyweight: reps climb from 6, then a belt with 2.5 → 5 kg for the last few weeks.
  'Pull-up': (i, n) => {
    if (i < n - 4) {
      const reps = Math.min(10, 6 + Math.floor(i / 3));
      return { weight: 0, reps: [reps, reps, reps - 1], warmup: false };
    }
    return { weight: i < n - 2 ? 2.5 : 5, reps: [9, 9, 8], warmup: false };
  },
  // Timed: hold time grows 5 s every couple of sessions.
  Plank: (i) => {
    const s = 30 + 5 * Math.floor(i / 2);
    return { weight: 0, reps: [s, s, s - 5], warmup: false };
  },
  'Barbell Row': (i, n) => {
    const peak = n - 4;
    return i < peak
      ? { weight: round(50 + i * 1.25, 1.25), reps: [8, 8, 8] }
      : { weight: round(50 + peak * 1.25 - (i - peak + 1) * 2.5), reps: [8, 7, 7] };
  },
};

const dayName: Record<number, string> = { 1: 'Upper A', 3: 'Lower A', 5: 'Upper B' };

// Mon/Fri = upper, Wed = lower.
const dayPlan: Record<number, string[]> = {
  1: ['Barbell Bench Press', 'Barbell Row', 'Pull-up'],
  3: ['Barbell Back Squat', 'Overhead Press', 'Plank'],
  5: ['Barbell Bench Press', 'Barbell Row', 'Lat Pulldown'],
};

export interface DemoSet {
  exercise: string;
  weight: number;
  reps: number;
  isWarmup: boolean;
}
export interface DemoWorkout {
  name: string;
  startedAt: Date;
  durationMin: number;
  sets: DemoSet[];
}

/**
 * Pure: ten weeks of Monday-morning weigh-ins on a slow lean bulk (about +0.15 kg/week from 70.8 kg),
 * with realistic week-to-week noise.
 */
export function buildDemoBodyweights(now = new Date(), weeks = 10): { date: Date; weightKg: number }[] {
  const noise = [0.2, -0.25, 0.1, 0.3, -0.15, -0.2, 0.1, 0.05, -0.1, 0.15, 0];
  const monday = weekStart(now, 1);
  const out: { date: Date; weightKg: number }[] = [];
  for (let w = weeks; w >= 0; w--) {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - w * 7, 7, 15);
    const trend = 70.8 + (weeks - w) * 0.15;
    out.push({ date, weightKg: Math.round((trend + noise[w % noise.length]) * 10) / 10 });
  }
  return out;
}

/** Pure: the demo training log, so it can be tested without a database. */
export function buildDemoWorkouts(now = new Date(), weeks = 10): DemoWorkout[] {
  // Training days from `weeks` ago up to today (today's session is placed in the past hour).
  const days: Date[] = [];
  for (let d = weeks * 7; d >= 0; d--) {
    const date =
      d === 0
        ? new Date(now.getTime() - 70 * 60_000)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 18, 0);
    if (dayPlan[date.getDay()]) days.push(date);
  }

  const totalSessions = new Map<string, number>();
  for (const date of days) {
    for (const name of dayPlan[date.getDay()]) totalSessions.set(name, (totalSessions.get(name) ?? 0) + 1);
  }
  const seen = new Map<string, number>();

  return days.map((startedAt, n) => ({
    name: dayName[startedAt.getDay()],
    startedAt,
    durationMin: 52 + ((n * 7) % 19),
    sets: dayPlan[startedAt.getDay()].flatMap((exercise) => {
      const i = seen.get(exercise) ?? 0;
      seen.set(exercise, i + 1);
      const { weight, reps, warmup = true } = plans[exercise](i, totalSessions.get(exercise)!);
      return [
        ...(warmup ? [{ exercise, weight: round(weight * 0.5), reps: 10, isWarmup: true }] : []),
        ...reps.map((r) => ({ exercise, weight, reps: r, isWarmup: false })),
      ];
    }),
  }));
}

export async function loadDemoData(db: Db, weeks = 10) {
  const rows = await db.select().from(exercises).where(inArray(exercises.name, Object.keys(plans)));
  const idByName = new Map(rows.map((r) => [r.name, r.id]));

  for (const demo of buildDemoWorkouts(new Date(), weeks)) {
    const [workout] = await db
      .insert(workouts)
      .values({
        name: demo.name,
        startedAt: demo.startedAt,
        endedAt: new Date(demo.startedAt.getTime() + demo.durationMin * 60_000),
      })
      .returning({ id: workouts.id });

    const values: NewWorkoutSet[] = demo.sets.flatMap((set, order) => {
      const exerciseId = idByName.get(set.exercise);
      return exerciseId
        ? [{ workoutId: workout.id, exerciseId, order, weight: set.weight, reps: set.reps, isWarmup: set.isWarmup }]
        : [];
    });
    if (values.length) await db.insert(sets).values(values);
  }

  const weighIns = buildDemoBodyweights(new Date(), weeks).map((w) => ({ day: dayKeyOf(w.date), weightKg: w.weightKg }));
  await db.insert(bodyweights).values(weighIns).onConflictDoNothing();
}
