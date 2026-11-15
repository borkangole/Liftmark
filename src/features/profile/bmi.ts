export type BmiCategory = 'underweight' | 'healthy' | 'overweight' | 'obese';

/** Body-mass index: kg / m². */
export function calculateBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return m > 0 ? weightKg / (m * m) : 0;
}

/** WHO adult categories. */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25) return 'healthy';
  if (bmi < 30) return 'overweight';
  return 'obese';
}

export const BMI_LABEL: Record<BmiCategory, string> = {
  underweight: 'Underweight',
  healthy: 'Healthy weight',
  overweight: 'Overweight',
  obese: 'Obese',
};

/** Where `bmi` sits on a 15–40 scale, 0–1, for drawing a gauge. */
export const bmiGaugePosition = (bmi: number) => Math.min(1, Math.max(0, (bmi - 15) / 25));

export const cmFromFeetInches = (feet: number, inches: number) => (feet * 12 + inches) * 2.54;
export function feetInchesFromCm(cm: number) {
  const total = Math.round(cm / 2.54);
  return { feet: Math.floor(total / 12), inches: total % 12 };
}
