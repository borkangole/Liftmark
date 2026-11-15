import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { fetchBodyweights } from '@/db/bodyweight';
import { fetchWorkoutDays } from '@/db/history';
import { weighInStatus } from '@/features/bodyweight/trend';
import { totals } from '@/features/nutrition/plan';
import { proteinPicks } from '@/features/nutrition/suggest';
import { planReminders, type ReminderInput } from '@/features/reminders/plan';
import { syncReminders } from '@/lib/reminders';
import { restAlertPermission, restAlertsSupported } from '@/lib/restAlert';
import { useProfile } from '@/stores/useProfile';
import { useReminders } from '@/stores/useReminders';
import { todayKey, useAllFoods, useFoodDay, useFoodTargets, useFoodTotals, useRecentFoodKeys } from './useFood';
import { useLiveTables } from './useLiveTables';
import { useUpNext } from './useRoutines';

const PLATEAU_NEWS_HOURS = 36;
const NO_WORKOUTS: Awaited<ReturnType<typeof fetchWorkoutDays>> = [];
const NO_WEIGH_INS: Awaited<ReturnType<typeof fetchBodyweights>> = [];

/**
 * Rebuilds the week of reminders whenever the app comes to the front or the data behind them
 * changes, then brings the phone's schedule in line. Mounted once, in the tabs.
 * Never asks for permission itself: that happens on the Reminders screen or with the first rest timer.
 */
export function useReminderSync() {
  const [day, setDay] = useState(todayKey);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setDay(todayKey()));
    return () => sub.remove();
  }, []);

  const settings = useReminders((s) => s.settings);
  const pending = useReminders((s) => s.pending);
  const daysPerWeek = useProfile((s) => s.profile?.daysPerWeek ?? null);
  const bodyGoal = useProfile((s) => s.bodyGoal);
  const weighInDay = useProfile((s) => s.weighInDay);

  const workouts = useLiveTables(fetchWorkoutDays, ['workouts', 'sets'], NO_WORKOUTS);
  const weighIns = useLiveTables(fetchBodyweights, ['bodyweights'], NO_WEIGH_INS);
  const upNext = useUpNext();
  const { targets } = useFoodTargets();
  const entries = useFoodDay(day);
  const recentDays = useFoodTotals(day, 14);
  const { foods } = useAllFoods();
  const recentKeys = useRecentFoodKeys();

  const input: ReminderInput | null = useMemo(() => {
    if (!restAlertsSupported) return null;
    const now = new Date();
    const tracksFood = targets !== null && recentDays.some((d) => d.kcal > 0);
    let food: ReminderInput['food'] = null;
    if (tracksFood && targets) {
      const eaten = totals(entries);
      const proteinLeft = targets.proteinG - eaten.proteinG;
      const pick =
        entries.length > 0 && proteinLeft > 15
          ? proteinPicks(foods, {
              proteinG: proteinLeft,
              kcalMax: Math.max(250, targets.kcal - eaten.kcal),
              meal: 'dinner',
              recentKeys,
              exclude: new Set(entries.map((e) => e.foodKey).filter((k): k is string => Boolean(k))),
            })[0]
          : undefined;
      food = {
        today:
          entries.length > 0
            ? { proteinLeft, kcalOver: eaten.kcal - targets.kcal, meals: [...new Set(entries.map((e) => e.meal))] }
            : null,
        proteinPick: pick ? pick.food.name : null,
      };
    }
    const fresh = pending && now.getTime() - Date.parse(pending.foundAt) < PLATEAU_NEWS_HOURS * 3_600_000;
    return {
      now,
      settings,
      workoutDates: workouts.map((w) => w.startedAt),
      daysPerWeek,
      nextDayName: upNext?.day.name ?? null,
      food,
      weighIn: bodyGoal ? { day: weighInDay, loggedThisWeek: weighInStatus(weighIns, weighInDay).loggedThisWeek !== null } : null,
      plateau: fresh && pending ? { exerciseId: pending.exerciseId, name: pending.name, state: pending.state } : null,
    };
    // `day` re-runs this at midnight and whenever the app returns to the front.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, settings, pending, daysPerWeek, bodyGoal, weighInDay, workouts, weighIns, upNext, targets, entries, recentDays, foods, recentKeys]);

  const plan = useMemo(() => (input ? planReminders(input) : null), [input]);
  const signature = plan ? JSON.stringify(plan.map((r) => [r.id, r.title, r.body])) : '';

  useEffect(() => {
    if (!plan) return;
    // Data often changes in bursts (a workout saving every set): wait for it to settle.
    const t = setTimeout(() => {
      restAlertPermission(false)
        .then((p) => (p === 'granted' ? syncReminders(plan) : undefined))
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
