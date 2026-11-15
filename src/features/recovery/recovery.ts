import { MUSCLES, type Muscle, type Targets } from '@/features/muscles/targets';
import { BODY_PARTS, muscleFatigue, RECOVERY_HOURS, type RecentWork } from '@/features/routines/switch';

/**
 * Where each muscle is in its recovery, from the working sets of the last three days
 * (the same fatigue model the split switcher uses).
 */

export type RecoveryState = 'ready' | 'recovering' | 'tired';

/** Below this a muscle is ready (about one hard set, mostly faded). */
export const READY_BELOW = 1.5;
/** At or above this it's tired: roughly a full session's worth still in it. */
export const TIRED_FROM = 6;

export const stateOf = (fatigue: number): RecoveryState =>
  fatigue < READY_BELOW ? 'ready' : fatigue < TIRED_FROM ? 'recovering' : 'tired';

export interface MuscleRecovery {
  fatigue: number;
  state: RecoveryState;
  /** When it drops back to ready; null if it already is. */
  readyAt: Date | null;
}

export interface PartRecovery {
  label: string;
  state: RecoveryState;
  readyAt: Date | null;
}

export interface Recovery {
  muscles: Record<Muscle, MuscleRecovery>;
  parts: PartRecovery[];
  /** Nothing trained hard in the last three days. */
  allReady: boolean;
}

export function buildRecovery(work: RecentWork[], now: Date, recoveryHours = RECOVERY_HOURS): Recovery {
  const current = muscleFatigue(work, now, recoveryHours);
  const muscles = {} as Record<Muscle, MuscleRecovery>;
  for (const m of MUSCLES) {
    const fatigue = current[m] ?? 0;
    let readyAt: Date | null = null;
    if (fatigue >= READY_BELOW) {
      // Fatigue only fades, so step forward an hour at a time until it's under the line.
      for (let h = 1; h <= recoveryHours; h++) {
        const later = new Date(now.getTime() + h * 3_600_000);
        if ((muscleFatigue(work, later, recoveryHours)[m] ?? 0) < READY_BELOW) {
          readyAt = later;
          break;
        }
      }
    }
    muscles[m] = { fatigue, state: stateOf(fatigue), readyAt };
  }

  const parts = BODY_PARTS.map(({ label, muscles: list }) => {
    const worst = list.reduce((a, m) => (muscles[m].fatigue > muscles[a].fatigue ? m : a), list[0]);
    const readyAt = list.reduce<Date | null>((latest, m) => {
      const r = muscles[m].readyAt;
      return r && (!latest || r > latest) ? r : latest;
    }, null);
    return { label, state: muscles[worst].state, readyAt };
  });

  return { muscles, parts, allReady: parts.every((p) => p.state === 'ready') };
}

/** Muscles of a planned day that aren't ready yet, by body part. */
export function notReadyFor(targets: Targets, recovery: Recovery): PartRecovery[] {
  const labels = new Set(
    targets.primary
      .filter((m) => recovery.muscles[m].state !== 'ready')
      .map((m) => BODY_PARTS.find((p) => p.muscles.includes(m))?.label),
  );
  return recovery.parts.filter((p) => labels.has(p.label));
}

/** "in 3 h", "tonight", "tomorrow morning", "Tue afternoon": as precise as is useful. */
export function readyWhen(at: Date, now: Date): string {
  const hours = (at.getTime() - now.getTime()) / 3_600_000;
  if (hours <= 6) return `in ${Math.max(1, Math.round(hours))} h`;
  // Overnight counts as the next morning: nobody trains at 2 AM.
  const t = new Date(at);
  if (t.getHours() < 5) t.setHours(7, 0, 0, 0);
  const h = t.getHours();
  const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(t) - day(now)) / 86_400_000);
  if (diff === 0) return part === 'evening' ? 'tonight' : `this ${part}`;
  if (diff === 1) return `tomorrow ${part}`;
  return `${t.toLocaleDateString('en-US', { weekday: 'short' })} ${part}`;
}
