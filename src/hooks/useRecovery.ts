import { useMemo } from 'react';

import { dayKeyOf } from '@/features/bodyweight/trend';
import { recentSleep, recoveryHoursFor } from '@/features/health/health';
import { buildRecovery } from '@/features/recovery/recovery';
import { recentWork } from '@/lib/splitSwitch';
import { useHealth } from '@/stores/useHealth';
import { useLiveTables } from './useLiveTables';
import { useNow } from './useNow';

const TABLES = ['workouts', 'sets', 'exercises'];

/**
 * Live recovery map: refreshed when sets change and every 10 minutes as fatigue fades.
 * With sleep from a watch, short nights stretch recovery.
 */
export function useRecovery() {
  const now = useNow(10 * 60_000);
  const nights = useHealth((s) => (s.connected && s.share.sleep ? s.nights : null));
  // Look back far enough for the slowest (short-sleep) recovery.
  const work = useLiveTables(() => recentWork(new Date()), TABLES, [], [Math.floor(now / 3_600_000)]);
  return useMemo(() => {
    const sleep = nights ? recentSleep(nights, dayKeyOf(new Date(now))) : null;
    return { ...buildRecovery(work, new Date(now), recoveryHoursFor(sleep)), sleep };
  }, [work, now, nights]);
}
