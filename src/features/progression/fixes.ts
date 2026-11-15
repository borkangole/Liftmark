import type { StallCauseId } from './diagnose';
import type { LoadType } from './measure';
import { workingSets } from './oneRepMax';
import type { TrendResult } from './plateau';
import { roundToIncrement, suggestNextSession, type SuggestOptions, type Suggestion } from './suggest';
import type { RepRange, Session } from './types';

/**
 * Ways to break a plateau. Each stuck lift gets the ones that match its likely cause, best first,
 * and the user picks one. Liftmark then shapes the next sessions around it and remembers whether it worked.
 */
export type PlateauFix = 'deload' | 'rep_range' | 'hold' | 'add_set' | 'rest' | 'frequency';

export const FIX_INFO: Record<PlateauFix, { title: string; short: string }> = {
  deload: { title: 'Lighter session, then build back', short: 'Deload' },
  rep_range: { title: 'Switch rep range', short: 'New rep range' },
  hold: { title: 'Hold your weights', short: 'Hold' },
  add_set: { title: 'Add a set', short: 'Extra set' },
  rest: { title: 'Rest the full time', short: 'Longer rest' },
  frequency: { title: 'Train it more often', short: 'More often' },
};

/** Fixes that match each cause, the most fitting first. */
const BY_CAUSE: Record<StallCauseId, PlateauFix[]> = {
  systemic: ['deload', 'hold'],
  cutting: ['hold', 'deload'],
  undereating: ['hold', 'deload'],
  protein: ['hold', 'deload'],
  frequency: ['frequency', 'deload'],
  volume: ['add_set', 'deload'],
  rest: ['rest', 'deload'],
  adapted: ['rep_range', 'deload', 'add_set'],
  no_food_log: ['rep_range', 'deload'],
};

/** A finished plateau: what was tried and how long it took to set a new best. */
export interface PlateauEpisode {
  exerciseId: number;
  name: string;
  fix: PlateauFix;
  cause: StallCauseId | null;
  startedAt: string; // ISO
  brokenAt: string; // ISO
  sessions: number;
  days: number;
}

export interface FixOption {
  fix: PlateauFix;
  /** Shown under the option: why it fits, or that it worked before. */
  note: string | null;
  recommended: boolean;
}

/**
 * The fixes to offer for a lift, ranked. A fix that already broke a plateau for this user (on this lift,
 * or any lift) moves to the top and says so.
 */
export function fixOptions(cause: StallCauseId | null, episodes: PlateauEpisode[], exerciseId: number): FixOption[] {
  const base = cause ? BY_CAUSE[cause] : BY_CAUSE.adapted;
  // How well each fix has worked for this user: fewer sessions to a new best is better. This lift counts double.
  const record = new Map<PlateauFix, { score: number; example: PlateauEpisode }>();
  for (const e of episodes) {
    if (!base.includes(e.fix)) continue;
    const w = (e.exerciseId === exerciseId ? 2 : 1) / Math.max(1, e.sessions);
    const r = record.get(e.fix);
    if (!r) record.set(e.fix, { score: w, example: e });
    else {
      r.score += w;
      if (e.exerciseId === exerciseId || e.sessions < r.example.sessions) r.example = e;
    }
  }
  const ranked = [...base].sort(
    (a, b) => (record.get(b)?.score ?? 0) - (record.get(a)?.score ?? 0) || base.indexOf(a) - base.indexOf(b),
  );
  return ranked.map((fix, i) => {
    const r = record.get(fix);
    return {
      fix,
      recommended: i === 0,
      note: r
        ? `Broke your ${r.example.name} plateau in ${r.example.sessions} session${r.example.sessions === 1 ? '' : 's'}`
        : null,
    };
  });
}

/** The fix the user chose for a lift, and where the lift stood when they started it. */
export interface ActivePlan {
  exerciseId: number;
  fix: PlateauFix;
  cause: StallCauseId | null;
  startedAt: string; // ISO
  /** Best estimated 1RM when the fix started: beating it means the plateau is broken. */
  bestAtStart: number;
  sessionsAtStart: number;
  /** For a rep-range switch: the range to train in until the plateau breaks. */
  repRange?: RepRange;
  /** For an extra set: the number of working sets to do. */
  sets?: number;
  /** For rest: the rest to take, in seconds. */
  restSeconds?: number;
}

/** A new rep range to switch to: heavier if you train in higher reps, lighter if you train heavy. */
export function switchRange(current: RepRange): RepRange {
  return current.min >= 6 ? { min: 4, max: 6 } : { min: 8, max: 12 };
}

/** Builds the plan when the user picks a fix. */
export function startPlan(
  fix: PlateauFix,
  opts: {
    exerciseId: number;
    cause: StallCauseId | null;
    bestE1rm: number;
    sessionCount: number;
    repRange: RepRange;
    lastSession?: Session;
    restSeconds?: number | null;
    now?: Date;
  },
): ActivePlan {
  const plan: ActivePlan = {
    exerciseId: opts.exerciseId,
    fix,
    cause: opts.cause,
    startedAt: (opts.now ?? new Date()).toISOString(),
    bestAtStart: opts.bestE1rm,
    sessionsAtStart: opts.sessionCount,
  };
  if (fix === 'rep_range') plan.repRange = switchRange(opts.repRange);
  if (fix === 'add_set') {
    const sets = opts.lastSession ? workingSets(opts.lastSession.sets).length : 3;
    plan.sets = Math.min(6, Math.max(3, sets) + 1);
  }
  if (fix === 'rest' && opts.restSeconds) plan.restSeconds = opts.restSeconds;
  return plan;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/**
 * Shapes the next-session target around the active fix. `normal` is what plain double progression would
 * suggest (with the plan's rep range already applied for a range switch); `sessionsSince` is how many
 * sessions have been logged since the fix started.
 */
export function applyFix(
  normal: Suggestion | null,
  plan: ActivePlan,
  ctx: {
    lastSession?: Session;
    sessionsSince: number;
    increment: number;
    type: LoadType;
    formatWeight?: (kg: number) => string;
    /** The lift's rep range: a deload session aims for the top of it. */
    repRange?: RepRange;
  },
): Suggestion | null {
  if (!normal || !ctx.lastSession || ctx.type === 'timed') return normal;
  const fw = ctx.formatWeight ?? ((kg: number) => `${kg} kg`);
  const sets = workingSets(ctx.lastSession.sets);
  const top = Math.max(0, ...sets.map((s) => s.weight));
  const topSets = sets.filter((s) => s.weight === top);
  const repsAtTop = topSets.length ? Math.min(...topSets.map((s) => s.reps)) : normal.targetReps;
  const first = ctx.sessionsSince === 0;

  switch (plan.fix) {
    case 'deload':
      // One lighter session, then normal progression builds back from it.
      if (first && top > 0) {
        const weight = roundToIncrement(top * 0.9, ctx.increment);
        return {
          ...normal,
          kind: 'deload',
          weight,
          targetReps: ctx.repRange?.max ?? normal.targetReps,
          reason: `Your fix: one lighter session at ${fw(weight)}, then build back up.`,
        };
      }
      return { ...normal, reason: `Building back after the deload. ${normal.reason}` };
    case 'hold':
      // Don't chase PRs while food or recovery is the problem: repeat the weight, keep the reps.
      if (normal.kind === 'add_weight') return normal;
      return {
        ...normal,
        kind: 'repeat',
        weight: top,
        targetReps: repsAtTop,
        reason: `Your fix: hold ${fw(top)} × ${repsAtTop} while you sort food and recovery. Beat it only if it feels easy.`,
      };
    case 'rep_range': {
      if (!plan.repRange) return normal;
      if (first && top > 0) {
        // Same strength, new range: pick the weight that matches your current best at the top of the new range.
        const e1rm = Math.max(...sets.map((s) => s.weight * (1 + s.reps / 30)));
        const weight = roundToIncrement(e1rm / (1 + plan.repRange.max / 30), ctx.increment);
        return {
          ...normal,
          kind: 'repeat',
          weight,
          targetReps: plan.repRange.max,
          reason: `Your fix: train ${plan.repRange.min}–${plan.repRange.max} reps for a few weeks. Start at ${fw(weight)}.`,
        };
      }
      return { ...normal, reason: `New range ${plan.repRange.min}–${plan.repRange.max}. ${normal.reason}` };
    }
    case 'add_set':
      return {
        ...normal,
        sets: plan.sets ?? normal.sets + 1,
        reason: `Your fix: ${plan.sets ?? normal.sets + 1} working sets. ${normal.reason}`,
      };
    case 'rest':
      return {
        ...normal,
        reason: `Your fix: rest ${plan.restSeconds ? mmss(plan.restSeconds) : 'the full time'} between sets. ${normal.reason}`,
      };
    case 'frequency':
      return { ...normal, reason: `Your fix: train this at least twice a week. ${normal.reason}` };
  }
}

/** True once the lift beats its best from when the fix started. */
export const planBroken = (plan: ActivePlan, bestE1rm: number) => bestE1rm > plan.bestAtStart + 1e-6;

/**
 * The next-session target with the user's chosen fix applied. While a fix is active it replaces the
 * automatic deload, and a rep-range switch changes the range progression works in.
 */
export function suggestWithPlan(
  sessions: Session[],
  trend: TrendResult,
  opts: SuggestOptions,
  plan: ActivePlan | null | undefined,
): Suggestion | null {
  const repRange = plan?.fix === 'rep_range' && plan.repRange ? plan.repRange : opts.repRange;
  const steady: TrendResult =
    plan && trend.status !== 'insufficient_data' ? { ...trend, status: 'progressing' } : trend;
  const normal = suggestNextSession(sessions.at(-1), steady, { ...opts, repRange });
  if (!plan) return normal;
  const since = sessions.filter((s) => s.date.getTime() > Date.parse(plan.startedAt)).length;
  return applyFix(normal, plan, {
    lastSession: sessions.at(-1),
    sessionsSince: since,
    increment: opts.increment,
    type: opts.type ?? 'weighted',
    formatWeight: opts.formatWeight,
    repRange,
  });
}
