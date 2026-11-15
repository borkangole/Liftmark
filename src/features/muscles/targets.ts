import type { MuscleGroup } from '@/db/schema';

export const MUSCLES = [
  'chest',
  'frontDelts',
  'sideDelts',
  'rearDelts',
  'traps',
  'lats',
  'lowerBack',
  'serratus',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
  'adductors',
  'hamstrings',
  'glutes',
  'calves',
] as const;
export type Muscle = (typeof MUSCLES)[number];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest',
  frontDelts: 'Front delts',
  sideDelts: 'Side delts',
  rearDelts: 'Rear delts',
  traps: 'Traps',
  lats: 'Lats',
  lowerBack: 'Lower back',
  serratus: 'Serratus',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  adductors: 'Adductors',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
};

export interface Targets {
  primary: Muscle[];
  secondary: Muscle[];
}

const t = (primary: Muscle[], secondary: Muscle[] = []): Targets => ({ primary, secondary });

/** Muscles worked by each library exercise. */
export const EXERCISE_TARGETS: Record<string, Targets> = {
  'Barbell Bench Press': t(['chest'], ['frontDelts', 'triceps']),
  'Incline Dumbbell Press': t(['chest', 'frontDelts'], ['triceps']),
  'Barbell Back Squat': t(['quads', 'glutes'], ['adductors', 'hamstrings', 'lowerBack']),
  'Leg Press': t(['quads', 'glutes'], ['adductors', 'hamstrings']),
  'Romanian Deadlift': t(['hamstrings', 'glutes'], ['lowerBack', 'forearms']),
  Deadlift: t(['glutes', 'hamstrings', 'lowerBack'], ['quads', 'traps', 'lats', 'forearms']),
  'Pull-up': t(['lats'], ['biceps', 'rearDelts', 'forearms']),
  'Barbell Row': t(['lats', 'traps'], ['rearDelts', 'biceps', 'lowerBack']),
  'Lat Pulldown': t(['lats'], ['biceps', 'rearDelts']),
  'Overhead Press': t(['frontDelts', 'sideDelts'], ['triceps', 'traps']),
  'Lateral Raise': t(['sideDelts'], ['traps']),
  'Barbell Curl': t(['biceps'], ['forearms']),
  'Triceps Pushdown': t(['triceps']),
  'Hip Thrust': t(['glutes'], ['hamstrings']),
  'Standing Calf Raise': t(['calves']),
  Plank: t(['abs'], ['obliques', 'serratus', 'frontDelts']),
  'Face Pull': t(['rearDelts'], ['traps']),
  'Rear Delt Fly': t(['rearDelts'], ['traps']),
  'Dumbbell Shoulder Press': t(['frontDelts', 'sideDelts'], ['triceps']),
  'Cable Fly': t(['chest'], ['frontDelts', 'serratus']),
  Dip: t(['chest', 'triceps'], ['frontDelts']),
  'Seated Cable Row': t(['lats'], ['traps', 'rearDelts', 'biceps']),
  'Hammer Curl': t(['biceps', 'forearms']),
  'Skull Crusher': t(['triceps']),
  'Overhead Triceps Extension': t(['triceps']),
  'Leg Curl': t(['hamstrings'], ['calves']),
  'Leg Extension': t(['quads']),
  'Walking Lunge': t(['quads', 'glutes'], ['hamstrings', 'adductors']),
  'Hanging Leg Raise': t(['abs'], ['obliques', 'forearms']),
};

/** Fallback for custom exercises: light up the whole group they were filed under. */
const GROUP_TARGETS: Record<MuscleGroup, Targets> = {
  chest: t(['chest']),
  back: t(['lats', 'traps']),
  shoulders: t(['frontDelts', 'sideDelts', 'rearDelts']),
  biceps: t(['biceps']),
  triceps: t(['triceps']),
  quads: t(['quads']),
  hamstrings: t(['hamstrings']),
  glutes: t(['glutes']),
  calves: t(['calves']),
  core: t(['abs', 'obliques']),
  full_body: t(['quads', 'glutes', 'chest', 'lats']),
};

/** A muscle picked on its own (custom exercises), with the muscles that usually help it. */
export const SUPPORTING_MUSCLES: Record<Muscle, Muscle[]> = {
  chest: ['frontDelts', 'triceps'],
  frontDelts: ['sideDelts', 'triceps'],
  sideDelts: ['traps'],
  rearDelts: ['traps'],
  traps: ['rearDelts'],
  lats: ['biceps', 'rearDelts'],
  lowerBack: ['glutes', 'hamstrings'],
  serratus: ['chest'],
  biceps: ['forearms'],
  triceps: [],
  forearms: [],
  abs: ['obliques'],
  obliques: ['abs'],
  quads: ['glutes'],
  adductors: ['quads'],
  hamstrings: ['glutes'],
  glutes: ['hamstrings'],
  calves: [],
};

export const targetsForMuscle = (muscle: Muscle): Targets => t([muscle], SUPPORTING_MUSCLES[muscle]);

/** Muscles picked by hand for a custom exercise: all of them count as worked. */
export const targetsForMuscles = (muscles: Muscle[]): Targets => t(MUSCLES.filter((m) => muscles.includes(m)));

/** A custom exercise's targets: its picked list, or (older ones) its single muscle and helpers. */
const customTargetsFor = (primaryMuscle?: Muscle | null, targetMuscles?: Muscle[] | null) =>
  targetMuscles?.length ? targetsForMuscles(targetMuscles) : primaryMuscle ? targetsForMuscle(primaryMuscle) : null;

/** Custom exercises by name, so name-only lookups (history cards) can map them too. */
const customTargets = new Map<string, Targets>();
export function registerCustomTargets(
  list: { name: string; primaryMuscle: Muscle | null; targetMuscles?: Muscle[] | null }[],
) {
  customTargets.clear();
  for (const e of list) {
    const targets = customTargetsFor(e.primaryMuscle, e.targetMuscles);
    if (targets) customTargets.set(e.name, targets);
  }
}

/** Library targets by name, then a custom exercise's picked muscles, then its whole group. */
export const getTargets = (
  name: string,
  group: MuscleGroup,
  primaryMuscle?: Muscle | null,
  targetMuscles?: Muscle[] | null,
): Targets =>
  EXERCISE_TARGETS[name] ?? customTargetsFor(primaryMuscle, targetMuscles) ?? customTargets.get(name) ?? GROUP_TARGETS[group];

/** Merges several exercises into one map: anything primary anywhere stays primary. */
export function combineTargets(list: Targets[]): Targets {
  const primary = new Set(list.flatMap((t) => t.primary));
  const secondary = new Set(list.flatMap((t) => t.secondary).filter((m) => !primary.has(m)));
  return {
    primary: MUSCLES.filter((m) => primary.has(m)),
    secondary: MUSCLES.filter((m) => secondary.has(m)),
  };
}

/** Combined targets for exercises known only by name (preset splits). Unknown names are skipped. */
export const targetsForNames = (names: string[]) =>
  combineTargets(names.flatMap((n) => {
    const known = EXERCISE_TARGETS[n] ?? customTargets.get(n);
    return known ? [known] : [];
  }));
