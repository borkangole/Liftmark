import { useMemo } from 'react';

import { fetchBodyweights, type BodyweightRow } from '@/db/bodyweight';
import { recommendCalories } from '@/features/bodyweight/nutrition';
import { analyzeBodyweight, weeklyEntries, weighInStatus, type LiftSignal } from '@/features/bodyweight/trend';
import { formatNumber } from '@/lib/format';
import { toDisplayWeight } from '@/lib/units';
import { useProfile } from '@/stores/useProfile';
import { useSettings } from '@/stores/useSettings';
import { useLifestyle } from './useLifestyle';
import { useLiveTables } from './useLiveTables';

const TABLES = ['bodyweights'];
const NONE: BodyweightRow[] = [];

/** Live weigh-ins plus the trend read against the user's body goal. */
export function useBodyweight(lifts?: LiftSignal) {
  const all = useLiveTables(fetchBodyweights, TABLES, NONE);
  const weighInDay = useProfile((s) => s.weighInDay ?? 1);
  // One weigh-in per week: older installs may hold several in a week, so keep the latest of each.
  const entries = useMemo(() => weeklyEntries(all, weighInDay), [all, weighInDay]);
  const schedule = useMemo(() => weighInStatus(entries, weighInDay), [entries, weighInDay]);
  const goal = useProfile((s) => s.bodyGoal);
  const targetKg = useProfile((s) => s.targetWeightKg);
  const profile = useProfile((s) => s.profile);
  const level = profile?.level;
  const { lifestyle } = useLifestyle();
  const unit = useSettings((s) => s.unit);

  const analysis = useMemo(
    () =>
      goal
        ? analyzeBodyweight(entries, {
            goal,
            level,
            targetKg,
            lifts,
            // Rates are small: two decimals so "0.12 kg/week" matches the chip.
            format: (kg) => `${formatNumber(toDisplayWeight(Math.abs(kg), unit), 2)} ${unit}`,
          })
        : null,
    [entries, goal, level, targetKg, lifts, unit],
  );
  // Daily calories for the goal, corrected by the weigh-in trend once there's enough of it.
  const calories = useMemo(
    () => (goal && profile ? recommendCalories(profile, goal, lifestyle, analysis) : null),
    [goal, profile, lifestyle, analysis],
  );

  return { entries, goal, targetKg, analysis, unit, weighInDay, schedule, calories, lifestyle };
}
