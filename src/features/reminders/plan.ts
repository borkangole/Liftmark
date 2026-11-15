import type { Meal } from '@/features/nutrition/foods';
import { addDays, dayKey, startOfWeek } from '@/features/progress/dates';

/**
 * Which reminders to schedule for the next week, and with what words.
 *
 * Notifications can't check anything when they fire, so the plan is rebuilt whenever the app opens
 * or the data changes: today's reminders use today's real numbers (or are dropped once they no longer
 * apply), later days get a general version. Anyone who skips opening the app also skipped logging,
 * so the general version is still right for them.
 */

export type ReminderKind = 'workout' | 'streak' | 'plateau' | 'meals' | 'protein' | 'over' | 'weighIn';

export const REMINDER_KINDS: ReminderKind[] = ['workout', 'streak', 'plateau', 'meals', 'protein', 'over', 'weighIn'];

/** Minutes after midnight. */
export type ClockTime = number;

export interface ReminderSettings {
  enabled: Record<ReminderKind, boolean>;
  workoutTime: ClockTime;
  /** Weekdays as Date#getDay (0 = Sunday). null = worked out from the user's history. */
  workoutDays: number[] | null;
  eveningTime: ClockTime;
  weighInTime: ClockTime;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: { workout: true, streak: false, plateau: false, meals: false, protein: true, over: false, weighIn: true },
  workoutTime: 17 * 60,
  workoutDays: null,
  eveningTime: 20 * 60,
  weighInTime: 7 * 60 + 30,
};

export const LUNCH_TIME: ClockTime = 13 * 60 + 30;
export const DINNER_TIME: ClockTime = 19 * 60 + 30;
export const STREAK_TIME: ClockTime = 18 * 60;
export const PLATEAU_TIME: ClockTime = 9 * 60;
/** Never more than this many reminders on one day. */
export const DAILY_CAP = 3;
export const WINDOW_DAYS = 7;

export interface PlateauAlert {
  exerciseId: number;
  name: string;
  state: 'slowing' | 'stuck';
}

export interface ReminderInput {
  now: Date;
  settings: ReminderSettings;
  /** Start times of finished workouts, any order. Only the last few weeks matter. */
  workoutDates: Date[];
  daysPerWeek: number | null;
  /** The routine day that's up next, e.g. "Push Day". */
  nextDayName: string | null;
  /** Null when the user doesn't log food (nothing in the last two weeks). */
  food: {
    /** Null when nothing is logged today. */
    today: { proteinLeft: number; kcalOver: number; meals: Meal[] } | null;
    /** A food that would close today's protein gap. */
    proteinPick: string | null;
  } | null;
  /** Null when the user hasn't set a bodyweight goal. */
  weighIn: { day: number; loggedThisWeek: boolean } | null;
  /** A lift that started stalling and hasn't been mentioned yet. */
  plateau: PlateauAlert | null;
}

export interface PlannedReminder {
  id: string;
  kind: ReminderKind;
  at: Date;
  title: string;
  body: string;
  /** Screen to open on tap. */
  url: string;
}

const PRIORITY: Record<ReminderKind, number> = {
  workout: 0,
  streak: 1,
  plateau: 2,
  protein: 3,
  weighIn: 4,
  meals: 5,
  over: 6,
};

/** Weekdays for N sessions a week, spread out (Date#getDay values). */
const SPREAD: Record<number, number[]> = {
  1: [3],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

/** The weekdays someone actually trains on lately (twice or more in six weeks), else a spread of their plan. */
export function autoWorkoutDays(workoutDates: Date[], daysPerWeek: number | null, now: Date): number[] {
  const since = addDays(now, -42);
  const counts = new Array(7).fill(0);
  const seen = new Set<string>();
  for (const d of workoutDates) {
    if (d < since || d > now || seen.has(dayKey(d))) continue;
    seen.add(dayKey(d));
    counts[d.getDay()]++;
  }
  const habit = counts.flatMap((c, day) => (c >= 2 ? [day] : []));
  if (habit.length >= 2) return habit;
  return SPREAD[Math.min(7, Math.max(1, daysPerWeek ?? 3))];
}

/** Weeks in a row (Monday start) with at least one workout, counting back from last week. */
export function weekStreakBefore(workoutDates: Date[], now: Date): number {
  const weeks = new Set(workoutDates.map((d) => startOfWeek(d).getTime()));
  let cursor = addDays(startOfWeek(now), -7);
  let n = 0;
  while (weeks.has(cursor.getTime())) {
    n++;
    cursor = addDays(cursor, -7);
  }
  return n;
}

function at(day: Date, minutes: ClockTime): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
}

export function planReminders(input: ReminderInput): PlannedReminder[] {
  const { now, settings, workoutDates, food, weighIn, plateau } = input;
  const on = settings.enabled;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayKey = dayKey(today);
  const trainedToday = workoutDates.some((d) => dayKey(d) === todayKey);
  const weekStart = startOfWeek(now);
  const trainedThisWeek = workoutDates.some((d) => d >= weekStart && d <= now);
  const trainingDays = new Set(settings.workoutDays ?? autoWorkoutDays(workoutDates, input.daysPerWeek, now));
  const out: PlannedReminder[] = [];
  const add = (r: Omit<PlannedReminder, 'id'>) => {
    if (r.at > now) out.push({ ...r, id: `lm-${r.kind}-${dayKey(r.at)}-${r.at.getHours()}${r.at.getMinutes()}` });
  };

  let namedNext = false;
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const day = addDays(today, i);
    const isToday = i === 0;

    if (on.workout && trainingDays.has(day.getDay()) && !(isToday && trainedToday)) {
      const name = !namedNext && input.nextDayName ? input.nextDayName : null;
      namedNext = true;
      add({
        kind: 'workout',
        at: at(day, settings.workoutTime),
        title: name ? `${name} today 💪` : 'Training day 💪',
        body: name ? 'Your session is ready. Tap to start.' : 'Tap to see what’s up next.',
        url: '/',
      });
    }

    if (food) {
      const t = isToday ? food.today : null;
      if (on.meals) {
        for (const [meal, time, label] of [
          ['lunch', LUNCH_TIME, 'lunch'],
          ['dinner', DINNER_TIME, 'dinner'],
        ] as const) {
          if (t?.meals.includes(meal)) continue;
          add({
            kind: 'meals',
            at: at(day, time),
            title: `Log your ${label}?`,
            body: 'Takes a few seconds and keeps today’s numbers right.',
            url: '/food',
          });
        }
      }
      if (on.protein) {
        if (t) {
          if (t.proteinLeft > 15) {
            const g = Math.round(t.proteinLeft / 5) * 5;
            add({
              kind: 'protein',
              at: at(day, settings.eveningTime),
              title: `${g} g protein to go`,
              body: food.proteinPick ? `${food.proteinPick} would close most of it.` : 'Tap for ideas to close the gap.',
              url: '/food',
            });
          }
        } else {
          add({
            kind: 'protein',
            at: at(day, settings.eveningTime),
            title: 'How’s your protein today?',
            body: 'Log what you ate to see what’s left.',
            url: '/food',
          });
        }
      }
      if (on.over && t && t.kcalOver > 200) {
        add({
          kind: 'over',
          at: at(day, settings.eveningTime + 30),
          title: `${Math.round(t.kcalOver / 10) * 10} kcal over today`,
          body: 'One day won’t undo your progress. A lighter dinner evens it out.',
          url: '/food',
        });
      }
    }

    if (on.weighIn && weighIn && day.getDay() === weighIn.day && !(isToday && weighIn.loggedThisWeek)) {
      add({
        kind: 'weighIn',
        at: at(day, settings.weighInTime),
        title: 'Weigh-in morning ⚖️',
        body: 'Before breakfast, after the bathroom. Keeps your calorie target honest.',
        url: '/bodyweight/log',
      });
    }
  }

  // The week ends on Sunday: nudge if a streak is about to break.
  const streak = weekStreakBefore(workoutDates, now);
  if (on.streak && streak >= 2 && !trainedThisWeek) {
    add({
      kind: 'streak',
      at: at(addDays(weekStart, 6), STREAK_TIME),
      title: `Your ${streak}-week streak ends tonight`,
      body: 'One session keeps it alive. Even a short one counts.',
      url: '/',
    });
  }

  if (on.plateau && plateau) {
    const morning = at(today, PLATEAU_TIME) > now ? today : addDays(today, 1);
    add({
      kind: 'plateau',
      at: at(morning, PLATEAU_TIME),
      title: plateau.state === 'stuck' ? `${plateau.name} is stuck` : `${plateau.name} is slowing down`,
      body:
        plateau.state === 'stuck'
          ? 'See why before your next session, and the fix that fits.'
          : 'Catch it early: see what to change next session.',
      url: `/exercise/${plateau.exerciseId}`,
    });
  }

  // At most DAILY_CAP a day, the most useful first.
  const byDay = new Map<string, PlannedReminder[]>();
  for (const r of out) {
    const k = dayKey(r.at);
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }
  return [...byDay.values()]
    .flatMap((list) => list.sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]).slice(0, DAILY_CAP))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function formatClock(minutes: ClockTime): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
