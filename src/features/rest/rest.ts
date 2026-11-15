import { MUSCLE_GROUP } from '@/features/custom/custom';
import type { Muscle } from '@/features/muscles/targets';
import { COMPOUND_LIFTS } from '@/features/profile/recommend';
import type { Goal, Level } from '@/features/profile/types';

/**
 * Evidence-based rest between working sets.
 *
 * - Hypertrophy: resting more than 60 s gives a small benefit, with no appreciable extra gain past 90 s
 *   (Singer et al. 2024, Bayesian meta-analysis). So nothing goes below 90 s, and isolation work stays at 90 s.
 * - Strength: trained lifters need more than 2 min to maximise strength gains; 60–120 s is enough for
 *   untrained lifters (Grgic et al. 2018, systematic review of 23 studies).
 * - Heavy multi-joint lifts: 3 min beat 1 min for both strength and size in trained men (Schoenfeld et al. 2016),
 *   and the heavier the load, the longer the rest needed to repeat it (Willardson 2006).
 * - Short rest doesn't help fat loss; it only cuts the reps you can do (volume), so every goal uses these values.
 */

export type RestTier = 'heavy' | 'compound' | 'isolation' | 'hold';

/** Big barbell / machine lifts that load the whole body or the largest muscles. */
export const HEAVY_LIFTS = new Set([
  'Barbell Back Squat',
  'Deadlift',
  'Barbell Bench Press',
  'Overhead Press',
  'Romanian Deadlift',
  'Barbell Row',
  'Leg Press',
]);

const BIG_GROUPS = new Set(['quads', 'hamstrings', 'glutes', 'back', 'chest', 'full_body']);

export interface RestExercise {
  name: string;
  equipment: string;
  muscleGroup: string;
  measure?: string | null;
  isCustom?: boolean;
  targetMuscles?: Muscle[] | null;
  repRangeMax: number;
}

export function restTier(e: RestExercise): RestTier {
  if (e.measure === 'time') return 'hold';
  if (HEAVY_LIFTS.has(e.name)) return 'heavy';
  if (COMPOUND_LIFTS.has(e.name)) return 'compound';
  if (e.isCustom) {
    // A custom lift that works muscles in two or more groups is multi-joint.
    const groups = new Set((e.targetMuscles ?? []).map((m) => MUSCLE_GROUP[m]));
    if (groups.size >= 2) {
      // Barbell work on a big muscle group is treated like the main lifts.
      return e.equipment === 'barbell' && BIG_GROUPS.has(e.muscleGroup) ? 'heavy' : 'compound';
    }
  }
  return 'isolation';
}

/** Seconds by tier: [untrained, trained]. */
const BASE: Record<RestTier, [number, number]> = {
  heavy: [150, 180],
  compound: [120, 150],
  isolation: [90, 90],
  hold: [60, 60],
};

/** Strength goal: trained lifters need > 2 min on multi-joint work (Grgic 2018). */
const STRENGTH: Record<RestTier, [number, number]> = {
  heavy: [180, 240],
  compound: [150, 180],
  isolation: [90, 90],
  hold: [60, 60],
};

export interface RestAdvice {
  seconds: number;
  tier: RestTier;
  /** One plain-language line on why. */
  reason: string;
}

export function recommendRest(e: RestExercise, profile?: { goal: Goal; level: Level } | null): RestAdvice {
  const tier = restTier(e);
  const trained = profile ? profile.level !== 'beginner' : true;
  const table = profile?.goal === 'strength' ? STRENGTH : BASE;
  let seconds = table[tier][trained ? 1 : 0];
  // Very heavy sets (5 reps or fewer) need longer to repeat the load.
  const heavyLoad = e.repRangeMax <= 5 && (tier === 'heavy' || tier === 'compound');
  if (heavyLoad) seconds = Math.max(seconds, 180);

  const reason =
    tier === 'hold'
      ? 'Core holds recover quickly, so a minute is plenty.'
      : tier === 'isolation'
        ? 'Single-joint work: 90 s is enough. Longer rest adds no extra muscle growth.'
        : heavyLoad
          ? 'Heavy, low-rep sets need longer to repeat the same weight.'
          : profile?.goal === 'strength' && trained
            ? 'For strength, trained lifters gain more with over 2 minutes on big lifts.'
            : tier === 'heavy'
              ? 'Big lifts tire your whole body. Longer rest keeps your reps up on the next set.'
              : 'Multi-joint lift: a bit more rest keeps your reps from dropping.';
  return { seconds, tier, reason };
}

/** What the timer actually uses: the user's own value for this exercise, else a fixed default, else smart. */
export function resolveRest(
  e: RestExercise & { restSeconds?: number | null },
  opts: {
    mode: 'smart' | 'fixed';
    fixedSeconds: number;
    profile?: { goal: Goal; level: Level } | null;
  },
): { seconds: number; source: 'custom' | 'fixed' | 'smart' } {
  if (e.restSeconds && e.restSeconds > 0) return { seconds: e.restSeconds, source: 'custom' };
  if (opts.mode === 'fixed') return { seconds: opts.fixedSeconds, source: 'fixed' };
  return { seconds: recommendRest(e, opts.profile).seconds, source: 'smart' };
}

/** Choices offered in the rest picker. */
export const REST_CHOICES = [60, 90, 120, 150, 180, 240, 300];

export const REST_SOURCES = [
  {
    cite: 'Singer et al. (2024), Frontiers in Sports and Active Living',
    finding: 'Resting more than 60 s gives slightly more muscle growth, with no clear extra benefit past 90 s.',
    url: 'https://doi.org/10.3389/fspor.2024.1429789',
  },
  {
    cite: 'Grgic et al. (2018), Sports Medicine',
    finding: 'Trained lifters need more than 2 min to maximise strength; 60–120 s is enough for beginners.',
    url: 'https://doi.org/10.1007/s40279-017-0788-x',
  },
  {
    cite: 'Schoenfeld et al. (2016), J Strength Cond Res',
    finding: '3 min rest beat 1 min for both strength and muscle size in trained men.',
    url: 'https://doi.org/10.1519/JSC.0000000000001272',
  },
  {
    cite: 'Zhang et al. (2025), Sports Medicine',
    finding:
      'Supersets cut session time with the same long-term gains. Opposing-muscle pairs keep your reps; same-muscle pairs lose some.',
    url: 'https://doi.org/10.1007/s40279-025-02176-8',
  },
  {
    cite: 'Willardson (2006), J Strength Cond Res',
    finding: 'The heavier the load, the longer the rest needed to repeat it.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17194236/',
  },
] as const;
