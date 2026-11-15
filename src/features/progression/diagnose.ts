import type { BodyEntry, BodyGoal } from '@/features/bodyweight/trend';
import { workingSets } from './oneRepMax';
import type { TrendResult } from './plateau';
import type { Session } from './types';

/**
 * Why a lift is stuck. Liftmark sees training, food and bodyweight together, so instead of only
 * saying "plateau" it can point at the likely cause and the fix that matches it:
 *
 * - Several lifts stalling at once points to recovery (fatigue, sleep, stress), not one lift's programme.
 * - Strength gains slow or stop in an energy deficit; that's expected on a cut.
 * - Daily protein below about 1.6 g/kg limits gains (Morton et al. 2018).
 * - Training a lift less often or with fewer sets lowers the stimulus.
 * - Short rest on multi-joint lifts costs reps on later sets (Schoenfeld et al. 2016; Singer et al. 2024).
 * - If none of those apply, the body has adapted to the current programme: change the stimulus.
 */

export type StallCauseId =
  'systemic' | 'cutting' | 'undereating' | 'protein' | 'frequency' | 'volume' | 'rest' | 'adapted' | 'no_food_log';

export interface StallCause {
  id: StallCauseId;
  /** A few words. */
  title: string;
  /** The evidence, one line, with the user's own numbers. */
  detail: string;
  /** What to do about it. */
  fix: string;
  /** How likely this is the cause, 0–1. Highest first. */
  weight: number;
}

export interface Diagnosis {
  causes: StallCause[];
  since: Date | null;
}

export interface DayIntake {
  day: string; // YYYY-MM-DD
  kcal: number;
  proteinG: number;
}

export interface StallContext {
  now?: Date;
  /** Every finished session of this lift, oldest first. */
  sessions: Session[];
  /** Rest between working sets of this lift during the stall, in seconds (one value per gap). */
  rests?: number[];
  recommendedRestSeconds?: number | null;
  /** Other tracked lifts and how many of them are stalling or going backwards right now. */
  liftCount: number;
  otherStuck: number;
  goal: BodyGoal | null;
  targets: { kcal: number; proteinG: number } | null;
  maintenance: number | null;
  food: DayIntake[];
  weighIns: BodyEntry[];
}

const DAY = 86_400_000;
const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Average days between sessions. */
function avgGap(sessions: Session[]): number | null {
  if (sessions.length < 2) return null;
  const t = sessions.map((s) => s.date.getTime());
  return (t[t.length - 1] - t[0]) / DAY / (t.length - 1);
}

const avgSets = (sessions: Session[]) =>
  sessions.length ? sessions.reduce((n, s) => n + workingSets(s.sets).length, 0) / sessions.length : null;

/** Bodyweight change in kg per week over a window (least squares), or null without two weigh-ins in it. */
function weeklyChange(weighIns: BodyEntry[], from: Date, to: Date): number | null {
  const pts = weighIns.filter((w) => w.date >= new Date(from.getTime() - 4 * DAY) && w.date <= to);
  if (pts.length < 2) return null;
  const xs = pts.map((p) => p.date.getTime() / DAY);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.weightKg, 0) / pts.length;
  let num = 0;
  let den = 0;
  pts.forEach((p, i) => {
    num += (xs[i] - mx) * (p.weightKg - my);
    den += (xs[i] - mx) ** 2;
  });
  return den === 0 ? null : (num / den) * 7;
}

export function diagnoseStall(trend: TrendResult, ctx: StallContext): Diagnosis {
  if (trend.status !== 'stalling' && trend.status !== 'regressing') return { causes: [], since: null };
  const now = ctx.now ?? new Date();
  const since = trend.bestDate ?? ctx.sessions.at(-4)?.date ?? now;
  const causes: StallCause[] = [];

  // --- Whole body: several lifts stuck at the same time -----------------------------------------
  const stuck = ctx.otherStuck + 1;
  if (stuck >= 3 && stuck / Math.max(1, ctx.liftCount) >= 0.4) {
    causes.push({
      id: 'systemic',
      title: 'Several lifts stuck at once',
      detail: `${stuck} of your ${ctx.liftCount} lifts have stalled or dropped.`,
      fix: 'That points to recovery, not this lift. Take a deload week: every lift at about 90%, then build back.',
      weight: 0.95,
    });
  }

  // --- Food and bodyweight during the stall --------------------------------------------------------
  const sinceKey = keyOf(since);
  const days = ctx.food.filter((d) => d.day >= sinceKey && d.kcal > 0);
  const logged = days.length >= 5;
  const avgKcal = logged ? days.reduce((s, d) => s + d.kcal, 0) / days.length : null;
  const avgProtein = logged ? days.reduce((s, d) => s + d.proteinG, 0) / days.length : null;
  const change = weeklyChange(ctx.weighIns, since, now);
  const cutting = ctx.goal === 'lose_weight' || ctx.goal === 'lose_fat';
  const losing = change !== null && change < -0.2;

  // A cut only explains the stall if the weight is actually coming down (or there are no weigh-ins to say otherwise).
  if ((cutting && (change === null || change < 0)) || (losing && change! < -0.3)) {
    causes.push({
      id: 'cutting',
      title: cutting ? "You're in a deficit" : "You're losing weight",
      detail:
        change !== null
          ? `Your weight is changing ${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(2)} kg a week since this stall began.`
          : 'Your goal is to lose weight.',
      fix: 'Expected on a cut. Aim to hold your weights and reps; PRs come back at maintenance.',
      weight: 0.85,
    });
  } else if (
    avgKcal !== null &&
    ctx.maintenance &&
    avgKcal < ctx.maintenance - 300 &&
    // Gaining weight while the log says you eat little means the log is missing food, not that you under-eat.
    (change === null || change <= 0.1)
  ) {
    causes.push({
      id: 'undereating',
      title: 'Eating under maintenance',
      detail: `You averaged ${fmt(avgKcal)} kcal a day, about ${fmt(ctx.maintenance - avgKcal)} under what you burn.`,
      fix: ctx.targets
        ? `Eat to your ${fmt(ctx.targets.kcal)} kcal target, at least on training days.`
        : 'Eat at maintenance, at least on training days.',
      weight: 0.8,
    });
  }

  if (avgProtein !== null && ctx.targets && avgProtein < ctx.targets.proteinG * 0.8) {
    causes.push({
      id: 'protein',
      title: 'Protein is low',
      detail: `You averaged ${fmt(avgProtein)} g a day; your target is ${fmt(ctx.targets.proteinG)} g.`,
      fix: 'Add a protein to every meal. Breakfast is the easiest one to fix.',
      weight: 0.7,
    });
  }

  // --- Training: how often, how many sets, how much rest ------------------------------------------
  const during = ctx.sessions.filter((s) => s.date >= since);
  const before = ctx.sessions.filter((s) => s.date < since).slice(-4);
  const gapNow = avgGap(during.length >= 2 ? during : ctx.sessions.slice(-3));
  const gapBefore = avgGap([...before, ...during.slice(0, 1)]);
  if (gapNow !== null && gapBefore !== null && gapNow >= 6 && gapNow > gapBefore * 1.6) {
    causes.push({
      id: 'frequency',
      title: 'Trained less often',
      detail: `Once every ${Math.round(gapNow)} days lately, down from every ${Math.round(gapBefore)}.`,
      fix: 'Train it at least once a week, ideally twice.',
      weight: 0.6,
    });
  }

  const setsNow = avgSets(during.slice(1));
  const setsBefore = avgSets(before);
  if (setsNow !== null && setsBefore !== null && during.length >= 3 && setsNow <= setsBefore - 0.9) {
    causes.push({
      id: 'volume',
      title: 'Fewer sets',
      detail: `${setsNow.toFixed(1).replace('.0', '')} working sets a session lately, down from ${setsBefore.toFixed(1).replace('.0', '')}.`,
      fix: `Go back to ${Math.round(setsBefore)} working sets.`,
      weight: 0.5,
    });
  }

  const rests = (ctx.rests ?? []).filter((r) => r >= 45 && r <= 900);
  if (ctx.recommendedRestSeconds && rests.length >= 6) {
    const avg = rests.reduce((a, b) => a + b, 0) / rests.length;
    if (avg < ctx.recommendedRestSeconds * 0.75) {
      causes.push({
        id: 'rest',
        title: 'Rest is short',
        detail: `You rest about ${mmss(avg)} between sets; this lift needs ${mmss(ctx.recommendedRestSeconds)}.`,
        fix: `Rest the full ${mmss(ctx.recommendedRestSeconds)}: more reps on your later sets.`,
        weight: 0.55,
      });
    }
  }

  // --- Nothing else explains it: the programme has stopped working ----------------------------------
  if (causes.length === 0) {
    causes.push({
      id: 'adapted',
      title: 'Your body has adapted',
      detail: logged
        ? 'Recovery, food and training all look fine.'
        : 'Training looks consistent and recovery looks fine.',
      fix: 'Change the stimulus: a lighter week, then build back, or switch to a new rep range.',
      weight: 0.4,
    });
  }
  if (!logged && !causes.some((c) => c.id === 'cutting')) {
    causes.push({
      id: 'no_food_log',
      title: days.length ? 'Not enough food logged' : 'Food not logged',
      detail: days.length
        ? `Only ${days.length} day${days.length === 1 ? '' : 's'} logged since this started, so eating can’t be checked yet.`
        : 'Liftmark can’t check if eating is the cause.',
      fix: days.length ? 'Log a few more days.' : 'Log your food for a week to find out.',
      weight: 0.1,
    });
  }

  causes.sort((a, b) => b.weight - a.weight);
  return { causes: causes.slice(0, 3), since };
}

/** Seconds between consecutive working sets of the same lift in each workout. */
export function restGaps(
  sets: { workoutId: number; loggedAt: Date; isWarmup: boolean }[],
  from?: Date | null,
): number[] {
  const byWorkout = new Map<number, number[]>();
  for (const s of sets) {
    if (s.isWarmup || (from && s.loggedAt < from)) continue;
    const list = byWorkout.get(s.workoutId) ?? [];
    list.push(s.loggedAt.getTime());
    byWorkout.set(s.workoutId, list);
  }
  const gaps: number[] = [];
  for (const times of byWorkout.values()) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 1000);
  }
  return gaps;
}
