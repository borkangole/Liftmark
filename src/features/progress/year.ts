import { addDays, dayKey } from './dates';

export interface DayWorkout {
  id: number;
  name: string | null;
  startedAt: Date;
}

export interface CalendarDay {
  day: number;
  key: string;
  workouts: DayWorkout[];
  future: boolean;
  today: boolean;
}

export interface CalendarMonth {
  month: number;
  label: string;
  /** Empty cells before the 1st, weeks starting Monday. */
  lead: number;
  days: CalendarDay[];
  future: boolean;
  /** Days trained this month. */
  trained: number;
  /** Finished workouts this month (a day can hold two). */
  workouts: number;
}

export interface YearSummary {
  year: number;
  months: CalendarMonth[];
  /** Days with at least one finished workout. */
  trainedDays: number;
  /** Days of the year so far (the whole year for past years). */
  countedDays: number;
  longestStreak: number;
  /** Consecutive training days up to today; an untrained today doesn't break it yet. */
  currentStreak: number;
  bestMonth: { label: string; days: number } | null;
  /** Years that can be shown, oldest first; always includes the current year. */
  years: number[];
}

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildYear(workouts: DayWorkout[], year: number, now: Date = new Date()): YearSummary {
  const byDay = new Map<string, DayWorkout[]>();
  const yearSet = new Set<number>([now.getFullYear()]);
  for (const w of workouts) {
    yearSet.add(w.startedAt.getFullYear());
    if (w.startedAt.getFullYear() !== year) continue;
    const key = dayKey(w.startedAt);
    const list = byDay.get(key);
    if (list) list.push(w);
    else byDay.set(key, [w]);
  }

  const todayKey = dayKey(now);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let trainedDays = 0;
  let countedDays = 0;
  let run = 0;
  let longestStreak = 0;
  let bestMonth: YearSummary['bestMonth'] = null;

  const months: CalendarMonth[] = MONTH_LABELS.map((label, month) => {
    const first = new Date(year, month, 1);
    const length = new Date(year, month + 1, 0).getDate();
    let monthDays = 0;
    let monthWorkouts = 0;
    const days: CalendarDay[] = [];
    for (let day = 1; day <= length; day++) {
      const date = new Date(year, month, day);
      const key = dayKey(date);
      const list = byDay.get(key) ?? [];
      const future = date > todayStart;
      if (!future) countedDays++;
      if (list.length > 0) {
        trainedDays++;
        monthDays++;
        monthWorkouts += list.length;
        run++;
        longestStreak = Math.max(longestStreak, run);
      } else if (!future) {
        run = 0;
      }
      days.push({ day, key, workouts: list, future, today: key === todayKey });
    }
    if (monthDays > 0 && (!bestMonth || monthDays > bestMonth.days)) bestMonth = { label, days: monthDays };
    return {
      month,
      label,
      lead: (first.getDay() + 6) % 7,
      days,
      future: first > todayStart,
      trained: monthDays,
      workouts: monthWorkouts,
    };
  });

  // Current streak only makes sense for the year that holds today.
  let currentStreak = 0;
  if (year === now.getFullYear()) {
    let cursor = byDay.has(todayKey) ? todayStart : addDays(todayStart, -1);
    while (cursor.getFullYear() === year && byDay.has(dayKey(cursor))) {
      currentStreak++;
      cursor = addDays(cursor, -1);
    }
  }

  return {
    year,
    months,
    trainedDays,
    countedDays,
    longestStreak,
    currentStreak,
    bestMonth,
    years: [...yearSet].sort((a, b) => a - b),
  };
}

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** The month as six Monday-first weeks; empty slots are null so every grid has the same shape. */
export function weeksOf(month: CalendarMonth): (CalendarDay | null)[][] {
  const slots: (CalendarDay | null)[] = [...Array<null>(month.lead).fill(null), ...month.days];
  while (slots.length < 42) slots.push(null);
  return Array.from({ length: 6 }, (_, w) => slots.slice(w * 7, w * 7 + 7));
}
