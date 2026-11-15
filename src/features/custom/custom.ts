import type { MuscleGroup, NewExercise } from '@/db/schema';
import { MUSCLE_LABEL, type Muscle } from '@/features/muscles/targets';
import type { LoadType } from '@/features/progression/measure';

/** The coarse group a picked muscle is filed under (search, lists, the Progress tab). */
export const MUSCLE_GROUP: Record<Muscle, MuscleGroup> = {
  chest: 'chest',
  frontDelts: 'shoulders',
  sideDelts: 'shoulders',
  rearDelts: 'shoulders',
  traps: 'back',
  lats: 'back',
  lowerBack: 'back',
  serratus: 'core',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'biceps',
  abs: 'core',
  obliques: 'core',
  quads: 'quads',
  adductors: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
};

/** Muscles you can pick for a custom exercise, top to bottom. */
export const PICKABLE_MUSCLES: Muscle[] = [
  'chest',
  'frontDelts',
  'sideDelts',
  'rearDelts',
  'traps',
  'lats',
  'lowerBack',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'glutes',
  'quads',
  'adductors',
  'hamstrings',
  'calves',
];

/** The picker's muscle list, grouped by body region. Covers every pickable muscle once. */
export const MUSCLE_SECTIONS: { title: string; muscles: Muscle[] }[] = [
  { title: 'Chest & shoulders', muscles: ['chest', 'frontDelts', 'sideDelts', 'rearDelts'] },
  { title: 'Back', muscles: ['traps', 'lats', 'lowerBack'] },
  { title: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { title: 'Core', muscles: ['abs', 'obliques'] },
  { title: 'Legs', muscles: ['glutes', 'quads', 'adductors', 'hamstrings', 'calves'] },
];

export const NAME_MIN = 2;
export const NAME_MAX = 40;

/** Trims and collapses spaces: "  incline   cable fly " → "incline cable fly". */
export const cleanName = (raw: string) => raw.trim().replace(/\s+/g, ' ');

export type NameProblem = 'too_short' | 'too_long' | 'taken' | null;

/** Case-insensitive, so "Cable Fly" can't sit next to "cable fly". */
export function checkName(raw: string, existing: string[]): NameProblem {
  const name = cleanName(raw);
  if (name.length < NAME_MIN) return 'too_short';
  if (name.length > NAME_MAX) return 'too_long';
  const key = name.toLowerCase();
  return existing.some((e) => e.toLowerCase() === key) ? 'taken' : null;
}

/** How many muscles one custom exercise can list. */
export const MAX_MUSCLES = 6;

/** Adds a muscle to the picked list, or removes it if it's already there. Order is kept: first = main. */
export function toggleMuscle(list: Muscle[], muscle: Muscle): Muscle[] {
  if (list.includes(muscle)) return list.filter((m) => m !== muscle);
  return list.length >= MAX_MUSCLES ? list : [...list, muscle];
}

/**
 * Row values for a new custom exercise. The first muscle is the main one: it files the exercise
 * under a group (search, Progress). Timed holds use seconds (30–60), like Plank.
 */
export function buildCustomExercise({
  name,
  muscles,
  type,
  repRange,
}: {
  name: string;
  muscles: Muscle[];
  type: LoadType;
  repRange: { min: number; max: number };
}): NewExercise {
  const [main] = muscles;
  if (!main) throw new Error('A custom exercise needs at least one muscle');
  return {
    name: cleanName(name),
    muscleGroup: MUSCLE_GROUP[main],
    primaryMuscle: main,
    targetMuscles: [...new Set(muscles)],
    equipment: type === 'weighted' ? 'other' : 'bodyweight',
    measure: type === 'timed' ? 'time' : 'reps',
    repRangeMin: type === 'timed' ? 30 : repRange.min,
    repRangeMax: type === 'timed' ? 60 : repRange.max,
    isCustom: true,
  };
}

/** "Rear delts", "Chest, triceps +1" for custom exercises; "shoulders" for library ones. */
export function muscleLabel(e: { muscleGroup: string; primaryMuscle?: Muscle | null; targetMuscles?: Muscle[] | null }) {
  const list = e.targetMuscles?.length ? e.targetMuscles : e.primaryMuscle ? [e.primaryMuscle] : null;
  if (!list) return e.muscleGroup.replace('_', ' ');
  const shown = list.slice(0, 2).map((m, i) => (i === 0 ? MUSCLE_LABEL[m] : MUSCLE_LABEL[m].toLowerCase()));
  return shown.join(', ') + (list.length > 2 ? ` +${list.length - 2}` : '');
}
