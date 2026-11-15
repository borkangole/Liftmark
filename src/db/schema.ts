import type { Muscle } from '@/features/muscles/targets';
import type { Meal } from '@/features/nutrition/foods';
import type { Measure } from '@/features/progression/measure';
import { relations, sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const muscleGroups = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
] as const;
export type MuscleGroup = (typeof muscleGroups)[number];

export const equipmentTypes = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'] as const;
export type Equipment = (typeof equipmentTypes)[number];

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`);

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
  equipment: text('equipment').$type<Equipment>().notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  // Used by the suggestion engine (double progression).
  repRangeMin: integer('rep_range_min').notNull().default(8),
  repRangeMax: integer('rep_range_max').notNull().default(12),
  weightIncrement: real('weight_increment').notNull().default(2.5),
  /** 'time' = the reps column holds seconds (Plank and other holds). */
  measure: text('measure').$type<Measure>().notNull().default('reps'),
  /** Custom exercises: the exact muscle picked when creating it. Presets use the built-in target table. */
  primaryMuscle: text('primary_muscle').$type<Muscle>(),
  /** Custom exercises: every muscle it works, main one first. Null for presets and older customs. */
  targetMuscles: text('target_muscles', { mode: 'json' }).$type<Muscle[]>(),
  /** The user's own rest between working sets, in seconds. Null = Liftmark's recommendation. */
  restSeconds: integer('rest_seconds'),
  createdAt: createdAt(),
});

export const routines = sqliteTable('routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  /** Preset split this routine was copied from, if any. */
  presetKey: text('preset_key'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt(),
});

export const routineDays = sqliteTable(
  'routine_days',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    routineId: integer('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    order: integer('order').notNull(),
  },
  (t) => [index('routine_days_routine_idx').on(t.routineId)],
);

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    dayId: integer('day_id')
      .notNull()
      .references(() => routineDays.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    targetSets: integer('target_sets').notNull().default(3),
    /** Items in the same day sharing this value are a superset (always two adjacent exercises). */
    supersetGroup: integer('superset_group'),
  },
  (t) => [index('routine_exercises_day_idx').on(t.dayId)],
);

/** Weekly morning weigh-ins (`day` = local YYYY-MM-DD). One per weigh-in week; logging again replaces it. */
export const bodyweights = sqliteTable('bodyweights', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  day: text('day').notNull().unique(),
  weightKg: real('weight_kg').notNull(),
  createdAt: createdAt(),
});

/** Food log: one row per food eaten. Values are per serving and copied at log time, so editing a food later never rewrites history. */
export const foodEntries = sqliteTable(
  'food_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Local calendar day, YYYY-MM-DD. */
    day: text('day').notNull(),
    meal: text('meal').$type<Meal>().notNull(),
    name: text('name').notNull(),
    /** One serving in words, e.g. "100 g" or "1 large egg". */
    serving: text('serving').notNull(),
    /** Grams in one serving, when known. */
    grams: real('grams'),
    servings: real('servings').notNull().default(1),
    kcal: real('kcal').notNull(),
    proteinG: real('protein_g').notNull().default(0),
    carbsG: real('carbs_g').notNull().default(0),
    fatG: real('fat_g').notNull().default(0),
    /** `b:<key>` built-in food, `c:<id>` the user's own food, null for a quick add. */
    foodKey: text('food_key'),
    createdAt: createdAt(),
  },
  (t) => [index('food_entries_day_idx').on(t.day)],
);

/** Foods the user created (their own recipes, packaged foods from the label). */
export const customFoods = sqliteTable('custom_foods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Set when this is the user's own version of a built-in food (`b:<key>`): it replaces that food in lists and suggestions. */
  baseKey: text('base_key'),
  name: text('name').notNull(),
  serving: text('serving').notNull(),
  grams: real('grams'),
  kcal: real('kcal').notNull(),
  proteinG: real('protein_g').notNull().default(0),
  carbsG: real('carbs_g').notNull().default(0),
  fatG: real('fat_g').notNull().default(0),
  createdAt: createdAt(),
});

export const workouts = sqliteTable('workouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** e.g. "Push Day", copied from the routine day it was started from. */
  name: text('name'),
  routineDayId: integer('routine_day_id').references(() => routineDays.id, { onDelete: 'set null' }),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
  notes: text('notes'),
  createdAt: createdAt(),
});

export const sets = sqliteTable(
  'sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutId: integer('workout_id')
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    order: integer('order').notNull(),
    reps: integer('reps').notNull(),
    weight: real('weight').notNull(), // stored in kg; converted for display
    isWarmup: integer('is_warmup', { mode: 'boolean' }).notNull().default(false),
    rpe: real('rpe'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('sets_exercise_idx').on(t.exerciseId), index('sets_workout_idx').on(t.workoutId)],
);

export const workoutsRelations = relations(workouts, ({ many }) => ({ sets: many(sets) }));
export const exercisesRelations = relations(exercises, ({ many }) => ({ sets: many(sets) }));
export const setsRelations = relations(sets, ({ one }) => ({
  workout: one(workouts, { fields: [sets.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [sets.exerciseId], references: [exercises.id] }),
}));

export const routinesRelations = relations(routines, ({ many }) => ({ days: many(routineDays) }));
export const routineDaysRelations = relations(routineDays, ({ one, many }) => ({
  routine: one(routines, { fields: [routineDays.routineId], references: [routines.id] }),
  exercises: many(routineExercises),
}));
export const routineExercisesRelations = relations(routineExercises, ({ one }) => ({
  day: one(routineDays, { fields: [routineExercises.dayId], references: [routineDays.id] }),
  exercise: one(exercises, { fields: [routineExercises.exerciseId], references: [exercises.id] }),
}));

export type Routine = typeof routines.$inferSelect;
export type RoutineDay = typeof routineDays.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Bodyweight = typeof bodyweights.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof sets.$inferSelect;
export type NewWorkoutSet = typeof sets.$inferInsert;
export type FoodEntry = typeof foodEntries.$inferSelect;
export type CustomFood = typeof customFoods.$inferSelect;
