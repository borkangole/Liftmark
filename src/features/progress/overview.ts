import type { Muscle } from '@/features/muscles/targets';
import type { Level } from '@/features/profile/types';
import {
  analyzeTrend,
  diagnoseStall,
  suggestWithPlan,
  type ActivePlan,
  restGaps,
  STALL_RULES,
  type Diagnosis,
  type StallContext,
  scoreContext,
  suggestNextSession,
  summarizeSession,
  toScoredSessions,
  type LoadType,
  type Measure,
  type Session,
  type Suggestion,
  type TrendResult,
  type TrendStatus,
} from '@/features/progression';
import { formatWeight } from '@/lib/format';
import { progressionStepKg, type WeightUnit } from '@/lib/units';
import { addDays, dayKey, startOfWeek } from './dates';

/** One logged set with everything the overview needs, flattened from the DB join. */
export interface ProgressRow {
  workoutId: number;
  startedAt: Date;
  exerciseId: number;
  exerciseName: string;
  muscleGroup: string;
  equipment: string;
  measure: Measure;
  repRangeMin: number;
  repRangeMax: number;
  weightIncrement: number;
  reps: number;
  weight: number;
  isWarmup: boolean;
  /** When the set was logged: gaps between sets give the real rest. */
  loggedAt?: Date;
  isCustom?: boolean;
  targetMuscles?: Muscle[] | null;
  restSeconds?: number | null;
}

/** Everything outside the gym that helps explain a stall. */
export type StallInputs = Pick<StallContext, 'goal' | 'targets' | 'maintenance' | 'food' | 'weighIns'> & {
  /** Recommended rest for an exercise, in seconds. */
  restFor?: (row: ProgressRow) => number | null;
};

export interface LiftProgress {
  exerciseId: number;
  name: string;
  muscleGroup: string;
  /** How `latestE1rm`/`series` are measured: kg e1RM, or seconds for timed holds. */
  type: LoadType;
  trend: TrendResult;
  suggestion: Suggestion | null;
  latestE1rm: number;
  /** Best e1RM per session inside the selected range (falls back to the last few sessions). */
  series: number[];
  /** Change from first to last point of `series`, as a fraction. Null with fewer than 2 points. */
  change: number | null;
  sessionCount: number;
  lastTrained: Date;
  /** Likely causes when stalling or regressing (empty otherwise). */
  diagnosis: Diagnosis;
  /** The fix the user is trying for this lift, if any. */
  plan: ActivePlan | null;
  repRange: { min: number; max: number };
}

export interface PrEvent {
  exerciseId: number;
  name: string;
  type: LoadType;
  date: Date;
  e1rm: number;
  previousBest: number;
}

export interface WeekVolume {
  weekStart: Date;
  volume: number;
}

export interface ProgressOverview {
  lifts: LiftProgress[];
  needsAttention: LiftProgress[];
  statusCounts: Record<TrendStatus, number>;
  weeklyVolume: WeekVolume[];
  /** Workouts per day for the last `ACTIVITY_WEEKS` weeks, keyed by dayKey. */
  activity: Record<string, number>;
  activityStart: Date;
  workoutsThisWeek: number;
  weekStreak: number;
  rangeVolume: number;
  rangeSessions: number;
  recentPrs: PrEvent[];
  rangePrCount: number;
}

export const ACTIVITY_WEEKS = 12;
const VOLUME_WEEKS = 8;
const FALLBACK_POINTS = 6;

const ATTENTION_ORDER: Record<TrendStatus, number> = {
  regressing: 0,
  stalling: 1,
  progressing: 2,
  insufficient_data: 3,
};

export function buildProgressOverview(
  rows: ProgressRow[],
  {
    now = new Date(),
    rangeWeeks = 12,
    bodyweightKg,
    unit = 'kg',
    level,
    stall,
    plans = {},
  }: {
    now?: Date;
    rangeWeeks?: number | null;
    bodyweightKg?: number | null;
    unit?: WeightUnit;
    level?: Level;
    stall?: StallInputs;
    plans?: Record<number, ActivePlan>;
  } = {},
): ProgressOverview {
  const thisWeek = startOfWeek(now);
  const rangeStart = rangeWeeks === null ? new Date(0) : addDays(thisWeek, -7 * (rangeWeeks - 1));

  // --- Group rows: exercise → workout → session -----------------------------------------
  const byExercise = new Map<number, { info: ProgressRow; sessions: Map<number, Session>; rows: ProgressRow[] }>();
  const workoutDates = new Map<number, Date>();
  for (const row of rows) {
    workoutDates.set(row.workoutId, row.startedAt);
    const entry = byExercise.get(row.exerciseId) ?? { info: row, sessions: new Map<number, Session>(), rows: [] };
    entry.rows.push(row);
    const session = entry.sessions.get(row.workoutId) ?? { date: row.startedAt, sets: [] };
    session.sets.push({ reps: row.reps, weight: row.weight, isWarmup: row.isWarmup });
    entry.sessions.set(row.workoutId, session);
    byExercise.set(row.exerciseId, entry);
  }

  // --- Per-lift trends ----------------------------------------------------------------------
  const lifts: LiftProgress[] = [];
  const prEvents: PrEvent[] = [];
  const rowsByLift = new Map<number, { info: ProgressRow; rows: ProgressRow[]; sessions: Session[] }>();
  for (const [exerciseId, { info, sessions: sessionMap, rows: liftRows }] of byExercise) {
    const sessions = [...sessionMap.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
    // Bodyweight lifts score with your bodyweight added; timed holds score in seconds.
    const ctx = scoreContext(info, bodyweightKg);
    const scored = toScoredSessions(sessions, ctx);
    const summaries = scored.map(summarizeSession).filter((s) => s.bestE1rm > 0);
    if (summaries.length === 0) continue;

    const trend = analyzeTrend(scored, { metric: ctx.type === 'timed' ? 'hold time' : 'estimated 1RM', level, now });
    rowsByLift.set(exerciseId, { info, rows: liftRows, sessions });
    const plan = plans[exerciseId] ?? null;
    const suggestion = suggestWithPlan(
      sessions,
      trend,
      {
        deloadAfter: level ? STALL_RULES[level].stallAfter + 2 : undefined,
        repRange: { min: info.repRangeMin, max: info.repRangeMax },
        increment: progressionStepKg(info.weightIncrement, unit),
        type: ctx.type,
        formatWeight: (kg) => formatWeight(kg, unit),
        snapToIncrement: unit === 'lb',
      },
      plan,
    );

    const inRange = summaries.filter((s) => s.date >= rangeStart);
    const seriesSource = inRange.length >= 2 ? inRange : summaries.slice(-FALLBACK_POINTS);
    const series = seriesSource.map((s) => s.bestE1rm);
    const change = series.length >= 2 && series[0] > 0 ? (series[series.length - 1] - series[0]) / series[0] : null;

    let best = summaries[0].bestE1rm;
    for (const s of summaries.slice(1)) {
      if (s.bestE1rm > best) {
        prEvents.push({
          exerciseId,
          name: info.exerciseName,
          type: ctx.type,
          date: s.date,
          e1rm: s.bestE1rm,
          previousBest: best,
        });
        best = s.bestE1rm;
      }
    }

    lifts.push({
      exerciseId,
      name: info.exerciseName,
      muscleGroup: info.muscleGroup,
      type: ctx.type,
      trend,
      suggestion,
      latestE1rm: summaries[summaries.length - 1].bestE1rm,
      series,
      change,
      sessionCount: summaries.length,
      lastTrained: summaries[summaries.length - 1].date,
      diagnosis: { causes: [], since: null },
      plan,
      repRange: { min: info.repRangeMin, max: info.repRangeMax },
    });
  }

  // --- Why stuck lifts are stuck: needs every lift's status first (several stuck at once = recovery) ---
  const stuckCount = lifts.filter((l) => l.trend.status === 'stalling' || l.trend.status === 'regressing').length;
  const tracked = lifts.filter((l) => l.trend.status !== 'insufficient_data').length;
  for (const lift of lifts) {
    if (lift.trend.status !== 'stalling' && lift.trend.status !== 'regressing') continue;
    const data = rowsByLift.get(lift.exerciseId)!;
    const since = lift.trend.bestDate;
    lift.diagnosis = diagnoseStall(lift.trend, {
      now,
      sessions: data.sessions,
      rests: restGaps(
        data.rows
          .filter((r) => r.loggedAt)
          .map((r) => ({ workoutId: r.workoutId, loggedAt: r.loggedAt!, isWarmup: r.isWarmup })),
        since,
      ),
      recommendedRestSeconds: stall?.restFor?.(data.info) ?? null,
      liftCount: tracked,
      otherStuck: stuckCount - 1,
      goal: stall?.goal ?? null,
      targets: stall?.targets ?? null,
      maintenance: stall?.maintenance ?? null,
      food: stall?.food ?? [],
      weighIns: stall?.weighIns ?? [],
    });
  }

  lifts.sort(
    (a, b) =>
      ATTENTION_ORDER[a.trend.status] - ATTENTION_ORDER[b.trend.status] ||
      (b.change ?? -Infinity) - (a.change ?? -Infinity) ||
      a.name.localeCompare(b.name),
  );

  const statusCounts: Record<TrendStatus, number> = {
    progressing: 0,
    stalling: 0,
    regressing: 0,
    insufficient_data: 0,
  };
  lifts.forEach((l) => statusCounts[l.trend.status]++);

  // --- Volume by week -----------------------------------------------------------------------
  const volumeByWeek = new Map<number, number>();
  let rangeVolume = 0;
  for (const row of rows) {
    if (row.isWarmup) continue;
    const v = row.reps * row.weight;
    const wk = startOfWeek(row.startedAt).getTime();
    volumeByWeek.set(wk, (volumeByWeek.get(wk) ?? 0) + v);
    if (row.startedAt >= rangeStart) rangeVolume += v;
  }
  const weeklyVolume: WeekVolume[] = Array.from({ length: VOLUME_WEEKS }, (_, i) => {
    const weekStart = addDays(thisWeek, -7 * (VOLUME_WEEKS - 1 - i));
    return { weekStart, volume: volumeByWeek.get(weekStart.getTime()) ?? 0 };
  });

  // --- Activity, streak, sessions -------------------------------------------------------------
  const activityStart = addDays(thisWeek, -7 * (ACTIVITY_WEEKS - 1));
  const activity: Record<string, number> = {};
  const activeWeeks = new Set<number>();
  let workoutsThisWeek = 0;
  let rangeSessions = 0;
  for (const date of workoutDates.values()) {
    activeWeeks.add(startOfWeek(date).getTime());
    if (date >= activityStart) activity[dayKey(date)] = (activity[dayKey(date)] ?? 0) + 1;
    if (date >= thisWeek) workoutsThisWeek++;
    if (date >= rangeStart) rangeSessions++;
  }

  // Streak counts back from this week; an empty current week doesn't break it yet.
  let weekStreak = 0;
  let cursor = activeWeeks.has(thisWeek.getTime()) ? thisWeek : addDays(thisWeek, -7);
  while (activeWeeks.has(cursor.getTime())) {
    weekStreak++;
    cursor = addDays(cursor, -7);
  }

  prEvents.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    lifts,
    needsAttention: lifts.filter((l) => l.trend.status === 'regressing' || l.trend.status === 'stalling'),
    statusCounts,
    weeklyVolume,
    activity,
    activityStart,
    workoutsThisWeek,
    weekStreak,
    rangeVolume,
    rangeSessions,
    recentPrs: prEvents.slice(0, 5),
    rangePrCount: prEvents.filter((p) => p.date >= rangeStart).length,
  };
}
