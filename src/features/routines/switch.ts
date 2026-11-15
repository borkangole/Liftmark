import type { Muscle, Targets } from '@/features/muscles/targets';

/**
 * Picking where to start a new split, so switching mid-week doesn't hammer muscles you just trained.
 *
 * Each working set leaves fatigue on the muscles it trains (full on the main ones, half on helpers)
 * that fades to nothing over three days, the usual 48–72 h a trained muscle needs between hard
 * sessions. The day whose muscles carry the least fatigue right now is the best place to start.
 */

export const RECOVERY_HOURS = 72;
/** Below this a muscle counts as rested (about one hard set's worth, mostly faded). */
const RESTED = 1.5;

export interface RecentWork {
  targets: Targets;
  at: Date;
  /** Working sets (warm-ups excluded). */
  sets: number;
}

export type Fatigue = Partial<Record<Muscle, number>>;

/** `recoveryHours` stretches past 72 when sleep has been short. */
export function muscleFatigue(work: RecentWork[], now: Date, recoveryHours = RECOVERY_HOURS): Fatigue {
  const out: Fatigue = {};
  for (const w of work) {
    const hours = (now.getTime() - w.at.getTime()) / 3_600_000;
    if (hours < 0 || hours >= recoveryHours) continue;
    const left = 1 - hours / recoveryHours;
    for (const m of w.targets.primary) out[m] = (out[m] ?? 0) + w.sets * left;
    for (const m of w.targets.secondary) out[m] = (out[m] ?? 0) + w.sets * left * 0.5;
  }
  return out;
}

/** Friendlier groups for what people see. */
export const BODY_PARTS: { label: string; muscles: Muscle[] }[] = [
  { label: 'Chest', muscles: ['chest'] },
  { label: 'Shoulders', muscles: ['frontDelts', 'sideDelts', 'rearDelts'] },
  { label: 'Back', muscles: ['lats', 'traps', 'lowerBack'] },
  { label: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { label: 'Legs', muscles: ['quads', 'hamstrings', 'glutes', 'adductors', 'calves'] },
  { label: 'Core', muscles: ['abs', 'obliques', 'serratus'] },
];

const partOf = (m: Muscle) => BODY_PARTS.find((p) => p.muscles.includes(m))?.label ?? m;

/** How tired a day's muscles are now: average over its main muscles, helpers counting half. */
export function dayFatigue(targets: Targets, fatigue: Fatigue): number {
  const weights = [...targets.primary.map((m) => [m, 1] as const), ...targets.secondary.map((m) => [m, 0.5] as const)];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  if (total === 0) return 0;
  return weights.reduce((sum, [m, w]) => sum + (fatigue[m] ?? 0) * w, 0) / total;
}

export interface StartDay<T> {
  day: T;
  index: number;
  /** One line on why, e.g. "Back and arms are rested · legs were trained yesterday". */
  reason: string;
}

export interface CandidateDay {
  name: string;
  targets: Targets;
}

/** The day to start a split on: the one with the most rested muscles; earlier days win ties. */
export function pickStartDay<T extends CandidateDay>(days: T[], work: RecentWork[], now: Date): StartDay<T> | null {
  if (days.length === 0) return null;
  const fatigue = muscleFatigue(work, now);
  const scores = days.map((d) => dayFatigue(d.targets, fatigue));
  let index = 0;
  scores.forEach((s, i) => {
    if (s < scores[index] - 0.25) index = i;
  });
  const day = days[index];

  const tired = Object.entries(fatigue).filter(([, f]) => (f ?? 0) >= RESTED) as [Muscle, number][];
  if (tired.length === 0) return { day, index, reason: 'Everything’s rested, so start from the top.' };

  const rested = [...new Set(day.targets.primary.filter((m) => (fatigue[m] ?? 0) < RESTED).map(partOf))];
  const avoided = recentParts(work, now).find((p) => !day.targets.primary.some((m) => partOf(m) === p.label));
  const parts = [
    rested.length > 0 ? `${joinParts(rested)} ${rested.length === 1 ? 'is' : 'are'} rested` : null,
    avoided ? `${avoided.label.toLowerCase()} trained ${avoided.when}` : null,
  ].filter(Boolean);
  return { day, index, reason: parts.length ? capitalize(parts.join(' · ')) : 'The most rested option right now.' };
}

export interface RecentPart {
  label: string;
  /** "today", "yesterday", "2 days ago". */
  when: string;
  hoursAgo: number;
}

/** Body parts hit hard in the last three days, most recent first. */
export function recentParts(work: RecentWork[], now: Date): RecentPart[] {
  const last = new Map<string, number>();
  for (const w of work) {
    const hours = (now.getTime() - w.at.getTime()) / 3_600_000;
    if (hours < 0 || hours >= RECOVERY_HOURS || w.sets < 2) continue;
    for (const m of w.targets.primary) {
      const label = partOf(m);
      last.set(label, Math.min(last.get(label) ?? Infinity, hours));
    }
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return [...last.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([label, hoursAgo]) => {
      const at = now.getTime() - hoursAgo * 3_600_000;
      const days = Math.ceil((today - at) / 86_400_000);
      return { label, hoursAgo, when: days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago` };
    });
}

const joinParts = (parts: string[]) =>
  parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`.toLowerCase();

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Weekly rotation: which split this week should use, counting whole weeks since the rotation began. */
export function rotationIndex(startWeek: Date, thisWeek: Date, length: number): number {
  const weeks = Math.round((thisWeek.getTime() - startWeek.getTime()) / (7 * 86_400_000));
  return ((weeks % length) + length) % length;
}
