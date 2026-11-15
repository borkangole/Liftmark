import { useProgressOverview } from './useProgressOverview';

/** The overview's verdict for one lift, with its diagnosis when it's stuck. */
export function useLiftDiagnosis(exerciseId: number) {
  const o = useProgressOverview(null);
  const lift = o.lifts.find((l) => l.exerciseId === exerciseId) ?? null;
  return { lift, diagnosis: lift?.diagnosis ?? { causes: [], since: null } };
}
