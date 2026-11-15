import { useEffect } from 'react';

import { cancelRestOver, configureRestAlerts, restAlertPermission, restAlertsSupported, scheduleRestOver } from '@/lib/restAlert';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { useSettings } from '@/stores/useSettings';

/**
 * Keeps the "rest's over" notification in step with the rest timer: scheduled when rest starts,
 * moved on +30 s, cancelled on skip, finish or discard. Mounted once, in the root layout.
 * Permission is asked the first time a rest starts, when the reason is obvious.
 */
export function useRestAlerts() {
  const endsAt = useActiveWorkout((s) => s.restEndsAt);
  const enabled = useSettings((s) => s.restAlerts);

  useEffect(() => {
    configureRestAlerts().catch(() => {});
  }, []);

  useEffect(() => {
    if (!restAlertsSupported) return;
    if (!enabled || !endsAt) {
      cancelRestOver().catch(() => {});
      return;
    }
    let active = true;
    restAlertPermission(true)
      .then((p) => (active && p === 'granted' ? scheduleRestOver(endsAt) : undefined))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [endsAt, enabled]);
}
