import { and, asc, desc, eq, inArray, isNotNull, max, ne } from 'drizzle-orm';

import { repRangeFor } from '@/features/profile/recommend';
import type { Goal } from '@/features/profile/types';
import { getPreset } from '@/features/routines/presets';
import { nextRoutineDay } from '@/features/routines/nextDay';
import { useSplit } from '@/stores/useSplit';
import { db } from './client';
import { exercises, routineDays, routineExercises, routines, workouts, type Exercise, type RoutineDay } from './schema';

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

export interface RoutineDayDetail extends RoutineDay {
  exercises: { id: number; targetSets: number; order: number; supersetGroup: number | null; exercise: Exercise }[];
}

export interface RoutineDetail {
  id: number;
  name: string;
  presetKey: string | null;
  isActive: boolean;
  days: RoutineDayDetail[];
}

export async function getRoutine(routineId: number): Promise<RoutineDetail | null> {
  const [routine] = await db.select().from(routines).where(eq(routines.id, routineId));
  if (!routine) return null;
  const days = await db
    .select()
    .from(routineDays)
    .where(eq(routineDays.routineId, routineId))
    .orderBy(asc(routineDays.order), asc(routineDays.id));
  const items =
    days.length === 0
      ? []
      : await db
          .select({ item: routineExercises, exercise: exercises })
          .from(routineExercises)
          .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
          .where(
            inArray(
              routineExercises.dayId,
              days.map((d) => d.id),
            ),
          )
          .orderBy(asc(routineExercises.order), asc(routineExercises.id));

  return {
    id: routine.id,
    name: routine.name,
    presetKey: routine.presetKey,
    isActive: routine.isActive,
    days: days.map((day) => ({
      ...day,
      exercises: items
        .filter((i) => i.item.dayId === day.id)
        .map((i) => ({
          id: i.item.id,
          targetSets: i.item.targetSets,
          order: i.item.order,
          supersetGroup: i.item.supersetGroup,
          exercise: i.exercise,
        })),
    })),
  };
}

export interface RoutineListItem {
  id: number;
  name: string;
  isActive: boolean;
  dayNames: string[];
}

export async function listRoutines(): Promise<RoutineListItem[]> {
  const rows = await db
    .select({ routine: routines, day: routineDays })
    .from(routines)
    .leftJoin(routineDays, eq(routineDays.routineId, routines.id))
    .orderBy(desc(routines.isActive), asc(routines.createdAt), asc(routineDays.order));
  const byId = new Map<number, RoutineListItem>();
  for (const { routine, day } of rows) {
    const item = byId.get(routine.id) ?? {
      id: routine.id,
      name: routine.name,
      isActive: routine.isActive,
      dayNames: [],
    };
    if (day) item.dayNames.push(day.name);
    byId.set(routine.id, item);
  }
  return [...byId.values()];
}

export interface UpNext {
  routine: RoutineDetail;
  day: RoutineDayDetail;
}

/**
 * The active routine and the day after the one you trained last. A start day picked when switching
 * splits wins until the routine's first workout after it.
 */
export async function getUpNext(start?: { routineId: number; dayId: number; setAt: string } | null): Promise<UpNext | null> {
  const [active] = await db.select().from(routines).where(eq(routines.isActive, true)).limit(1);
  if (!active) return null;
  const routine = await getRoutine(active.id);
  if (!routine || routine.days.length === 0) return null;

  const [last] = await db
    .select({ dayId: workouts.routineDayId, startedAt: workouts.startedAt })
    .from(workouts)
    .innerJoin(routineDays, eq(workouts.routineDayId, routineDays.id))
    .where(and(eq(routineDays.routineId, routine.id), isNotNull(workouts.endedAt)))
    .orderBy(desc(workouts.startedAt))
    .limit(1);

  if (start && start.routineId === routine.id && (!last || last.startedAt.getTime() < Date.parse(start.setAt))) {
    const picked = routine.days.find((d) => d.id === start.dayId);
    if (picked) return { routine, day: picked };
  }
  const day = nextRoutineDay(routine.days, last?.dayId ?? null);
  return day ? { routine, day } : null;
}

// ---------------------------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------------------------

export async function setActiveRoutine(routineId: number) {
  await db.update(routines).set({ isActive: false }).where(ne(routines.id, routineId));
  await db.update(routines).set({ isActive: true }).where(eq(routines.id, routineId));
}

/** Copies a preset split into the user's routines and (by default) makes it active. Returns the new routine id. */
export async function createRoutineFromPreset(presetKey: string, activate = true): Promise<number> {
  const preset = getPreset(presetKey);
  if (!preset) throw new Error(`Unknown preset ${presetKey}`);

  const names = [...new Set(preset.days.flatMap((d) => d.exercises.map((e) => e.name)))];
  const library = await db.select().from(exercises).where(inArray(exercises.name, names));
  const idByName = new Map(library.map((e) => [e.name, e.id]));

  const [routine] = await db
    .insert(routines)
    .values({ name: preset.name, presetKey: preset.key })
    .returning({ id: routines.id });

  for (const [order, day] of preset.days.entries()) {
    const [row] = await db
      .insert(routineDays)
      .values({ routineId: routine.id, name: day.name, order })
      .returning({ id: routineDays.id });
    const items = day.exercises.flatMap((e, i) => {
      const exerciseId = idByName.get(e.name);
      return exerciseId ? [{ dayId: row.id, exerciseId, order: i, targetSets: e.sets }] : [];
    });
    if (items.length) await db.insert(routineExercises).values(items);
  }

  if (activate) await setActiveRoutine(routine.id);
  return routine.id;
}

export async function createBlankRoutine(): Promise<number> {
  const [routine] = await db.insert(routines).values({ name: 'My Routine' }).returning({ id: routines.id });
  await db.insert(routineDays).values({ routineId: routine.id, name: 'Day 1', order: 0 });
  await setActiveRoutine(routine.id);
  return routine.id;
}

export async function deleteRoutine(routineId: number) {
  useSplit.getState().forget(routineId);
  const [deleted] = await db.delete(routines).where(eq(routines.id, routineId)).returning();
  // Keep one routine active if any remain.
  if (deleted?.isActive) {
    const [next] = await db.select().from(routines).orderBy(asc(routines.createdAt)).limit(1);
    if (next) await setActiveRoutine(next.id);
  }
}

export const renameRoutine = (routineId: number, name: string) =>
  db.update(routines).set({ name: name.trim() || 'My Routine' }).where(eq(routines.id, routineId));

export async function addDay(routineId: number) {
  const [{ value }] = await db
    .select({ value: max(routineDays.order) })
    .from(routineDays)
    .where(eq(routineDays.routineId, routineId));
  const order = (value ?? -1) + 1;
  await db.insert(routineDays).values({ routineId, name: `Day ${order + 1}`, order });
}

export const renameDay = (dayId: number, name: string) =>
  db.update(routineDays).set({ name: name.trim() || 'Day' }).where(eq(routineDays.id, dayId));

export const deleteDay = (dayId: number) => db.delete(routineDays).where(eq(routineDays.id, dayId));

export async function addExerciseToDay(dayId: number, exerciseId: number) {
  const [{ value }] = await db
    .select({ value: max(routineExercises.order) })
    .from(routineExercises)
    .where(eq(routineExercises.dayId, dayId));
  await db.insert(routineExercises).values({ dayId, exerciseId, order: (value ?? -1) + 1 });
}

export async function removeRoutineExercise(id: number) {
  const [row] = await db.delete(routineExercises).where(eq(routineExercises.id, id)).returning();
  // A superset of one isn't a superset: free the partner.
  if (row?.supersetGroup != null) {
    await db
      .update(routineExercises)
      .set({ supersetGroup: null })
      .where(and(eq(routineExercises.dayId, row.dayId), eq(routineExercises.supersetGroup, row.supersetGroup)));
  }
}

/** Pairs two adjacent exercises of a day as a superset, or unpairs them if they already are. */
export async function toggleRoutineSuperset(aId: number, bId: number) {
  const rows = await db.select().from(routineExercises).where(inArray(routineExercises.id, [aId, bId]));
  const a = rows.find((r) => r.id === aId);
  const b = rows.find((r) => r.id === bId);
  if (!a || !b || a.dayId !== b.dayId) return;
  await db.transaction(async (tx) => {
    const paired = a.supersetGroup != null && a.supersetGroup === b.supersetGroup;
    // Break any pair either one is in, so each exercise stays in at most one superset.
    const groups = [a.supersetGroup, b.supersetGroup].filter((g): g is number => g != null);
    if (groups.length) {
      await tx
        .update(routineExercises)
        .set({ supersetGroup: null })
        .where(and(eq(routineExercises.dayId, a.dayId), inArray(routineExercises.supersetGroup, groups)));
    }
    if (!paired) {
      await tx.update(routineExercises).set({ supersetGroup: a.id }).where(inArray(routineExercises.id, [aId, bId]));
    }
  });
}

export const setTargetSets = (id: number, targetSets: number) =>
  db
    .update(routineExercises)
    .set({ targetSets: Math.min(10, Math.max(1, targetSets)) })
    .where(eq(routineExercises.id, id));

/** Starts a workout from a routine day. Returns the new workout id. */
export async function startWorkoutFromDay(dayId: number): Promise<number> {
  const [day] = await db.select().from(routineDays).where(eq(routineDays.id, dayId));
  const [row] = await db
    .insert(workouts)
    .values({ startedAt: new Date(), name: day?.name ?? null, routineDayId: dayId })
    .returning({ id: workouts.id });
  return row.id;
}

/** The planned exercises (and target sets) for a workout started from a routine day. */
export async function getWorkoutPlan(workoutId: number) {
  return db
    .select({
      exerciseId: routineExercises.exerciseId,
      targetSets: routineExercises.targetSets,
      supersetGroup: routineExercises.supersetGroup,
    })
    .from(workouts)
    .innerJoin(routineExercises, eq(routineExercises.dayId, workouts.routineDayId))
    .where(eq(workouts.id, workoutId))
    .orderBy(asc(routineExercises.order), asc(routineExercises.id));
}

/** Sets every library exercise's rep range to suit the user's goal (compounds lower, isolation higher). */
export async function applyGoalRepRanges(goal: Goal) {
  const all = await db.select({ id: exercises.id, name: exercises.name, measure: exercises.measure }).from(exercises);
  for (const e of all) {
    // Timed holds keep their seconds range; a "6–10" target would mean a 10-second plank.
    if (e.measure === 'time') continue;
    const r = repRangeFor(goal, e.name);
    await db.update(exercises).set({ repRangeMin: r.min, repRangeMax: r.max }).where(eq(exercises.id, e.id));
  }
}
