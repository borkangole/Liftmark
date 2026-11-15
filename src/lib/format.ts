import type { LoadType } from '@/features/progression/measure';
import { toDisplayWeight, type WeightUnit } from './units';

/** Trims float noise and trailing zeros: 82.50000001 → "82.5". */
export const formatNumber = (n: number, maxDecimals = 2) => String(Number(n.toFixed(maxDecimals)));

export const formatWeight = (kg: number, unit: WeightUnit) => `${formatNumber(toDisplayWeight(kg, unit), 1)} ${unit}`;

/** 75_000 → "1:15", 3_725_000 → "1:02:05" */
export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Big numbers for stat tiles: 12450 → "12.5k" */
export const formatCompact = (n: number) => (n >= 10_000 ? `${formatNumber(n / 1000, 1)}k` : formatNumber(n, 0));

/** Human workout length: "<1 min", "45 min", "1 h 5 min". */
export function formatMinutes(ms: number) {
  const mins = Math.round(Math.max(0, ms) / 60_000);
  if (mins < 1) return '<1 min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

/** "1 set", "3 sets" */
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** Hold time: "45 s", "1:30". */
export function formatSeconds(seconds: number) {
  const s = Math.round(seconds);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The load part of a set: "77.5 kg", "BW", "BW + 10 kg". */
export function formatLoad(kg: number, type: LoadType, unit: WeightUnit) {
  if (type === 'weighted') return formatWeight(kg, unit);
  return kg > 0 ? `BW + ${formatWeight(kg, unit)}` : 'BW';
}

/** One logged set: "77.5 kg × 8", "BW × 10", "BW + 10 kg × 6", "45 s". */
export function formatSet(set: { weight: number; reps: number }, type: LoadType, unit: WeightUnit) {
  if (type === 'timed') return set.weight > 0 ? `${formatSeconds(set.reps)} @ ${formatWeight(set.weight, unit)}` : formatSeconds(set.reps);
  return `${formatLoad(set.weight, type, unit)} × ${set.reps}`;
}

/** A target: "3 × 8 @ 77.5 kg", "3 × 8 @ BW", "3 × 45 s". */
export function formatTarget(t: { sets: number; targetReps: number; weight: number }, type: LoadType, unit: WeightUnit) {
  if (type === 'timed') return `${t.sets} × ${formatSeconds(t.targetReps)}`;
  return `${t.sets} × ${t.targetReps} @ ${formatLoad(t.weight, type, unit)}`;
}

/** A strength score: estimated 1RM as a weight, or hold time for timed lifts. */
export function formatScore(score: number, type: LoadType, unit: WeightUnit) {
  return type === 'timed' ? formatSeconds(score) : formatWeight(score, unit);
}

/** Label for a score: "Est. 1RM" or "Best hold". */
export const scoreLabel = (type: LoadType) => (type === 'timed' ? 'Best hold' : 'Est. 1RM');

/** Rep range for an exercise: "6–10 reps" or "30–60 s". */
export function formatRepRange(min: number, max: number, type: LoadType, withUnit = true) {
  if (type === 'timed') return `${min}–${max} s`;
  return withUnit ? `${min}–${max} reps` : `${min}–${max}`;
}
