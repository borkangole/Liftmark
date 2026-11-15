import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChoiceCard } from '@/components/onboarding/ChoiceCard';
import { CalorieBreakdown } from '@/components/progress/CalorieTarget';
import { Button, Card, Screen, Segmented, Stepper, Text } from '@/components/ui';
import { LIFESTYLE_LABEL, recommendCalories, type Lifestyle } from '@/features/bodyweight/nutrition';
import { analyzeBodyweight, BODY_GOAL_LABEL, targetConflict, type BodyGoal } from '@/features/bodyweight/trend';
import { parseNumberInput } from '@/features/logging/prefill';
import { customTargets } from '@/features/nutrition/plan';
import { useFoodTargets } from '@/hooks/useFood';
import { useLifestyle } from '@/hooks/useLifestyle';
import { formatNumber } from '@/lib/format';
import { fromDisplayWeight, toDisplayWeight } from '@/lib/units';
import { useNutrition } from '@/stores/useNutrition';
import { useProfile } from '@/stores/useProfile';
import { useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

const GOALS: {
  value: BodyGoal;
  subtitle: string;
  icon: 'trending-down' | 'flame-outline' | 'swap-horizontal' | 'barbell-outline';
}[] = [
  { value: 'lose_weight', subtitle: 'Bring the number on the scale down', icon: 'trending-down' },
  { value: 'lose_fat', subtitle: 'Lean out slowly, keep your muscle', icon: 'flame-outline' },
  { value: 'recomp', subtitle: 'Same weight, swap fat for muscle', icon: 'swap-horizontal' },
  { value: 'gain_muscle', subtitle: 'Lean bulk: slow, steady gain', icon: 'barbell-outline' },
];

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * The calorie calculator. Live: change the goal, weight, training days or activity and the target
 * updates. Uses the user's measured maintenance when there's enough logging, or their own numbers.
 */
export default function CalculatorScreen() {
  const profile = useProfile((s) => s.profile);
  const savedGoal = useProfile((s) => s.bodyGoal);
  const savedLifestyle = useProfile((s) => s.lifestyle ?? 'sitting');
  const fromSteps = useLifestyle();
  const targetWeightKg = useProfile((s) => s.targetWeightKg);
  const weighInDay = useProfile((s) => s.weighInDay ?? 1);
  const setBodyGoal = useProfile((s) => s.setBodyGoal);
  const unit = useSettings((s) => s.unit);
  const nutrition = useNutrition();
  const { measured, formulaAdvice, weighIns } = useFoodTargets();

  const [goal, setGoal] = useState<BodyGoal>(
    savedGoal ?? (profile?.goal === 'fat_loss' ? 'lose_fat' : profile?.goal === 'muscle' ? 'gain_muscle' : 'recomp'),
  );
  const [picked, setLifestyle] = useState<Lifestyle>(savedLifestyle);
  // Measured steps beat a guess: when there are enough, they decide.
  const lifestyle = fromSteps.avgSteps !== null ? fromSteps.lifestyle : picked;
  const [weight, setWeight] = useState(formatNumber(toDisplayWeight(profile?.weightKg ?? 70, unit), 1));
  const [days, setDays] = useState(profile?.daysPerWeek ?? 3);
  const [mode, setMode] = useState<'liftmark' | 'own'>(nutrition.customTarget ? 'own' : 'liftmark');
  const [basis, setBasis] = useState<'formula' | 'measured'>(
    nutrition.useMeasured && measured.ok ? 'measured' : 'formula',
  );
  const [ownKcal, setOwnKcal] = useState(String(nutrition.customTarget?.kcal ?? formulaAdvice?.target ?? 2200));
  const [ownProtein, setOwnProtein] = useState(
    String(nutrition.customTarget?.proteinG ?? formulaAdvice?.macros.proteinG ?? 140),
  );

  if (!profile) {
    return (
      <Screen edges={['bottom']}>
        <Text variant="label">Finish setting up your profile first.</Text>
      </Screen>
    );
  }

  const w = parseNumberInput(weight);
  const weightKg = w && w > 0 ? fromDisplayWeight(w, unit) : profile.weightKg;
  const stats = { ...profile, weightKg, daysPerWeek: days };
  // Read the weigh-ins against the goal being previewed, so the number matches what the Food tab will show.
  const analysis =
    weighIns.length > 0 ? analyzeBodyweight(weighIns, { goal, level: profile.level, targetKg: targetWeightKg }) : null;
  const useMeasured = basis === 'measured' && measured.ok;
  const preview = recommendCalories(
    stats,
    goal,
    lifestyle,
    useMeasured ? null : analysis,
    useMeasured && measured.ok ? measured.value.maintenance : null,
  );
  const ownK = parseNumberInput(ownKcal) ?? 0;
  const ownP = parseNumberInput(ownProtein) ?? 0;
  const own = customTargets(ownK, ownP, weightKg);
  const ownValid = ownK >= 1000 && ownK <= 6000 && ownP > 0 && ownP < 400;
  const canSave = mode === 'liftmark' || ownValid;

  const save = () => {
    if (!canSave) return;
    useProfile.setState({ profile: stats });
    const keepTarget = targetConflict(goal, targetWeightKg, weightKg) ? null : targetWeightKg;
    setBodyGoal(goal, keepTarget, weighInDay, picked);
    nutrition.setUseMeasured(basis === 'measured');
    nutrition.setCustomTarget(mode === 'own' ? { kcal: Math.round(ownK), proteinG: Math.round(ownP) } : null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Button title="Use this target" onPress={save} disabled={!canSave} style={!canSave && { opacity: 0.45 }} />
        </View>
      }
    >
      <Segmented
        accessibilityLabel="Target from"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'liftmark', label: "Liftmark's target" },
          { value: 'own', label: 'My own numbers' },
        ]}
      />

      {mode === 'own' ? (
        <>
          <Card style={{ gap: space.md }}>
            <Text variant="label">From a coach or dietitian? Enter them here.</Text>
            <Stepper label="Calories a day (kcal)" value={ownKcal} onChange={setOwnKcal} step={50} />
            <Stepper label="Protein a day (g)" value={ownProtein} onChange={setOwnProtein} step={5} />
            {ownValid ? (
              <Text variant="caption">
                Carbs {own.carbsG} g · fat {own.fatG} g
              </Text>
            ) : (
              <Text variant="caption" style={{ color: colors.warning }}>
                Enter between 1,000 and 6,000 kcal and your protein in grams.
              </Text>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card>
            <CalorieBreakdown advice={preview} compact />
          </Card>

          <View style={{ gap: space.sm }}>
            <Text variant="caption" style={styles.label}>
              GOAL
            </Text>
            {GOALS.map((g) => (
              <ChoiceCard
                key={g.value}
                title={BODY_GOAL_LABEL[g.value]}
                subtitle={g.subtitle}
                icon={g.icon}
                selected={goal === g.value}
                onPress={() => setGoal(g.value)}
              />
            ))}
          </View>

          <Stepper
            label={`Your weight (${unit})`}
            value={weight}
            onChange={setWeight}
            step={unit === 'kg' ? 0.5 : 1}
            decimal
          />

          <View style={{ gap: space.sm }}>
            <Text variant="caption" style={styles.label}>
              TRAINING DAYS A WEEK
            </Text>
            <Segmented
              accessibilityLabel="Training days a week"
              value={days}
              onChange={setDays}
              options={[2, 3, 4, 5, 6].map((d) => ({ value: d, label: String(d) }))}
            />
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="caption" style={styles.label}>
              OUTSIDE THE GYM, YOU'RE…
            </Text>
            {fromSteps.avgSteps !== null ? (
              <ChoiceCard
                title={LIFESTYLE_LABEL[lifestyle].title}
                subtitle={`From your steps: about ${fmt(fromSteps.avgSteps)} a day this week. It updates as you move more or less.`}
                selected
                onPress={() => {}}
              />
            ) : (
              (Object.keys(LIFESTYLE_LABEL) as Lifestyle[]).map((l) => (
                <ChoiceCard
                  key={l}
                  title={LIFESTYLE_LABEL[l].title}
                  subtitle={LIFESTYLE_LABEL[l].subtitle}
                  selected={lifestyle === l}
                  onPress={() => setLifestyle(l)}
                />
              ))
            )}
          </View>

          <Card style={{ gap: space.md }}>
            <Text variant="title">Your real maintenance</Text>
            {measured.ok ? (
              <>
                <Text variant="label">
                  <Text style={{ color: colors.chalk, fontWeight: '800' }}>{fmt(measured.value.maintenance)} kcal</Text>{' '}
                  measured
                  {formulaAdvice ? ` · formula ${fmt(formulaAdvice.maintenance)}` : ''}
                </Text>
                <Segmented
                  accessibilityLabel="Maintenance from"
                  value={basis}
                  onChange={setBasis}
                  options={[
                    { value: 'measured', label: 'Use measured' },
                    { value: 'formula', label: 'Use formula' },
                  ]}
                />
              </>
            ) : (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(measured.progress * 100)}%` }]} />
                </View>
                <Text variant="caption">{measured.reason}</Text>
              </>
            )}
          </Card>
          <Pressable accessibilityRole="link" onPress={() => router.push('/food/info')} style={styles.how} hitSlop={6}>
            <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
            <Text variant="label" style={{ fontWeight: '700' }}>
              How it's worked out
            </Text>
          </Pressable>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '700', letterSpacing: 1.1 },
  how: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: space.sm },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.sm, backgroundColor: colors.volt },
});
