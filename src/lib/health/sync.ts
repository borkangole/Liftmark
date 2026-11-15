import { fetchBodyweights, logBodyweight } from '@/db/bodyweight';
import { fetchWorkoutDays } from '@/db/history';
import { nightsFrom, weighInsToImport } from '@/features/health/health';
import { dayKeyOf, weekStart } from '@/features/bodyweight/trend';
import { useHealth } from '@/stores/useHealth';
import { useProfile } from '@/stores/useProfile';
import { health } from './index';

const DAY = 86_400_000;
const THROTTLE_MS = 10 * 60_000;
let running: Promise<void> | null = null;

/**
 * Pulls steps, sleep and scale weigh-ins from the phone's health store and sends finished workouts
 * back. Everything stays on the phone. Safe to call often: it throttles and never runs twice at once.
 */
export function syncHealth(opts: { force?: boolean } = {}): Promise<void> {
  if (!running) running = run(opts).finally(() => (running = null));
  return running;
}

async function run({ force }: { force?: boolean }) {
  const state = useHealth.getState();
  if (!health || !state.connected) return;
  if (!force && state.lastSync && Date.now() - Date.parse(state.lastSync) < THROTTLE_MS) return;
  if ((await health.status()) !== 'ok') return;

  const now = new Date();
  const { share } = state;

  const [steps, sessions] = await Promise.all([
    share.steps ? health.steps(new Date(now.getTime() - 15 * DAY), now).catch(() => null) : Promise.resolve(null),
    share.sleep
      ? health.sleep(new Date(now.getTime() - 5 * DAY), now).catch(() => null)
      : Promise.resolve(null),
  ]);
  useHealth.getState().setData({
    ...(steps && { steps }),
    ...(sessions && { nights: nightsFrom(sessions) }),
  });

  if (share.weight) await importWeighIns(now).catch(console.warn);
  if (share.workouts) await exportWorkouts(now).catch(console.warn);
}

async function importWeighIns(now: Date) {
  const { bodyGoal, weighInDay, updateWeight } = useProfile.getState();
  if (!bodyGoal || !health) return;
  const samples = await health.weights(new Date(now.getTime() - 35 * DAY), now);
  if (samples.length === 0) return;
  const existing = await fetchBodyweights();
  const { importedWeeks, markImported } = useHealth.getState();
  const picks = weighInsToImport(
    samples,
    [...existing.map((e) => e.day), ...importedWeeks],
    weighInDay,
  );
  for (const p of picks) await logBodyweight(p.date, p.kg, weighInDay);
  if (picks.length > 0) {
    markImported(picks.map((p) => dayKeyOf(weekStart(p.date, weighInDay))));
    const newest = picks[picks.length - 1];
    if (!existing.some((e) => e.date > newest.date)) updateWeight(newest.kg);
  }
}

async function exportWorkouts(now: Date) {
  if (!health) return;
  const { exported, markExported } = useHealth.getState();
  const done = new Set(exported);
  const recent = (await fetchWorkoutDays()).filter(
    (w) => w.endedAt && !done.has(w.id) && now.getTime() - w.startedAt.getTime() < 7 * DAY,
  );
  const sent: number[] = [];
  for (const w of recent) {
    try {
      await health.saveWorkout({ id: w.id, name: w.name ?? 'Strength training', start: w.startedAt, end: w.endedAt! });
      sent.push(w.id);
    } catch (e) {
      console.warn('Could not send workout to health', e);
    }
  }
  if (sent.length) markExported(sent);
}
