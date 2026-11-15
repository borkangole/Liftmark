import type { BodyEntry } from '@/features/bodyweight/trend';
import { dateFromKey } from '@/features/bodyweight/trend';

/**
 * Maintenance measured from the user's own data instead of a formula.
 *
 * Energy balance: what you ate on average, minus what your weight change says you stored or burned
 * (about 7,700 kcal per kg), is what your body actually used. Formulas like Mifflin-St Jeor are
 * typically within ±10% for most people but can be off by more; two or more weeks of honest logging
 * plus weigh-ins narrows that down for this person.
 */

export interface MeasuredMaintenance {
  maintenance: number;
  avgIntake: number;
  kgPerWeek: number;
  spanDays: number;
  loggedDays: number;
}

export type MeasuredResult = { ok: true; value: MeasuredMaintenance } | { ok: false; reason: string; progress: number };

const DAY = 86_400_000;
const KCAL_PER_KG = 7700;
export const MEASURE_MIN_DAYS = 14;
const WINDOW_DAYS = 42;
const MIN_LOGGED_SHARE = 0.7;

const dayNum = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / DAY);

export function measureMaintenance(
  intake: { day: string; kcal: number }[],
  weighIns: BodyEntry[],
  now = new Date(),
): MeasuredResult {
  const today = dayNum(now);
  const loggedAll = intake.filter((d) => d.kcal > 0);
  if (loggedAll.length === 0) {
    return { ok: false, reason: 'Starts once you log your food and keep weighing in weekly.', progress: 0 };
  }
  // Only weigh-ins from when food logging started count: older ones have no intake to explain them.
  const firstLog = Math.min(...loggedAll.map((d) => dayNum(dateFromKey(d.day))));
  const recent = weighIns
    .filter((w) => today - dayNum(w.date) <= WINDOW_DAYS && dayNum(w.date) >= firstLog - 3)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (recent.length < 2) {
    return {
      ok: false,
      reason: 'Needs two weigh-ins at least two weeks apart, and your food logged on most days between them.',
      progress: Math.min(1, loggedAll.length / MEASURE_MIN_DAYS) * 0.5,
    };
  }
  const first = dayNum(recent[0].date);
  const last = dayNum(recent.at(-1)!.date);
  const span = last - first;
  // Food eaten between the first and the last weigh-in explains the change between them.
  const inSpan = loggedAll.filter((d) => {
    const n = dayNum(dateFromKey(d.day));
    return n >= first && n < last;
  });
  if (span < MEASURE_MIN_DAYS) {
    return {
      ok: false,
      reason: `Needs weigh-ins at least ${MEASURE_MIN_DAYS} days apart. ${MEASURE_MIN_DAYS - span} more days to go.`,
      progress: Math.min(0.95, span / MEASURE_MIN_DAYS),
    };
  }
  if (inSpan.length < span * MIN_LOGGED_SHARE) {
    return {
      ok: false,
      reason: `Needs food logged on most days between weigh-ins: ${inSpan.length} of ${span} so far.`,
      progress: Math.min(0.95, inSpan.length / (span * MIN_LOGGED_SHARE)),
    };
  }

  // Weight change as a least-squares slope, so one watery weigh-in can't swing it.
  const pts = recent.map((w) => ({ x: dayNum(w.date), y: w.weightKg }));
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0) || 1;
  const kgPerDay = num / den;

  const avgIntake = inSpan.reduce((s, d) => s + d.kcal, 0) / inSpan.length;
  const maintenance = Math.round((avgIntake - kgPerDay * KCAL_PER_KG) / 10) * 10;
  if (maintenance < 1000 || maintenance > 6000) {
    return {
      ok: false,
      reason:
        "Your logs and weigh-ins don't add up yet (often a few missed snacks or drinks). Keep logging everything.",
      progress: 0.95,
    };
  }
  return {
    ok: true,
    value: {
      maintenance,
      avgIntake: Math.round(avgIntake),
      kgPerWeek: kgPerDay * 7,
      spanDays: span,
      loggedDays: inSpan.length,
    },
  };
}
