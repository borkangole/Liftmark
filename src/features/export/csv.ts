import type { HistoryRow } from '@/features/history/history';
import { scoreContext, setScore } from '@/features/progression';
import { KG_PER_LB } from '@/lib/units';

/** Quotes a CSV field when it contains a comma, quote or newline (RFC 4180). */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const round = (n: number, d = 2) => Number(n.toFixed(d));
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isoTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export const CSV_HEADER = [
  'date',
  'time',
  'workout',
  'exercise',
  'set',
  'weight_kg',
  'weight_lb',
  'reps',
  'warmup',
  'est_1rm_kg',
  'seconds',
] as const;

/**
 * One row per set, oldest first, with both units so the file works in any spreadsheet.
 * Timed holds (Plank) put their duration in `seconds` and leave `reps` and the 1RM empty.
 * Bodyweight lifts store only the added weight; their 1RM includes your bodyweight.
 */
export function buildCsv(rows: HistoryRow[], { bodyweightKg }: { bodyweightKg?: number | null } = {}): string {
  const sorted = [...rows].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime() || a.order - b.order);
  const setNumber = new Map<string, number>();
  const lines = sorted.map((r) => {
    const key = `${r.workoutId}:${r.exerciseId}`;
    const n = (setNumber.get(key) ?? 0) + (r.isWarmup ? 0 : 1);
    setNumber.set(key, n);
    const ctx = scoreContext(r, bodyweightKg);
    const timed = ctx.type === 'timed';
    return [
      isoDate(r.startedAt),
      isoTime(r.startedAt),
      r.workoutName ?? 'Workout',
      r.exerciseName,
      r.isWarmup ? 'W' : n,
      round(r.weight),
      round(r.weight / KG_PER_LB, 1),
      timed ? '' : r.reps,
      r.isWarmup,
      r.isWarmup || timed ? '' : round(setScore(r, ctx), 1),
      timed ? r.reps : '',
    ]
      .map(csvField)
      .join(',');
  });
  return [CSV_HEADER.join(','), ...lines].join('\n') + '\n';
}
