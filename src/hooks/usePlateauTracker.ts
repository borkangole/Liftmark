import { useEffect } from 'react';

import { planBroken } from '@/features/progression';
import { usePlateaus } from '@/stores/usePlateaus';
import { useProgressOverview } from './useProgressOverview';

const DAY = 86_400_000;
/** A fix that hasn't worked in ten weeks is dropped, so a new one can be picked. */
const GIVE_UP_DAYS = 70;

/** Watches lifts with a fix in progress: a new best closes it as a broken plateau. Mounted once, in the tabs. */
export function usePlateauTracker() {
  const { lifts } = useProgressOverview(null);
  const plans = usePlateaus((s) => s.plans);

  useEffect(() => {
    const { breakPlan, stopPlan } = usePlateaus.getState();
    const now = Date.now();
    for (const plan of Object.values(plans)) {
      const lift = lifts.find((l) => l.exerciseId === plan.exerciseId);
      if (!lift) continue;
      const started = Date.parse(plan.startedAt);
      if (planBroken(plan, lift.trend.allTimeBestE1rm)) {
        breakPlan({
          exerciseId: plan.exerciseId,
          name: lift.name,
          fix: plan.fix,
          cause: plan.cause,
          startedAt: plan.startedAt,
          brokenAt: new Date(now).toISOString(),
          sessions: Math.max(1, lift.sessionCount - plan.sessionsAtStart),
          days: Math.max(1, Math.round((now - started) / DAY)),
        });
      } else if (now - started > GIVE_UP_DAYS * DAY) {
        stopPlan(plan.exerciseId);
      }
    }
  }, [lifts, plans]);
}
