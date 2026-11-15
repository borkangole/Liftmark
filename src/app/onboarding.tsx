import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { FadeIn } from '@/components/motion/FadeIn';
import { MuscleMap } from '@/components/muscles/MuscleMap';
import { BmiGauge } from '@/components/onboarding/BmiGauge';
import { ChoiceCard } from '@/components/onboarding/ChoiceCard';
import { Button, Screen, Segmented, Stepper, Text } from '@/components/ui';
import { applyGoalRepRanges, createRoutineFromPreset } from '@/db/routines';
import { targetsForNames } from '@/features/muscles/targets';
import { calculateBmi, cmFromFeetInches, feetInchesFromCm } from '@/features/profile/bmi';
import { GOAL_LABEL, LEVEL_LABEL, recommendPlan } from '@/features/profile/recommend';
import type { Goal, Level, Profile, Sex } from '@/features/profile/types';
import { parseNumberInput } from '@/features/logging/prefill';
import { formatNumber } from '@/lib/format';
import { fromDisplayWeight, toDisplayWeight, useSettings, type WeightUnit } from '@/stores/useSettings';
import { useProfile } from '@/stores/useProfile';
import { colors, radius, space } from '@/theme/tokens';

const STEPS = ['welcome', 'about', 'body', 'bmi', 'level', 'goal', 'days', 'plan'] as const;
type Step = (typeof STEPS)[number];

const LEVELS: { value: Level; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'beginner', subtitle: 'New to lifting, or less than a year of steady training', icon: 'leaf-outline' },
  {
    value: 'intermediate',
    subtitle: '1–3 years. You know the main lifts and train regularly',
    icon: 'barbell-outline',
  },
  { value: 'advanced', subtitle: '3+ years. Progress is slow and you plan your training', icon: 'trophy-outline' },
];

const GOALS: { value: Goal; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'strength', subtitle: 'Lift heavier. Lower reps, longer rest', icon: 'flash-outline' },
  { value: 'muscle', subtitle: 'Get bigger. Moderate reps, steady volume', icon: 'body-outline' },
  { value: 'general', subtitle: 'Feel fit and healthy. Balanced training', icon: 'heart-outline' },
  { value: 'fat_loss', subtitle: 'Lean out while keeping muscle. Higher reps, short rest', icon: 'flame-outline' },
];

export default function OnboardingScreen() {
  const editing = useLocalSearchParams<{ edit?: string }>().edit === '1';
  const existing = useProfile((s) => s.profile);
  const saveProfile = useProfile((s) => s.saveProfile);
  const { unit: savedUnit, setUnit, setDefaultRest } = useSettings();
  const insets = useSafeAreaInsets();

  const start = editing && existing ? existing : null;
  const startFt = start ? feetInchesFromCm(start.heightCm) : { feet: 5, inches: 7 };

  const [step, setStep] = useState<Step>(editing ? 'about' : 'welcome');
  const [age, setAge] = useState(start ? String(start.age) : '');
  const [sex, setSex] = useState<Sex>(start?.sex ?? 'unspecified');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>(savedUnit === 'lb' ? 'ft' : 'cm');
  const [heightCm, setHeightCm] = useState(start ? formatNumber(start.heightCm, 0) : '');
  const [feet, setFeet] = useState(String(startFt.feet));
  const [inches, setInches] = useState(String(startFt.inches));
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(savedUnit);
  const [weight, setWeight] = useState(start ? formatNumber(toDisplayWeight(start.weightKg, savedUnit), 1) : '');
  const [level, setLevel] = useState<Level | null>(start?.level ?? null);
  const [goal, setGoal] = useState<Goal | null>(start?.goal ?? null);
  const [days, setDays] = useState(start?.daysPerWeek ?? 3);
  const [saving, setSaving] = useState(false);

  // ---- Derived values -------------------------------------------------------------------------
  const ageNum = parseNumberInput(age);
  const height =
    heightUnit === 'cm'
      ? parseNumberInput(heightCm)
      : (() => {
          const f = parseNumberInput(feet);
          const i = parseNumberInput(inches) ?? 0;
          return f === null ? null : cmFromFeetInches(f, i);
        })();
  const weightKg = (() => {
    const w = parseNumberInput(weight);
    return w === null ? null : fromDisplayWeight(w, weightUnit);
  })();
  const bmi = height && weightKg ? calculateBmi(weightKg, height) : null;
  const plan = useMemo(
    () => (level && goal ? recommendPlan({ level, goal, daysPerWeek: days }) : null),
    [level, goal, days],
  );

  const valid: Record<Step, boolean> = {
    welcome: true,
    about: ageNum !== null && ageNum >= 13 && ageNum <= 100 && Number.isInteger(ageNum),
    body:
      height !== null && height >= 120 && height <= 230 && weightKg !== null && weightKg >= 30 && weightKg <= 250,
    bmi: bmi !== null,
    level: level !== null,
    goal: goal !== null,
    days: days >= 2 && days <= 6,
    plan: plan !== null,
  };
  const hint: Partial<Record<Step, string>> = {
    about: 'Enter an age between 13 and 100.',
    body: 'Enter a height of 120–230 cm (4′0″–7′6″) and a weight of 30–250 kg.',
  };

  const index = STEPS.indexOf(step);
  const first = editing ? 1 : 0;
  const go = (delta: number) => setStep(STEPS[Math.min(STEPS.length - 1, Math.max(first, index + delta))]);

  const finish = async (createPlan: boolean) => {
    if (!plan || ageNum === null || !height || !weightKg || !level || !goal) return;
    setSaving(true);
    try {
      const profile: Profile = { age: ageNum, sex, heightCm: height, weightKg, level, goal, daysPerWeek: days };
      saveProfile(profile);
      setUnit(weightUnit);
      setDefaultRest(plan.restSeconds);
      await applyGoalRepRanges(goal);
      if (createPlan) await createRoutineFromPreset(plan.preset.key);
      if (editing) router.back();
      else {
        router.replace('/');
        if (!createPlan) router.push('/routines/browse');
      }
    } finally {
      setSaving(false);
    }
  };

  // ---- Footer ---------------------------------------------------------------------------------
  const footer = (
    <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
      {step === 'plan' ? (
        <>
          <Button
            title={
              saving ? 'Setting up…' : editing ? 'Save & switch to this plan' : `Start ${plan?.preset.name ?? 'plan'}`
            }
            onPress={() => finish(true)}
            disabled={saving}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => finish(false)}
            style={styles.secondary}
            disabled={saving}
          >
            <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
              {editing ? 'Save profile only' : "I'll pick a split myself"}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {!valid[step] && hint[step] && (
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {hint[step]}
            </Text>
          )}
          <Button
            title={step === 'welcome' ? 'Get started' : 'Continue'}
            onPress={() => go(1)}
            disabled={!valid[step]}
            style={!valid[step] ? { opacity: 0.4 } : undefined}
          />
        </>
      )}
    </View>
  );

  return (
    <Screen edges={['top']} footer={footer}>
      {/* Progress + back */}
      {step !== 'welcome' && (
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (index <= first ? router.back() : go(-1))}
            hitSlop={8}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.chalk} />
          </Pressable>
          <View style={styles.progress} accessibilityLabel={`Step ${index} of ${STEPS.length - 1}`}>
            {STEPS.slice(1).map((s, i) => (
              <View key={s} style={[styles.segment, i < index && { backgroundColor: colors.volt }]} />
            ))}
          </View>
        </View>
      )}

      <FadeIn key={step}>
        <View style={{ gap: space.lg }}>
          {step === 'welcome' && (
            <View style={styles.welcome}>
              <AnimatedLiftmarkMark size={112} progress={1} staggerOnMount celebrateOnMount />
              <Text variant="display" style={{ textAlign: 'center' }}>
                Welcome to Liftmark<Text variant="display" accent>.</Text>
              </Text>
              <Text variant="label" style={{ textAlign: 'center', lineHeight: 22 }}>
                A few quick questions so Liftmark can pick your split, tune your rep ranges and suggest starting
                weights. Takes about a minute.
              </Text>
              <View style={styles.bullets}>
                <Bullet icon="body-outline" text="Your body stats and BMI" />
                <Bullet icon="barbell-outline" text="Your experience and goal" />
                <Bullet icon="sparkles-outline" text="A plan made for you" />
                <Bullet icon="lock-closed-outline" text="Stays on this phone. No account." />
              </View>
            </View>
          )}

          {step === 'about' && (
            <>
              <Title kicker="ABOUT YOU" title="How old are you?" />
              <Stepper label="Age" value={age} onChange={setAge} step={1} />
              <Text variant="label" style={{ marginTop: space.md }}>
                Sex (optional). Used only to fine-tune starting weights.
              </Text>
              <Segmented
                accessibilityLabel="Sex"
                value={sex}
                onChange={setSex}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'unspecified', label: 'Skip' },
                ]}
              />
            </>
          )}

          {step === 'body' && (
            <>
              <Title kicker="YOUR BODY" title="Height and weight" />
              <View style={styles.fieldHeader}>
                <Text variant="label" style={{ flex: 1 }}>
                  Height
                </Text>
                <View style={{ width: 140 }}>
                  <Segmented
                    accessibilityLabel="Height unit"
                    value={heightUnit}
                    onChange={setHeightUnit}
                    options={[
                      { value: 'cm', label: 'cm' },
                      { value: 'ft', label: 'ft/in' },
                    ]}
                  />
                </View>
              </View>
              {heightUnit === 'cm' ? (
                <Stepper label="Height (cm)" value={heightCm} onChange={setHeightCm} step={1} />
              ) : (
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <Stepper label="Feet" value={feet} onChange={setFeet} step={1} />
                  <Stepper label="Inches" value={inches} onChange={setInches} step={1} />
                </View>
              )}

              <View style={[styles.fieldHeader, { marginTop: space.md }]}>
                <Text variant="label" style={{ flex: 1 }}>
                  Bodyweight
                </Text>
                <View style={{ width: 140 }}>
                  <Segmented
                    accessibilityLabel="Weight unit"
                    value={weightUnit}
                    onChange={(u) => {
                      const w = parseNumberInput(weight);
                      if (w !== null) {
                        setWeight(formatNumber(toDisplayWeight(fromDisplayWeight(w, weightUnit), u), 1));
                      }
                      setWeightUnit(u);
                    }}
                    options={[
                      { value: 'kg', label: 'kg' },
                      { value: 'lb', label: 'lb' },
                    ]}
                  />
                </View>
              </View>
              <Stepper
                label={`Weight (${weightUnit})`}
                value={weight}
                onChange={setWeight}
                step={weightUnit === 'kg' ? 0.5 : 1}
                decimal
              />

              {bmi !== null && valid.body && (
                <View style={styles.preview}>
                  <Ionicons name="analytics-outline" size={16} color={colors.volt} />
                  <Text variant="label" style={{ color: colors.chalk }}>
                    BMI {formatNumber(bmi, 1)}. Full breakdown next.
                  </Text>
                </View>
              )}
            </>
          )}

          {step === 'bmi' && bmi !== null && (
            <>
              <Title kicker="YOUR BMI" title="Here's where you are" />
              <View style={styles.card}>
                <BmiGauge bmi={bmi} />
              </View>
              <Text variant="label" style={{ lineHeight: 21 }}>
                BMI compares weight to height. It can't tell muscle from fat, so it often reads high for people who
                lift, and health risk can start at a lower BMI for many Asian adults. Treat it as a starting point,
                not a verdict.
              </Text>
            </>
          )}

          {step === 'level' && (
            <>
              <Title kicker="EXPERIENCE" title="How long have you been lifting?" />
              {LEVELS.map((l) => (
                <ChoiceCard
                  key={l.value}
                  title={LEVEL_LABEL[l.value]}
                  subtitle={l.subtitle}
                  icon={l.icon}
                  selected={level === l.value}
                  onPress={() => setLevel(l.value)}
                />
              ))}
            </>
          )}

          {step === 'goal' && (
            <>
              <Title kicker="GOAL" title="What are you training for?" />
              {GOALS.map((g) => (
                <ChoiceCard
                  key={g.value}
                  title={GOAL_LABEL[g.value]}
                  subtitle={g.subtitle}
                  icon={g.icon}
                  selected={goal === g.value}
                  onPress={() => setGoal(g.value)}
                />
              ))}
            </>
          )}

          {step === 'days' && (
            <>
              <Title kicker="SCHEDULE" title="How many days a week can you train?" />
              <View style={styles.days}>
                {[2, 3, 4, 5, 6].map((d) => (
                  <Pressable
                    key={d}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: days === d }}
                    accessibilityLabel={`${d} days`}
                    onPress={() => setDays(d)}
                    style={[styles.day, days === d && styles.dayOn]}
                  >
                    <Text style={[styles.dayNum, days === d && { color: colors.voltInk }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
              <Text variant="label" style={{ textAlign: 'center' }}>
                {days <= 3
                  ? 'Great for busy weeks. Every session counts.'
                  : days === 4
                    ? 'The sweet spot for most lifters.'
                    : 'High frequency. Make sure you sleep and eat well to recover.'}
              </Text>
            </>
          )}

          {step === 'plan' && plan && (
            <>
              <Title kicker="YOUR PLAN" title={plan.preset.name} />
              <Text variant="label">{plan.preset.tagline}</Text>
              <View style={styles.card}>
                <View style={styles.planDays}>
                  {plan.preset.days.map((d) => (
                    <View key={d.name} style={styles.planDay}>
                      <MuscleMap targets={targetsForNames(d.exercises.map((e) => e.name))} height={52} />
                      <Text variant="caption" numberOfLines={1} style={{ fontWeight: '600' }}>
                        {d.name}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ gap: space.sm }}>
                  {plan.reasons.map((r) => (
                    <View key={r} style={styles.reason}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.volt} />
                      <Text variant="label" style={{ flex: 1, color: colors.chalk, lineHeight: 20 }}>
                        {r}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text variant="caption">
                Starting weights for every exercise are estimated from your bodyweight and experience. You can change
                any of this later in Settings.
              </Text>
            </>
          )}
        </View>
      </FadeIn>
    </Screen>
  );
}

function Title({ kicker, title }: { kicker: string; title: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="caption" style={styles.kicker}>
        {kicker}
      </Text>
      <Text variant="display" style={{ fontSize: 32, lineHeight: 36 }} accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

function Bullet({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }): ReactNode {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={18} color={colors.volt} />
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised },
  welcome: { alignItems: 'center', gap: space.lg, paddingTop: space.xxl },
  bullets: { alignSelf: 'stretch', gap: space.md, marginTop: space.md },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.md,
  },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.voltSoft,
    borderRadius: radius.md,
    padding: space.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.lg,
  },
  days: { flexDirection: 'row', gap: space.sm, justifyContent: 'center', marginVertical: space.lg },
  day: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayOn: { backgroundColor: colors.volt, borderColor: colors.volt },
  dayNum: { fontSize: 22, fontWeight: '700', color: colors.chalk },
  planDays: { flexDirection: 'row', gap: space.xs },
  planDay: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  reason: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  footer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
    backgroundColor: colors.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
