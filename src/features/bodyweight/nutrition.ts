import { calculateBmi } from '@/features/profile/bmi';
import type { Profile } from '@/features/profile/types';
import { targetRange, type BodyAnalysis, type BodyGoal } from './trend';

/** How active someone is outside the gym. Asked when setting a body goal. */
export type Lifestyle = 'sitting' | 'on_feet' | 'physical';

export const LIFESTYLE_LABEL: Record<Lifestyle, { title: string; subtitle: string }> = {
  sitting: { title: 'Mostly sitting', subtitle: 'Desk job, studying, driving' },
  on_feet: { title: 'On my feet a lot', subtitle: 'Teaching, retail, lots of walking' },
  physical: { title: 'Physical work', subtitle: 'Construction, farming, warehouse' },
};

const LIFESTYLE_FACTOR: Record<Lifestyle, number> = { sitting: 1.2, on_feet: 1.35, physical: 1.5 };
/** Each weekly training day adds about this much to the activity multiplier. */
const PER_TRAINING_DAY = 0.035;
const KCAL_PER_KG = 7700;
const KCAL = { protein: 4, carbs: 4, fat: 9 } as const;

/**
 * Resting energy (BMR) by the Mifflin-St Jeor equation, the most accurate of the common formulas.
 * "Unspecified" sex uses the midpoint of the male and female constants.
 */
export function restingCalories(p: Pick<Profile, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
  const sexTerm = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + sexTerm;
}

export function activityFactor(lifestyle: Lifestyle, trainingDays: number): number {
  return Math.min(1.9, LIFESTYLE_FACTOR[lifestyle] + PER_TRAINING_DAY * Math.max(0, Math.min(7, trainingDays)));
}

export interface Macros {
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface CalorieAdvice {
  /** Daily calories to aim for. */
  target: number;
  /** Estimated daily burn (maintenance). */
  maintenance: number;
  bmr: number;
  activity: number;
  /** target − maintenance. */
  adjustment: number;
  macros: Macros;
  bmi: number | null;
  /** Why the number is what it is, one line each. */
  reasons: string[];
  /** Something the user should know (BMI vs goal, age, floors). */
  caution: string | null;
  /** True when the target already includes a correction from the weigh-in trend. */
  fromTrend: boolean;
}

const round = (n: number, step: number) => Math.round(n / step) * step;
/** Never recommend eating below these, whatever the maths says. */
const FLOOR = { male: 1500, female: 1200, unspecified: 1350 } as const;

/**
 * A daily calorie and macro target for the user's body goal, from their profile and BMI.
 * When the bodyweight trend shows they're off pace, the target shifts by what the trend implies.
 */
export function recommendCalories(
  profile: Profile,
  goal: BodyGoal,
  lifestyle: Lifestyle = 'sitting',
  trend?: Pick<BodyAnalysis, 'status' | 'calorieAdjust'> | null,
  /** Maintenance measured from the user's food log and weigh-ins. Replaces the formula and the trend correction. */
  measuredMaintenance?: number | null,
): CalorieAdvice {
  const bmr = restingCalories(profile);
  const activity = activityFactor(lifestyle, profile.daysPerWeek);
  const measured = measuredMaintenance != null && measuredMaintenance > 0;
  const maintenance = measured ? measuredMaintenance : bmr * activity;
  const rawBmi = calculateBmi(profile.weightKg, profile.heightCm);
  const bmi = rawBmi > 0 ? rawBmi : null;
  const reasons: string[] = measured
    ? [`Maintenance ≈ ${round(maintenance, 50).toLocaleString()} kcal, measured from your food log and weigh-ins.`]
    : [
        `Resting burn about ${round(bmr, 10).toLocaleString()} kcal for your age, height and weight.`,
        `× ${activity.toFixed(2)} for your daily activity and ${profile.daysPerWeek} training days ≈ ${round(maintenance, 50).toLocaleString()} kcal to maintain.`,
      ];
  let caution: string | null = null;

  // Weekly change to aim for: the middle of the goal's healthy range.
  let effectiveGoal = goal;
  if (profile.age < 18) {
    effectiveGoal = 'recomp';
    caution = "You're under 18, so Liftmark only shows maintenance. Talk to a doctor or dietitian before cutting or bulking.";
  } else if (bmi !== null && bmi < 18.5 && (goal === 'lose_weight' || goal === 'lose_fat')) {
    effectiveGoal = 'recomp';
    caution = `Your BMI is ${bmi.toFixed(1)}, below the healthy range, so Liftmark won't suggest eating less. Consider a recomp or gaining muscle instead.`;
  } else if (bmi !== null && bmi >= 27 && goal === 'gain_muscle') {
    caution = `Your BMI is ${bmi.toFixed(1)}. A slow bulk works, but a recomp (eating at maintenance and training hard) may suit you better.`;
  }

  const [lo, hi] = targetRange(effectiveGoal, profile.level);
  // With a high BMI, a faster loss is safe; lean people should lose more slowly to keep muscle.
  let pct = (lo + hi) / 2;
  if (effectiveGoal === 'lose_weight' && bmi !== null && bmi >= 30) pct = lo; // ~1%/week
  if (effectiveGoal === 'lose_fat' && bmi !== null && bmi < 22) pct = hi; // gentler ~0.25%/week
  if (effectiveGoal === 'recomp') pct = 0;

  const weeklyKg = (pct / 100) * profile.weightKg;
  let adjustment = (weeklyKg * KCAL_PER_KG) / 7;
  // Caps: deficits at most 25% of maintenance, surpluses at most 15%.
  adjustment = Math.max(-0.25 * maintenance, Math.min(0.15 * maintenance, adjustment));

  if (effectiveGoal === 'recomp') reasons.push('Recomp: eat at maintenance and let training do the work.');
  else if (adjustment < 0) reasons.push(`− ${round(-adjustment, 50)} kcal to lose about ${Math.abs(weeklyKg).toFixed(2)} kg a week.`);
  else reasons.push(`+ ${round(adjustment, 50)} kcal to gain about ${weeklyKg.toFixed(2)} kg a week, mostly muscle.`);

  // The weigh-ins know better than any formula: if the trend says you're off pace, shift the target.
  let fromTrend = false;
  if (!measured && trend && trend.status !== 'start' && trend.status !== 'on_track' && trend.calorieAdjust && profile.age >= 18) {
    adjustment += trend.calorieAdjust;
    fromTrend = true;
    reasons.push(
      `${trend.calorieAdjust > 0 ? '+' : '−'} ${Math.abs(trend.calorieAdjust)} kcal from your weigh-ins, which show you're ${
        trend.status === 'too_fast' ? 'moving faster' : trend.status === 'too_slow' ? 'moving slower' : 'heading the other way'
      } than planned.`,
    );
  }

  const floor = FLOOR[profile.sex];
  let target = round(maintenance + adjustment, 50);
  if (target < floor) {
    target = floor;
    caution = caution ?? `Liftmark won't go below ${floor.toLocaleString()} kcal a day. For a bigger deficit, talk to a doctor or dietitian.`;
  }

  // Protein: higher in a deficit to protect muscle. With BMI ≥ 30, base it on a healthy-range
  // weight (BMI 25 at your height) so the number isn't inflated.
  const heightM = profile.heightCm / 100;
  const proteinWeight = bmi !== null && bmi >= 30 ? 25 * heightM * heightM : profile.weightKg;
  const perKg = effectiveGoal === 'lose_weight' || effectiveGoal === 'lose_fat' ? 2.0 : 1.8;
  const proteinG = round(proteinWeight * perKg, 5);
  const fatG = round(Math.max(0.6 * profile.weightKg, (target * 0.25) / KCAL.fat), 5);
  const carbsG = Math.max(0, round((target - proteinG * KCAL.protein - fatG * KCAL.fat) / KCAL.carbs, 5));

  return {
    target,
    maintenance: round(maintenance, 50),
    bmr: round(bmr, 10),
    activity,
    adjustment: target - round(maintenance, 50),
    macros: { proteinG, fatG, carbsG },
    bmi,
    reasons,
    caution,
    fromTrend,
  };
}
