import type { Lifestyle } from '@/features/bodyweight/nutrition';
import { dayKeyOf, weekStart } from '@/features/bodyweight/trend';

/** What Liftmark reads from Apple Health / Health Connect, already reduced to what it uses. */
export interface DaySteps {
  /** Local YYYY-MM-DD. */
  day: string;
  steps: number;
}

export interface SleepNight {
  /** The morning the night ended (local YYYY-MM-DD). */
  day: string;
  hours: number;
}

export interface WeightSample {
  date: Date;
  kg: number;
}

/** Days with fewer steps than this are treated as "watch not worn" and ignored for averages. */
const WORN_MIN_STEPS = 500;
/** Need this many real days in the last week before steps replace the lifestyle answer. */
export const STEPS_MIN_DAYS = 4;

/** Average daily steps over the last 7 days, or null when there isn't enough to go on. */
export function averageSteps(days: DaySteps[], today: string): number | null {
  const recent = days.filter((d) => d.day < today && d.steps >= WORN_MIN_STEPS).slice(-7);
  if (recent.length < STEPS_MIN_DAYS) return null;
  return Math.round(recent.reduce((s, d) => s + d.steps, 0) / recent.length);
}

/**
 * Steps → the lifestyle used in the calorie formula. Bands follow the usual step-count categories:
 * under ~5,000 is sedentary, 7,500–10,000 somewhat to fairly active, over ~10,000 active.
 */
export function lifestyleFromSteps(avg: number): Lifestyle {
  if (avg < 6000) return 'sitting';
  if (avg < 10000) return 'on_feet';
  return 'physical';
}

export interface SleepSummary {
  /** Average over the last up-to-3 nights. */
  avgHours: number;
  nights: number;
  /** Under 6.5 h on average: recovery runs slower. */
  short: boolean;
}

export const SHORT_SLEEP_HOURS = 6.5;

export function recentSleep(nights: SleepNight[], today: string): SleepSummary | null {
  // Last night ends today; nap-only records (under 3 h) don't count as a night.
  const recent = nights.filter((n) => n.day <= today && n.hours >= 3).slice(-3);
  if (recent.length === 0) return null;
  const avgHours = recent.reduce((s, n) => s + n.hours, 0) / recent.length;
  return { avgHours, nights: recent.length, short: avgHours < SHORT_SLEEP_HOURS };
}

/**
 * Recovery takes longer on short sleep. 72 h normally; up to ~25 % longer after several short
 * nights (sleep loss reduces muscle protein synthesis and slows strength recovery).
 */
export function recoveryHoursFor(sleep: SleepSummary | null): number {
  if (!sleep || !sleep.short) return 72;
  const missing = Math.min(2.5, SHORT_SLEEP_HOURS - sleep.avgHours);
  return Math.round(72 * (1 + 0.1 * missing));
}

/**
 * Smart-scale readings → weekly weigh-ins, one per weigh-in week, for weeks that don't have one yet.
 * A morning reading (before 11:00) wins over later ones; among mornings, the earliest day in the week.
 */
export function weighInsToImport(
  samples: WeightSample[],
  existingDays: string[],
  weighInDay: number,
): { date: Date; kg: number }[] {
  const taken = new Set(existingDays.map((d) => {
    const [y, m, dd] = d.split('-').map(Number);
    return dayKeyOf(weekStart(new Date(y, m - 1, dd), weighInDay));
  }));
  const best = new Map<string, WeightSample>();
  for (const s of samples) {
    if (s.kg < 25 || s.kg > 350) continue;
    const week = dayKeyOf(weekStart(s.date, weighInDay));
    if (taken.has(week)) continue;
    const cur = best.get(week);
    const morning = (d: Date) => d.getHours() < 11;
    if (
      !cur ||
      (morning(s.date) && !morning(cur.date)) ||
      (morning(s.date) === morning(cur.date) && s.date < cur.date)
    ) {
      best.set(week, s);
    }
  }
  return [...best.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((s) => ({ date: s.date, kg: Math.round(s.kg * 10) / 10 }));
}

/** Sleep sessions → hours per night, keyed by the morning they ended. Overlapping sources are merged. */
export function nightsFrom(sessions: { start: Date; end: Date }[]): SleepNight[] {
  const sorted = [...sessions].filter((s) => s.end > s.start).sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: { start: Date; end: Date }[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.start <= last.end) {
      if (s.end > last.end) last.end = s.end;
    } else merged.push({ start: new Date(s.start), end: new Date(s.end) });
  }
  const byDay = new Map<string, number>();
  for (const s of merged) {
    // Sleep that ends before 6 PM belongs to that morning; an evening nap belongs to the next.
    const owner = new Date(s.end);
    if (owner.getHours() >= 18) owner.setDate(owner.getDate() + 1);
    const day = dayKeyOf(owner);
    byDay.set(day, (byDay.get(day) ?? 0) + (s.end.getTime() - s.start.getTime()) / 3_600_000);
  }
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, hours]) => ({ day, hours }));
}
