import type { Db } from './client';
import { exercises, type NewExercise } from './schema';

export const presetExercises: NewExercise[] = [
  { name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', repRangeMin: 5, repRangeMax: 8 },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', weightIncrement: 2 },
  { name: 'Barbell Back Squat', muscleGroup: 'quads', equipment: 'barbell', repRangeMin: 5, repRangeMax: 8 },
  { name: 'Leg Press', muscleGroup: 'quads', equipment: 'machine', weightIncrement: 5 },
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell' },
  { name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell', repRangeMin: 3, repRangeMax: 6, weightIncrement: 5 },
  { name: 'Pull-up', muscleGroup: 'back', equipment: 'bodyweight', repRangeMin: 6, repRangeMax: 12 },
  { name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell' },
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable' },
  { name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', repRangeMin: 5, repRangeMax: 8 },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', repRangeMin: 12, repRangeMax: 20, weightIncrement: 1 },
  { name: 'Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell' },
  { name: 'Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable' },
  { name: 'Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', weightIncrement: 5 },
  { name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'machine', repRangeMin: 10, repRangeMax: 15 },
  { name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight', measure: 'time', repRangeMin: 30, repRangeMax: 60 },
  // Added with routine templates
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'cable', repRangeMin: 12, repRangeMax: 20 },
  { name: 'Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'dumbbell', repRangeMin: 12, repRangeMax: 20, weightIncrement: 1 },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', weightIncrement: 2 },
  { name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable', repRangeMin: 10, repRangeMax: 15 },
  { name: 'Dip', muscleGroup: 'chest', equipment: 'bodyweight', repRangeMin: 6, repRangeMax: 12 },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
  { name: 'Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell', weightIncrement: 2 },
  { name: 'Skull Crusher', muscleGroup: 'triceps', equipment: 'barbell' },
  { name: 'Overhead Triceps Extension', muscleGroup: 'triceps', equipment: 'cable', repRangeMin: 10, repRangeMax: 15 },
  { name: 'Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', repRangeMin: 10, repRangeMax: 15, weightIncrement: 5 },
  { name: 'Leg Extension', muscleGroup: 'quads', equipment: 'machine', repRangeMin: 10, repRangeMax: 15, weightIncrement: 5 },
  { name: 'Walking Lunge', muscleGroup: 'quads', equipment: 'dumbbell', weightIncrement: 2 },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', repRangeMin: 8, repRangeMax: 15 },
];

/**
 * Adds any preset exercises that are missing (matched by name). Safe to run every launch,
 * and it also brings existing installs up to date when new presets ship.
 */
export async function seedIfEmpty(db: Db) {
  await db.insert(exercises).values(presetExercises).onConflictDoNothing({ target: exercises.name });
}
