import { Linking } from 'react-native';

import { dayKeyOf } from '@/features/bodyweight/trend';
import type { HealthSource } from './types';

// Loaded on first use, so Expo Go and the web (which don't have the native module) don't crash.
type HK = typeof import('@kingstinct/react-native-healthkit');
let hk: HK | null | undefined;
function lib(): HK | null {
  if (hk === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      hk = require('@kingstinct/react-native-healthkit') as HK;
    } catch {
      hk = null;
    }
  }
  return hk;
}

const READ = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierBodyMass',
  'HKCategoryTypeIdentifierSleepAnalysis',
] as const;
const SHARE = ['HKWorkoutTypeIdentifier'] as const;

/** Asleep stages only: "in bed" and "awake" don't count as sleep. */
const ASLEEP = new Set([1, 3, 4, 5]);

export const appleHealth: HealthSource = {
  name: 'Apple Health',

  async status() {
    const h = lib();
    if (!h) return 'unavailable';
    try {
      return (await h.isHealthDataAvailableAsync()) ? 'ok' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  },

  async requestAccess() {
    const h = lib();
    if (!h) return false;
    // Apple never says which types were allowed (privacy), only that the sheet was shown.
    return h.requestAuthorization({ toRead: READ, toShare: SHARE });
  },

  async steps(from, to) {
    const h = lib();
    if (!h) return [];
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const rows = await h.queryStatisticsCollectionForQuantity(
      'HKQuantityTypeIdentifierStepCount',
      ['cumulativeSum'],
      start,
      { day: 1 },
      { filter: { date: { startDate: start, endDate: to } }, unit: 'count' },
    );
    return rows
      .filter((r) => r.startDate)
      .map((r) => ({ day: dayKeyOf(r.startDate!), steps: Math.round(r.sumQuantity?.quantity ?? 0) }));
  },

  async sleep(from, to) {
    const h = lib();
    if (!h) return [];
    const rows = await h.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    });
    return rows
      .filter((r) => ASLEEP.has(Number(r.value)))
      .map((r) => ({ start: r.startDate, end: r.endDate }));
  },

  async weights(from, to) {
    const h = lib();
    if (!h) return [];
    const rows = await h.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      limit: 0,
      unit: 'kg',
      filter: { date: { startDate: from, endDate: to } },
    });
    return rows.map((r) => ({ date: r.startDate, kg: r.quantity }));
  },

  async saveWorkout(w) {
    const h = lib();
    if (!h) return;
    await h.saveWorkoutSample(h.WorkoutActivityType.traditionalStrengthTraining, [], w.start, w.end, undefined, {
      HKExternalUUID: `liftmark-${w.id}`,
      HKWorkoutBrandName: 'Liftmark',
    });
  },

  openSettings() {
    // Health permissions live in the Health app; Settings is the closest public link.
    Linking.openURL('x-apple-health://').catch(() => Linking.openSettings());
  },
};
