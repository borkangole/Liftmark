import { setScore, workingSets, type LoggedSet, type ScoreContext, type Session } from '@/features/progression';

export type Change = 'up' | 'same' | 'down';

/**
 * The set to beat: the same working set (by position) from the previous session.
 * Set 3 today is compared with set 3 last time. Past the end of last session there's nothing to beat.
 */
export function previousSetAt(last: Session | undefined, workingIndex: number): LoggedSet | null {
  if (!last) return null;
  return workingSets(last.sets)[workingIndex] ?? null;
}

/** Did this set beat, match or fall short of the one before it? Compared by score (e1RM or hold time). */
export function compareSets(now: LoggedSet, before: LoggedSet, ctx: ScoreContext): Change {
  if (now.weight === before.weight && now.reps === before.reps) return 'same';
  const a = setScore(now, ctx);
  const b = setScore(before, ctx);
  // Within 0.5% counts as matching it, so rounding never shows a fake gain or drop.
  if (Math.abs(a - b) <= Math.max(a, b) * 0.005) return 'same';
  return a > b ? 'up' : 'down';
}

export interface SessionRecap {
  date: Date;
  workoutId?: number;
  sets: { set: LoggedSet; label: string; isTop: boolean }[];
  warmups: number;
  /** Best e1RM (or hold) in this session. */
  best: number;
  /** Change in best score since the session before; null for the first session. */
  delta: number | null;
  /** Working reps in total and, for loaded lifts, volume in kg. */
  totalReps: number;
  volumeKg: number;
  /** Beat every earlier session. */
  isPr: boolean;
}

/** Newest-first recap of every session, with set labels, top set, change since last time and PRs. */
export function recapSessions(sessions: Session[], ctx: ScoreContext): SessionRecap[] {
  let bestEver = 0;
  let prev: number | null = null;
  const out: SessionRecap[] = [];
  for (const s of sessions) {
    const working = workingSets(s.sets);
    const scores = working.map((w) => setScore(w, ctx));
    const best = scores.length ? Math.max(...scores) : 0;
    const topIndex = scores.indexOf(best);
    let n = 0;
    let w = -1;
    const sets = s.sets.map((set) => {
      if (set.isWarmup) return { set, label: 'W', isTop: false };
      w += 1;
      return { set, label: String(++n), isTop: w === topIndex && working.length > 1 };
    });
    out.push({
      date: s.date,
      workoutId: s.workoutId,
      sets,
      warmups: s.sets.length - working.length,
      best,
      delta: prev === null || working.length === 0 ? null : best - prev,
      totalReps: working.reduce((t, x) => t + x.reps, 0),
      volumeKg: ctx.type === 'weighted' ? working.reduce((t, x) => t + x.weight * x.reps, 0) : 0,
      isPr: bestEver > 0 && best > bestEver,
    });
    if (working.length) {
      prev = best;
      bestEver = Math.max(bestEver, best);
    }
  }
  return out.reverse();
}

/** "Today", "Yesterday", "3 days ago", "2 weeks ago" relative to `now`. */
export function relativeDay(date: Date, now = new Date()): string {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(date)) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
