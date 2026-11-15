import { fetchRecentWork } from '@/db/history';
import { createRoutineFromPreset, getRoutine, listRoutines, setActiveRoutine } from '@/db/routines';
import { combineTargets, getTargets, targetsForNames, type Targets } from '@/features/muscles/targets';
import { addDays, dayKey, startOfWeek } from '@/features/progress/dates';
import { SPLIT_PRESETS } from '@/features/routines/presets';
import {
  pickStartDay,
  recentParts,
  RECOVERY_HOURS,
  rotationIndex,
  type RecentPart,
  type RecentWork,
  type StartDay,
} from '@/features/routines/switch';
import { useSplit } from '@/stores/useSplit';

export interface SplitDay {
  /** Null for a preset not copied yet. */
  id: number | null;
  name: string;
  targets: Targets;
}

export interface SplitOption {
  key: string;
  routineId: number | null;
  presetKey: string | null;
  name: string;
  isActive: boolean;
  days: SplitDay[];
  start: StartDay<SplitDay> | null;
}

export interface SplitChoices {
  options: SplitOption[];
  recent: RecentPart[];
}

/** Working sets from the last three days, with the muscles each one trained. */
export async function recentWork(now: Date): Promise<RecentWork[]> {
  // 96 h covers recovery stretched by short sleep.
  const rows = await fetchRecentWork(new Date(now.getTime() - (RECOVERY_HOURS + 24) * 3_600_000));
  return rows.map((r) => ({
    at: r.at,
    sets: r.sets,
    targets: getTargets(r.name, r.muscleGroup, r.primaryMuscle, r.targetMuscles),
  }));
}

/** Every split the user could switch to (theirs, then presets they haven't copied), each with its best start day. */
export async function loadSplitChoices(now = new Date()): Promise<SplitChoices> {
  const work = await recentWork(now);
  const list = await listRoutines();
  const options: SplitOption[] = [];
  for (const item of list) {
    const routine = await getRoutine(item.id);
    if (!routine || routine.days.length === 0) continue;
    const days: SplitDay[] = routine.days.map((d) => ({
      id: d.id,
      name: d.name,
      targets: combineTargets(
        d.exercises.map((e) =>
          getTargets(e.exercise.name, e.exercise.muscleGroup, e.exercise.primaryMuscle, e.exercise.targetMuscles),
        ),
      ),
    }));
    options.push({
      key: `r${routine.id}`,
      routineId: routine.id,
      presetKey: routine.presetKey,
      name: routine.name,
      isActive: routine.isActive,
      days,
      start: pickStartDay(days, work, now),
    });
  }
  const copied = new Set(options.map((o) => o.presetKey));
  for (const preset of SPLIT_PRESETS) {
    if (copied.has(preset.key)) continue;
    const days: SplitDay[] = preset.days.map((d) => ({
      id: null,
      name: d.name,
      targets: targetsForNames(d.exercises.map((e) => e.name)),
    }));
    options.push({
      key: `p${preset.key}`,
      routineId: null,
      presetKey: preset.key,
      name: preset.name,
      isActive: false,
      days,
      start: pickStartDay(days, work, now),
    });
  }
  return { options, recent: recentParts(work, now) };
}

/** Makes the option the active split, starting on `dayIndex`. Presets are copied first. */
export async function switchSplit(option: SplitOption, dayIndex: number) {
  const routineId = option.routineId ?? (await createRoutineFromPreset(option.presetKey!, false));
  await setActiveRoutine(routineId);
  const routine = await getRoutine(routineId);
  const day = routine?.days[Math.min(dayIndex, (routine?.days.length ?? 1) - 1)];
  if (day) useSplit.getState().setStartDay(routineId, day.id);
  return routineId;
}

/** Makes sure every option in a rotation exists as a routine; returns their ids in order. */
export async function ensureRoutines(options: SplitOption[]): Promise<number[]> {
  const ids: number[] = [];
  for (const o of options) ids.push(o.routineId ?? (await createRoutineFromPreset(o.presetKey!, false)));
  return ids;
}

/** Starts a weekly rotation so this week stays on the current split. */
export function startRotation(routineIds: number[], activeId: number | null, now = new Date()) {
  const thisWeek = startOfWeek(now);
  const offset = Math.max(0, activeId === null ? 0 : routineIds.indexOf(activeId));
  useSplit.getState().setRotation({
    routineIds,
    startWeek: dayKey(addDays(thisWeek, -7 * offset)),
    appliedWeek: dayKey(thisWeek),
  });
}

/** Once a week, moves the active split along the rotation and starts it on its most rested day. */
export async function applyRotation(now = new Date()) {
  const { rotation, markApplied } = useSplit.getState();
  if (!rotation || rotation.routineIds.length < 2) return;
  const thisWeek = startOfWeek(now);
  const week = dayKey(thisWeek);
  if (rotation.appliedWeek === week) return;
  const [y, m, d] = rotation.startWeek.split('-').map(Number);
  const target = rotation.routineIds[rotationIndex(new Date(y, m - 1, d), thisWeek, rotation.routineIds.length)];
  markApplied(week);
  const { options } = await loadSplitChoices(now);
  const option = options.find((o) => o.routineId === target);
  if (!option || option.isActive) return;
  await switchSplit(option, option.start?.index ?? 0);
}
