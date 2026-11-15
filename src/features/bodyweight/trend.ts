import type { Level } from '@/features/profile/types';

/** What the user wants their bodyweight to do. Asked the first time they open the tracker. */
export type BodyGoal = 'lose_weight' | 'lose_fat' | 'recomp' | 'gain_muscle';

export const BODY_GOAL_LABEL: Record<BodyGoal, string> = {
  lose_weight: 'Lose weight',
  lose_fat: 'Lose fat',
  recomp: 'Body recomposition',
  gain_muscle: 'Gain muscle',
};

export const BODY_GOAL_SHORT: Record<BodyGoal, string> = {
  lose_weight: 'Losing weight',
  lose_fat: 'Cutting',
  recomp: 'Recomp',
  gain_muscle: 'Lean bulk',
};

export interface BodyEntry {
  date: Date;
  weightKg: number;
}

/**
 * Healthy weekly change for each goal, as a % of bodyweight (negative = losing).
 * Rough guidelines from evidence-based coaching:
 * - lose weight: 0.5–1%/week
 * - lose fat: slower (0.25–0.75%/week) to hold on to muscle
 * - recomp: roughly maintain (±0.25%/week) while getting stronger
 * - gain muscle: lean bulk, slower the more experienced you are
 */
export function targetRange(goal: BodyGoal, level: Level = 'beginner'): [number, number] {
  switch (goal) {
    case 'lose_weight':
      return [-1.0, -0.5];
    case 'lose_fat':
      return [-0.75, -0.25];
    case 'recomp':
      return [-0.25, 0.25];
    case 'gain_muscle':
      return level === 'advanced' ? [0.1, 0.25] : level === 'intermediate' ? [0.15, 0.35] : [0.25, 0.5];
  }
}

const DAY = 86_400_000;
const dayIndex = (d: Date) => Math.floor(d.getTime() / DAY);

/**
 * Smoothed weight (exponentially weighted moving average). Weigh-ins swing with water and food;
 * the trend shows what's really happening. Smoothing is applied once per elapsed day, so with one
 * weigh-in a week each new reading moves the trend about 40% of the way: a single bloated morning
 * can't swing it on its own.
 */
export function smoothTrend(entries: BodyEntry[], alphaPerDay = 0.07): { date: Date; trendKg: number; weightKg: number }[] {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  let trend: number | null = null;
  let last: Date | null = null;
  return sorted.map((e) => {
    if (trend === null || last === null) trend = e.weightKg;
    else {
      const days = Math.max(1, dayIndex(e.date) - dayIndex(last));
      const k = 1 - (1 - alphaPerDay) ** days;
      trend += k * (e.weightKg - trend);
    }
    last = e.date;
    return { date: e.date, trendKg: trend, weightKg: e.weightKg };
  });
}

/** Least-squares slope in kg per day. */
function slope(points: { x: number; y: number }[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export type BodyStatus = 'start' | 'on_track' | 'too_fast' | 'too_slow' | 'wrong_way';

export interface LiftSignal {
  progressing: number;
  stalling: number;
  regressing: number;
}

export interface BodyAnalysis {
  status: BodyStatus;
  /** Latest smoothed weight. Null with no entries. */
  trendKg: number | null;
  latestKg: number | null;
  /** Change per week, from the last few weeks of the trend. Null until there's enough data. */
  weeklyKg: number | null;
  weeklyPct: number | null;
  range: [number, number];
  /** One line: what's happening. */
  headline: string;
  /** One line: what to do about it. */
  tip: string;
  /** Rough daily calorie change that would bring the rate to the middle of the range. */
  calorieAdjust: number | null;
  /** Weeks until the target weight at the current pace, if heading toward it. */
  weeksToTarget: number | null;
}

export interface AnalyzeOptions {
  goal: BodyGoal;
  level?: Level;
  now?: Date;
  targetKg?: number | null;
  lifts?: LiftSignal;
  /** Formats kg in the user's unit, e.g. "0.4 kg". */
  format?: (kg: number) => string;
  /** How far back the rate looks. */
  windowDays?: number;
}

/** Weekly weigh-ins needed before judging the trend: three, spanning at least two weeks. */
export const MIN_SPAN_DAYS = 14;
export const MIN_ENTRIES = 3;
const KCAL_PER_KG = 7700;

const round50 = (n: number) => Math.round(n / 50) * 50;

/** Reads the bodyweight trend against the user's goal and says what to do next. */
export function analyzeBodyweight(entries: BodyEntry[], opts: AnalyzeOptions): BodyAnalysis {
  const { goal, level = 'beginner', now = new Date(), targetKg = null, lifts, windowDays = 49 } = opts;
  const fmt = opts.format ?? ((kg: number) => `${Math.abs(kg).toFixed(1)} kg`);
  const range = targetRange(goal, level);
  const trend = smoothTrend(entries);
  const latest = trend.at(-1);

  const base = {
    trendKg: latest?.trendKg ?? null,
    latestKg: latest?.weightKg ?? null,
    range,
    calorieAdjust: null,
    weeksToTarget: null,
  };

  const recent = trend.filter((t) => dayIndex(now) - dayIndex(t.date) <= windowDays);
  const span = recent.length ? dayIndex(recent.at(-1)!.date) - dayIndex(recent[0].date) : 0;
  if (!latest || recent.length < MIN_ENTRIES || span < MIN_SPAN_DAYS) {
    const left = Math.max(0, MIN_ENTRIES - recent.length);
    return {
      ...base,
      status: 'start',
      weeklyKg: null,
      weeklyPct: null,
      headline: latest ? 'Building your trend' : 'Log your first weigh-in',
      tip:
        left > 0
          ? `${left} more weekly weigh-in${left === 1 ? '' : 's'} and Liftmark can read your trend. Weigh in on waking, before eating.`
          : 'One more week of weigh-ins and Liftmark can read your trend.',
    };
  }

  // Rate: a straight-line fit through the weigh-ins over the last ~7 weeks. That averages out the odd
  // bloated morning, and unlike the smoothed line it doesn't lag behind a real change.
  const weeklyKg = slope(recent.map((t) => ({ x: dayIndex(t.date), y: t.weightKg }))) * 7;
  const weeklyPct = (weeklyKg / latest.trendKg) * 100;
  const [lo, hi] = range;
  const losing = goal === 'lose_weight' || goal === 'lose_fat';
  const gaining = goal === 'gain_muscle';

  let status: BodyStatus;
  if (losing && weeklyPct > 0.1) status = 'wrong_way';
  else if (gaining && weeklyPct < -0.1) status = 'wrong_way';
  else if (weeklyPct < lo) status = losing ? 'too_fast' : gaining ? 'too_slow' : 'too_fast';
  else if (weeklyPct > hi) status = losing ? 'too_slow' : gaining ? 'too_fast' : 'too_slow';
  else status = 'on_track';

  const rate = `${fmt(weeklyKg)}/week`;
  const pct = `${Math.abs(weeklyPct).toFixed(2)}%`;
  const steady = Math.abs(weeklyPct) < 0.1;
  const direction = steady ? 'Holding steady' : weeklyKg < 0 ? `Losing ${rate}` : `Gaining ${rate}`;

  // Calories: move the rate to the middle of the goal's range (≈7,700 kcal per kg of tissue).
  const midKg = (((lo + hi) / 2) * latest.trendKg) / 100;
  const rawAdjust = ((midKg - weeklyKg) * KCAL_PER_KG) / 7;
  const calorieAdjust = status === 'on_track' ? null : Math.max(-700, Math.min(700, round50(rawAdjust)));
  const kcal = calorieAdjust === null ? '' : `${Math.abs(calorieAdjust)} kcal a day`;

  let headline = direction;
  let tip: string;
  const strong = lifts && lifts.progressing > 0 && lifts.progressing >= lifts.regressing + lifts.stalling;
  const slipping = lifts && lifts.regressing > 0;

  switch (goal) {
    case 'lose_weight':
    case 'lose_fat':
      if (status === 'on_track') {
        headline = `${direction} (${pct}), right on pace`;
        tip = slipping
          ? `Some lifts are slipping. Keep protein high and don't cut any faster.`
          : goal === 'lose_fat'
            ? `A steady cut like this keeps your muscle. Keep training hard.`
            : `This pace is sustainable. Keep doing what you're doing.`;
      } else if (status === 'too_fast') {
        headline = `${direction} (${pct}), faster than ideal`;
        tip = `Losing this fast tends to cost muscle. Eat about ${kcal} more.`;
      } else if (status === 'too_slow') {
        headline = steady ? `Holding steady, but your goal is to lose` : `${direction}, slower than your goal`;
        tip = `Eat about ${kcal} less, or add a daily walk.`;
      } else {
        headline = `${direction}, but your goal is to lose`;
        tip = `Eat about ${kcal} less. Keep weighing in on the same morning each week to rule out noise.`;
      }
      break;
    case 'recomp':
      if (status === 'on_track') {
        headline = `Holding steady (${direction.toLowerCase()})`;
        tip = strong
          ? `Weight steady while your lifts climb: that's recomposition working.`
          : `Keep your weight here and focus on adding reps and weight to your lifts.`;
      } else if (status === 'too_fast') {
        headline = `${direction}, drifting down`;
        tip = `For a recomp, eat about ${kcal} more so you can keep building muscle.`;
      } else {
        headline = `${direction}, drifting up`;
        tip = `For a recomp, eat about ${kcal} less to stay near maintenance.`;
      }
      break;
    case 'gain_muscle':
      if (status === 'on_track') {
        headline = `${direction} (${pct}), a lean bulk`;
        tip = strong ? `Weight and lifts are both climbing. Perfect.` : `Good pace. Make sure your lifts are moving up too.`;
      } else if (status === 'too_fast') {
        headline = `${direction} (${pct}), faster than ideal`;
        tip = `Gaining this fast adds more fat than muscle. Eat about ${kcal} less.`;
      } else if (status === 'too_slow') {
        headline = steady ? `Holding steady, but your goal is to gain` : `${direction}, slower than your goal`;
        tip = lifts && lifts.stalling + lifts.regressing > 0
          ? `Lifts are stalling too: eat about ${kcal} more.`
          : `Eat about ${kcal} more to fuel muscle growth.`;
      } else {
        headline = `${direction}, but your goal is to gain`;
        tip = `Eat about ${kcal} more, mostly from carbs and protein.`;
      }
      break;
  }

  // "Weeks to target" only when the target agrees with the goal (a cut aims down, a bulk aims up)
  // and the trend is actually heading there; otherwise the estimate would contradict the advice.
  let weeksToTarget: number | null = null;
  if (targetKg !== null && targetKg > 0) {
    const toGo = targetKg - latest.trendKg;
    const agreesWithGoal = losing ? toGo < 0 : gaining ? toGo > 0 : true;
    if (Math.abs(toGo) < 0.3) weeksToTarget = 0;
    else if (agreesWithGoal && status !== 'wrong_way' && Math.sign(toGo) === Math.sign(weeklyKg) && Math.abs(weeklyKg) > 0.01) {
      weeksToTarget = Math.ceil(toGo / weeklyKg);
    }
  }

  return { ...base, status, weeklyKg, weeklyPct, headline, tip, calorieAdjust, weeksToTarget };
}

/** Local calendar day as YYYY-MM-DD, so one weigh-in per day can be stored and replaced. */
export const dayKeyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const dateFromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 8);
};

/** A target weight that points the wrong way for the goal (e.g. a higher target while cutting). */
export function targetConflict(goal: BodyGoal, targetKg: number | null, currentKg: number | null): 'above' | 'below' | null {
  if (targetKg === null || currentKg === null) return null;
  if ((goal === 'lose_weight' || goal === 'lose_fat') && targetKg > currentKg + 0.3) return 'above';
  if (goal === 'gain_muscle' && targetKg < currentKg - 0.3) return 'below';
  return null;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Start of the weigh-in week containing `date`: the most recent weigh-in day on or before it. */
export function weekStart(date: Date, weighInDay: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() - weighInDay + 7) % 7));
  return d;
}

/** One weigh-in per week (the latest one logged that week), oldest first. */
export function weeklyEntries<T extends BodyEntry>(entries: T[], weighInDay: number): T[] {
  const byWeek = new Map<string, T>();
  for (const e of [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    byWeek.set(dayKeyOf(weekStart(e.date, weighInDay)), e);
  }
  return [...byWeek.values()];
}

/** Has this week been weighed in, and when is the next one due? */
export function weighInStatus(entries: BodyEntry[], weighInDay: number, now = new Date()) {
  const thisWeek = weekStart(now, weighInDay);
  const loggedThisWeek = entries.find((e) => weekStart(e.date, weighInDay).getTime() === thisWeek.getTime()) ?? null;
  const next = new Date(thisWeek);
  if (loggedThisWeek) next.setDate(next.getDate() + 7);
  return { loggedThisWeek, next, due: !loggedThisWeek };
}

/** Morning means before 11:00. Later in the day most people read 0.5–1 kg heavier. */
export const isMorning = (d: Date) => d.getHours() < 11;
