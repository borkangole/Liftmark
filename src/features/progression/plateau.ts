import type { Level } from '@/features/profile/types';
import { summarizeSession } from './oneRepMax';
import type { Session, TrendStatus } from './types';

/**
 * How long to wait before calling a plateau, by training age. Beginners add weight almost every session;
 * intermediates week to week; advanced lifters over weeks to months (the classic novice / intermediate /
 * advanced progression model). So the same three flat sessions mean very different things.
 * `minDays` stops a lift trained three times a week being flagged after one week.
 */
export const STALL_RULES: Record<Level, { stallAfter: number; minDays: number; progressThreshold: number }> = {
  beginner: { stallAfter: 3, minDays: 10, progressThreshold: 0.005 },
  intermediate: { stallAfter: 4, minDays: 14, progressThreshold: 0.0025 },
  advanced: { stallAfter: 5, minDays: 21, progressThreshold: 0.001 },
};

/**
 * Normal session-to-session wobble in estimated 1RM (sleep, food, warm-up, rep-counting): about 2–3%.
 * One session under it is a bad day, not a regression.
 */
export const DAILY_NOISE = 0.025;
const DAY = 86_400_000;

export interface TrendOptions {
  /** How many recent sessions to look at. */
  window?: number;
  /** Sessions without a new best e1RM before we call it a plateau. */
  stallAfter?: number;
  /** Average change per session (as a fraction) that counts as real progress. */
  progressThreshold?: number;
  /** Average change per session (as a fraction) that counts as going backwards. */
  regressThreshold?: number;
  /** What's being measured, for the reason text: "estimated 1RM" (default) or "hold time". */
  metric?: string;
  /** Training age: sets how long a lift can go without a best before it counts as a plateau. */
  level?: Level;
  now?: Date;
}

export interface TrendResult {
  status: TrendStatus;
  /** Average % change in best e1RM per session over the window (e.g. 0.012 = +1.2%). */
  slopePerSession: number;
  sessionsSincePr: number;
  /** Days since the best session (0 with no data). */
  daysSincePr: number;
  /** When the current best was set: the start of a plateau. */
  bestDate: Date | null;
  /** Still counted as progressing, but one more flat session makes it a plateau: the early warning. */
  slowing: boolean;
  allTimeBestE1rm: number;
  reason: string;
}

/** Least-squares slope of y over x = 0..n-1. */
function slope(values: number[]): number {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

/**
 * Classifies an exercise as progressing, stalling or regressing from its recent sessions.
 * Rule-based on purpose: every verdict comes with a plain-language reason.
 */
export function analyzeTrend(history: Session[], options: TrendOptions = {}): TrendResult {
  const rules = options.level ? STALL_RULES[options.level] : null;
  const {
    window = 4,
    stallAfter = rules?.stallAfter ?? 3,
    progressThreshold = rules?.progressThreshold ?? 0.005,
    regressThreshold = -0.01,
    metric = 'estimated 1RM',
    now = new Date(),
  } = options;
  const minDays = rules?.minDays ?? 0;
  const Metric = metric.charAt(0).toUpperCase() + metric.slice(1);

  const summaries = [...history]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(summarizeSession)
    .filter((s) => s.bestE1rm > 0);

  if (summaries.length < 3) {
    return {
      status: 'insufficient_data',
      slopePerSession: 0,
      sessionsSincePr: 0,
      daysSincePr: 0,
      bestDate: null,
      slowing: false,
      allTimeBestE1rm: Math.max(0, ...summaries.map((s) => s.bestE1rm)),
      reason: `Log ${3 - summaries.length} more session${summaries.length === 2 ? '' : 's'} to see your trend.`,
    };
  }

  const e1rms = summaries.map((s) => s.bestE1rm);
  const allTimeBest = Math.max(...e1rms);
  // The session that first reached the best. Matching it later isn't a new PR, so it doesn't reset the plateau.
  const prIndex = e1rms.indexOf(allTimeBest);
  const sessionsSincePr = e1rms.length - 1 - prIndex;
  const bestDate = summaries[prIndex].date;
  const daysSincePr = Math.max(0, Math.floor((now.getTime() - bestDate.getTime()) / DAY));
  const base = { sessionsSincePr, daysSincePr, bestDate, allTimeBestE1rm: allTimeBest, slowing: false };
  const weeks = Math.round(daysSincePr / 7);
  const span = daysSincePr >= 14 ? ` (${weeks} weeks)` : daysSincePr >= 7 ? ' (a week)' : '';

  const recent = e1rms.slice(-window);
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const slopePerSession = mean === 0 ? 0 : slope(recent) / mean;
  const pct = (slopePerSession * 100).toFixed(1);

  // Going backwards only counts when the last two sessions are both clearly under the best: one bad day isn't a trend.
  const lastTwoDown = e1rms.slice(-2).every((v) => v < allTimeBest * (1 - DAILY_NOISE));
  if (slopePerSession <= regressThreshold && lastTwoDown) {
    return {
      status: 'regressing',
      slopePerSession,
      ...base,
      reason: `${Metric} is dropping about ${Math.abs(Number(pct))}% per session over your last ${recent.length} sessions.`,
    };
  }

  if (sessionsSincePr >= stallAfter && daysSincePr >= minDays && slopePerSession < progressThreshold) {
    return {
      status: 'stalling',
      slopePerSession,
      ...base,
      reason: `No new best in ${sessionsSincePr} sessions${span}.`,
    };
  }

  // Early warning: no best for a while, and one more flat session would make it a plateau.
  const slowing = sessionsSincePr >= Math.max(2, stallAfter - 1) && slopePerSession < progressThreshold * 2;
  if (slowing) {
    return {
      status: 'progressing',
      slopePerSession,
      ...base,
      slowing: true,
      reason: `No new best in ${sessionsSincePr} sessions. Make the next one count: one more rep at the same weight is a new best.`,
    };
  }

  return {
    status: 'progressing',
    slopePerSession,
    ...base,
    reason: sessionsSincePr === 0 ? `New best ${metric} last session.` : `Trending up about ${pct}% per session.`,
  };
}
