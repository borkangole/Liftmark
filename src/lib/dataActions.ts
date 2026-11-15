import Storage from 'expo-sqlite/kv-store';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { reloadAppAsync } from 'expo';

import { db } from '@/db/client';
import { fetchHistoryRows } from '@/db/history';
import { bodyweights, customFoods, exercises, foodEntries, routines, sets, workouts } from '@/db/schema';
import { buildCsv } from '@/features/export/csv';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { usePlateaus } from '@/stores/usePlateaus';
import { useReminders } from '@/stores/useReminders';
import { useProfile } from '@/stores/useProfile';
import { THEME_KEY, type ThemePreference } from '@/theme/tokens';
import { clearReminders } from './reminders';

/** Writes every logged set to a CSV in the cache folder and opens the share sheet. */
export async function exportCsv(): Promise<{ rows: number }> {
  const rows = await fetchHistoryRows();
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `liftmark-export-${stamp}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(buildCsv(rows, { bodyweightKg: useProfile.getState().profile?.weightKg }));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      UTI: 'public.comma-separated-values-text',
      dialogTitle: 'Export Liftmark data',
    });
  }
  return { rows: rows.length };
}

/** Deletes all workouts, sets, routines, weigh-ins and the food log. The exercise library, profile and settings are kept. */
export async function resetAllData() {
  await db.delete(sets);
  await db.delete(workouts);
  await db.delete(routines); // routine days and their exercises cascade
  await db.delete(bodyweights);
  await db.delete(foodEntries);
  await db.delete(customFoods);
  await db.update(exercises).set({ restSeconds: null }); // back to recommended rest
  usePlateaus.setState({ plans: {}, episodes: [], justBroken: null });
  useReminders.setState({ announced: {}, pending: null });
  await clearReminders().catch(() => {});
  useActiveWorkout.setState({
    exerciseIdsByWorkout: {},
    pairsByWorkout: {},
    goNext: null,
    restEndsAt: null,
    celebration: null,
  });
}

/** Saves the appearance choice and reloads so every screen is rebuilt with the new palette. */
export async function applyTheme(pref: ThemePreference) {
  Storage.setItemSync(THEME_KEY, pref);
  await reloadAppAsync('Appearance changed');
}
