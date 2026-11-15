import type { Lifestyle } from '@/features/bodyweight/nutrition';
import { dayKeyOf } from '@/features/bodyweight/trend';
import { averageSteps, lifestyleFromSteps } from '@/features/health/health';
import { useHealth } from '@/stores/useHealth';
import { useProfile } from '@/stores/useProfile';

/**
 * How active someone is outside the gym, for the calorie formula: measured from their steps when
 * a watch or phone has recorded enough of them, otherwise the answer they picked.
 */
export function useLifestyle(): { lifestyle: Lifestyle; avgSteps: number | null } {
  const chosen = useProfile((s) => s.lifestyle ?? 'sitting');
  const steps = useHealth((s) => (s.connected && s.share.steps ? s.steps : null));
  const avgSteps = steps ? averageSteps(steps, dayKeyOf(new Date())) : null;
  return { lifestyle: avgSteps !== null ? lifestyleFromSteps(avgSteps) : chosen, avgSteps };
}
