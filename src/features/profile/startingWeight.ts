import { roundToIncrement } from '@/features/progression';
import type { Level, Sex } from './types';

/**
 * Conservative first-session working weights, as a fraction of bodyweight, for an untrained
 * male lifter doing ~10 reps. Scaled by experience and sex below. These are starting points,
 * deliberately on the light side: Liftmark's progression takes it from there.
 */
const BODYWEIGHT_RATIO: Record<string, number> = {
  'Barbell Bench Press': 0.45,
  'Incline Dumbbell Press': 0.15, // per dumbbell
  'Barbell Back Squat': 0.55,
  'Leg Press': 1.0,
  'Romanian Deadlift': 0.5,
  Deadlift: 0.65,
  'Barbell Row': 0.4,
  'Lat Pulldown': 0.45,
  'Seated Cable Row': 0.45,
  'Overhead Press': 0.3,
  'Dumbbell Shoulder Press': 0.1,
  'Lateral Raise': 0.05,
  'Rear Delt Fly': 0.05,
  'Face Pull': 0.15,
  'Barbell Curl': 0.2,
  'Hammer Curl': 0.08,
  'Triceps Pushdown': 0.2,
  'Skull Crusher': 0.18,
  'Overhead Triceps Extension': 0.15,
  'Cable Fly': 0.08,
  'Hip Thrust': 0.6,
  'Leg Curl': 0.25,
  'Leg Extension': 0.3,
  'Walking Lunge': 0.1, // per dumbbell
  'Standing Calf Raise': 0.6,
};

/** Bodyweight exercises: start with bodyweight only (0 kg added). */
const BODYWEIGHT_ONLY = new Set(['Pull-up', 'Dip', 'Plank', 'Hanging Leg Raise']);

const LEVEL_FACTOR: Record<Level, number> = { beginner: 1, intermediate: 1.5, advanced: 2 };
const UPPER_BODY = new Set([
  'Barbell Bench Press',
  'Incline Dumbbell Press',
  'Overhead Press',
  'Dumbbell Shoulder Press',
  'Lateral Raise',
  'Rear Delt Fly',
  'Barbell Curl',
  'Hammer Curl',
  'Triceps Pushdown',
  'Skull Crusher',
  'Overhead Triceps Extension',
  'Cable Fly',
  'Face Pull',
]);

export interface StartingWeightInput {
  exerciseName: string;
  bodyweightKg: number;
  level: Level;
  sex: Sex;
  increment: number;
}

/** Suggested first working weight in kg, or null when the lift isn't in the table. */
export function startingWeight(input: StartingWeightInput): number | null {
  const { exerciseName, bodyweightKg, level, sex, increment } = input;
  if (BODYWEIGHT_ONLY.has(exerciseName)) return 0;
  const ratio = BODYWEIGHT_RATIO[exerciseName];
  if (ratio === undefined || bodyweightKg <= 0) return null;
  // Women typically start at a lower fraction of bodyweight, especially for upper-body lifts.
  const sexFactor = sex === 'female' ? (UPPER_BODY.has(exerciseName) ? 0.6 : 0.75) : 1;
  const raw = bodyweightKg * ratio * LEVEL_FACTOR[level] * sexFactor;
  return Math.max(increment, roundToIncrement(raw, increment));
}
