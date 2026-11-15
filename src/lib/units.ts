export type WeightUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;
export const toDisplayWeight = (kg: number, unit: WeightUnit) => (unit === 'kg' ? kg : kg / KG_PER_LB);
export const fromDisplayWeight = (value: number, unit: WeightUnit) => (unit === 'kg' ? value : value * KG_PER_LB);

/**
 * The weight step to progress by, in kg, landing on real plates in the user's unit.
 * kg: the exercise's own increment (2.5 kg). lb: the nearest 2.5 lb multiple of it (2.5 kg → 5 lb,
 * 1 kg → 2.5 lb, 5 kg → 10 lb), so suggestions read "175 lb" instead of "175.5 lb".
 */
export function progressionStepKg(incrementKg: number, unit: WeightUnit): number {
  if (unit === 'kg') return incrementKg;
  const lb = Math.max(2.5, Math.round(incrementKg / KG_PER_LB / 2.5) * 2.5);
  return lb * KG_PER_LB;
}

/** The same step in the user's unit, for +/− buttons: 2.5 kg, or 5 lb. */
export const progressionStepDisplay = (incrementKg: number, unit: WeightUnit) =>
  Math.round(toDisplayWeight(progressionStepKg(incrementKg, unit), unit) * 100) / 100;
