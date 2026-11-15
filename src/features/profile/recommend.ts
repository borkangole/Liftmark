import type { RepRange } from '@/features/progression';
import { getPreset, type SplitPreset } from '@/features/routines/presets';
import type { Goal, Level, Profile } from './types';

/** Multi-joint lifts. Everything else is treated as isolation work. */
export const COMPOUND_LIFTS = new Set([
  'Barbell Bench Press',
  'Incline Dumbbell Press',
  'Barbell Back Squat',
  'Leg Press',
  'Romanian Deadlift',
  'Deadlift',
  'Pull-up',
  'Barbell Row',
  'Lat Pulldown',
  'Overhead Press',
  'Dumbbell Shoulder Press',
  'Dip',
  'Seated Cable Row',
  'Hip Thrust',
  'Walking Lunge',
]);

const REP_RANGES: Record<Goal, { compound: RepRange; isolation: RepRange }> = {
  strength: { compound: { min: 3, max: 6 }, isolation: { min: 6, max: 10 } },
  muscle: { compound: { min: 6, max: 10 }, isolation: { min: 10, max: 15 } },
  general: { compound: { min: 8, max: 12 }, isolation: { min: 10, max: 15 } },
  fat_loss: { compound: { min: 10, max: 15 }, isolation: { min: 12, max: 20 } },
};

/** Rep range for an exercise, tuned to the goal. Isolation work stays higher-rep. */
export const repRangeFor = (goal: Goal, exerciseName: string): RepRange =>
  REP_RANGES[goal][COMPOUND_LIFTS.has(exerciseName) ? 'compound' : 'isolation'];

/**
 * Fallback rest if the user switches to one fixed rest time. The real default is per exercise (features/rest).
 * No goal goes under 90 s: shorter rest cuts reps without burning more fat (Singer et al. 2024).
 */
export const REST_FOR_GOAL: Record<Goal, number> = { strength: 180, muscle: 120, general: 120, fat_loss: 90 };

export const GOAL_LABEL: Record<Goal, string> = {
  strength: 'Get stronger',
  muscle: 'Build muscle',
  general: 'General fitness',
  fat_loss: 'Lose fat',
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export interface PlanRecommendation {
  preset: SplitPreset;
  /** Why this split, in plain language. */
  reasons: string[];
  restSeconds: number;
  compoundRange: RepRange;
  isolationRange: RepRange;
}

function pickSplit(level: Level, goal: Goal, days: number): { key: string; why: string } {
  if (days <= 3) {
    if (level === 'advanced') return { key: 'ppl', why: 'Three days a week covers Push, Pull and Legs once each.' };
    return {
      key: 'full-body',
      why: `With ${days} days a week, full-body sessions hit every muscle each time you train.`,
    };
  }
  if (days === 4) {
    return { key: 'upper-lower', why: 'Four days fits Upper/Lower perfectly: every muscle twice a week.' };
  }
  if (level === 'beginner') {
    return {
      key: 'upper-lower',
      why:
        'Upper/Lower is the best next step for beginners. ' +
        `Use your extra day${days > 5 ? 's' : ''} for rest or light cardio.`,
    };
  }
  if (days === 5 && level === 'advanced' && goal === 'muscle') {
    return {
      key: 'bro-split',
      why: 'Five days and a size goal suit a body-part split with lots of volume per muscle.',
    };
  }
  return {
    key: 'ppl',
    why:
      days >= 6
        ? 'Six days runs Push/Pull/Legs twice a week, the classic high-frequency setup.'
        : 'Five days rotates through Push/Pull/Legs, so each muscle gets trained almost twice a week.',
  };
}

/** Chooses a split and training settings from the user's profile. Rule-based and explainable on purpose. */
export function recommendPlan(profile: Pick<Profile, 'level' | 'goal' | 'daysPerWeek'>): PlanRecommendation {
  const days = Math.min(6, Math.max(2, Math.round(profile.daysPerWeek)));
  const { key, why } = pickSplit(profile.level, profile.goal, days);
  const preset = getPreset(key)!;
  const ranges = REP_RANGES[profile.goal];
  const reasons = [
    why,
    `${GOAL_LABEL[profile.goal]}: main lifts in the ${ranges.compound.min}–${ranges.compound.max} rep range, ` +
      `accessories ${ranges.isolation.min}–${ranges.isolation.max}.`,
    profile.goal === 'strength' && profile.level !== 'beginner'
      ? 'Rest is set per exercise: up to 4 min on heavy lifts, 90 s on smaller ones.'
      : 'Rest is set per exercise: about 3 min on heavy lifts, 90 s on smaller ones.',
  ];
  if (profile.level === 'beginner') {
    reasons.push('Start lighter than you think. Liftmark adds weight for you once you own the reps.');
  }
  return {
    preset,
    reasons,
    restSeconds: REST_FOR_GOAL[profile.goal],
    compoundRange: ranges.compound,
    isolationRange: ranges.isolation,
  };
}
