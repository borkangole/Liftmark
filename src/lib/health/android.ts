import { Linking } from 'react-native';

import { dayKeyOf } from '@/features/bodyweight/trend';
import type { HealthSource } from './types';

type HC = typeof import('react-native-health-connect');
let hc: HC | null | undefined;
function lib(): HC | null {
  if (hc === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      hc = require('react-native-health-connect') as HC;
    } catch {
      hc = null;
    }
  }
  return hc;
}

let initialized = false;
async function ready(h: HC) {
  if (!initialized) initialized = await h.initialize();
  return initialized;
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'write', recordType: 'ExerciseSession' },
] as const;

const range = (from: Date, to: Date) =>
  ({ operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() }) as const;

export const healthConnect: HealthSource = {
  name: 'Health Connect',

  async status() {
    const h = lib();
    if (!h) return 'unavailable';
    try {
      const s = await h.getSdkStatus();
      if (s === h.SdkAvailabilityStatus.SDK_AVAILABLE) return 'ok';
      if (s === h.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-install';
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  },

  async requestAccess() {
    const h = lib();
    if (!h || !(await ready(h))) return false;
    const granted = await h.requestPermission([...PERMISSIONS]);
    return granted.length > 0;
  },

  async steps(from, to) {
    const h = lib();
    if (!h || !(await ready(h))) return [];
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const groups = await h.aggregateGroupByPeriod({
      recordType: 'Steps',
      timeRangeFilter: range(start, to),
      timeRangeSlicer: { period: 'DAYS', length: 1 },
    });
    return groups.map((g) => ({ day: dayKeyOf(new Date(g.startTime)), steps: Math.round(g.result.COUNT_TOTAL ?? 0) }));
  },

  async sleep(from, to) {
    const h = lib();
    if (!h || !(await ready(h))) return [];
    const { records } = await h.readRecords('SleepSession', { timeRangeFilter: range(from, to) });
    return records.map((r) => ({ start: new Date(r.startTime), end: new Date(r.endTime) }));
  },

  async weights(from, to) {
    const h = lib();
    if (!h || !(await ready(h))) return [];
    const { records } = await h.readRecords('Weight', { timeRangeFilter: range(from, to) });
    return records.map((r) => ({ date: new Date(r.time), kg: r.weight.inKilograms }));
  },

  async saveWorkout(w) {
    const h = lib();
    if (!h || !(await ready(h))) return;
    await h.insertRecords([
      {
        recordType: 'ExerciseSession',
        exerciseType: h.ExerciseType.STRENGTH_TRAINING,
        title: w.name,
        startTime: w.start.toISOString(),
        endTime: w.end.toISOString(),
        // Same id every time, so a re-send updates instead of duplicating.
        metadata: { clientRecordId: `liftmark-${w.id}` },
      },
    ]);
  },

  openSettings() {
    const h = lib();
    if (h) h.openHealthConnectSettings();
    else Linking.openSettings().catch(() => {});
  },
};
