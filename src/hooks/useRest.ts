import type { Exercise } from '@/db/schema';
import { recommendRest, resolveRest } from '@/features/rest/rest';
import { useProfile } from '@/stores/useProfile';
import { useSettings } from '@/stores/useSettings';

/** Rest for one exercise: what the timer will use, where it came from, and the evidence-based recommendation. */
export function useRest(exercise: Exercise | undefined) {
  const profile = useProfile((s) => s.profile);
  const mode = useSettings((s) => s.restMode);
  const fixedSeconds = useSettings((s) => s.defaultRestSeconds);
  if (!exercise) return null;
  const advice = recommendRest(exercise, profile);
  const resolved = resolveRest(exercise, { mode, fixedSeconds, profile });
  return { ...resolved, advice };
}

/** Non-hook version for lists (e.g. a superset partner). */
export function useRestResolver() {
  const profile = useProfile((s) => s.profile);
  const mode = useSettings((s) => s.restMode);
  const fixedSeconds = useSettings((s) => s.defaultRestSeconds);
  return (exercise: Exercise) => resolveRest(exercise, { mode, fixedSeconds, profile }).seconds;
}
