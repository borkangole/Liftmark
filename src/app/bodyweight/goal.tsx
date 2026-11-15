import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ChoiceCard } from '@/components/onboarding/ChoiceCard';
import { Button, Screen, Stepper, Text } from '@/components/ui';
import { logBodyweight } from '@/db/bodyweight';
import { LIFESTYLE_LABEL, recommendCalories, type Lifestyle } from '@/features/bodyweight/nutrition';
import { BODY_GOAL_LABEL, targetConflict, targetRange, WEEKDAYS, type BodyGoal } from '@/features/bodyweight/trend';
import { parseNumberInput } from '@/features/logging/prefill';
import { formatNumber, formatWeight } from '@/lib/format';
import { fromDisplayWeight, toDisplayWeight } from '@/lib/units';
import { useBodyweight } from '@/hooks/useBodyweight';
import { useProfile } from '@/stores/useProfile';
import { colors, radius, space } from '@/theme/tokens';

const GOALS: { value: BodyGoal; subtitle: string; icon: 'trending-down' | 'flame-outline' | 'swap-horizontal' | 'barbell-outline' }[] = [
  { value: 'lose_weight', subtitle: 'Bring the number on the scale down', icon: 'trending-down' },
  { value: 'lose_fat', subtitle: 'Lean out slowly while keeping your muscle', icon: 'flame-outline' },
  { value: 'recomp', subtitle: 'Stay about the same weight, swap fat for muscle', icon: 'swap-horizontal' },
  { value: 'gain_muscle', subtitle: 'A lean bulk: slow, steady weight gain', icon: 'barbell-outline' },
];

/** Asked before the tracker starts: what should your weight be doing? Also sets an optional target. */
export default function BodyGoalScreen() {
  const profile = useProfile((s) => s.profile);
  const current = useProfile((s) => s.bodyGoal);
  const currentTarget = useProfile((s) => s.targetWeightKg);
  const currentDay = useProfile((s) => s.weighInDay);
  const currentLifestyle = useProfile((s) => s.lifestyle);
  const setBodyGoal = useProfile((s) => s.setBodyGoal);
  const updateWeight = useProfile((s) => s.updateWeight);
  const { entries, unit } = useBodyweight();
  const firstTime = entries.length === 0;

  const [goal, setGoal] = useState<BodyGoal | null>(current);
  // First time: suggest today, so the first weigh-in lands on the regular day.
  const [day, setDay] = useState<number>(current ? (currentDay ?? 1) : new Date().getDay());
  const [lifestyle, setLifestyle] = useState<Lifestyle>(currentLifestyle ?? 'sitting');
  const startKg = entries.at(-1)?.weightKg ?? profile?.weightKg ?? 70;
  const [today, setToday] = useState(formatNumber(toDisplayWeight(startKg, unit), 1));
  const [target, setTarget] = useState(currentTarget ? formatNumber(toDisplayWeight(currentTarget, unit), 1) : '');

  const range = goal ? targetRange(goal, profile?.level) : null;
  // Live preview: the calorie target updates as the goal and activity change.
  const preview = goal && profile ? recommendCalories({ ...profile, weightKg: startKg }, goal, lifestyle) : null;
  const perWeek = (pct: number) => formatWeight(Math.abs((pct / 100) * startKg), unit);
  const paceText = (() => {
    if (!goal || !range) return '';
    if (goal === 'recomp') return `Target pace: stay within ${perWeek(range[1])} a week either way.`;
    const [a, b] = [Math.abs(range[0]), Math.abs(range[1])].sort((x, y) => x - y);
    const verb = goal === 'gain_muscle' ? 'gain' : 'lose';
    return `Target pace: ${verb} ${perWeek(a)}–${perWeek(b)} a week (${a}–${b}% of your weight).`;
  })();

  const parseTarget = () => {
    const t = target.trim() === '' ? null : parseNumberInput(target);
    return t === null || t <= 0 ? null : fromDisplayWeight(t, unit);
  };

  const save = async () => {
    if (!goal) return;
    const t = target.trim() === '' ? null : parseNumberInput(target);
    if (t !== null && t <= 0) {
      Alert.alert('Check your target', 'Enter a target weight, or leave it empty.');
      return;
    }
    if (firstTime) {
      const w = parseNumberInput(today);
      if (w === null || w <= 0) {
        Alert.alert("Check today's weight", 'Enter your weight from this morning.');
        return;
      }
      const kg = fromDisplayWeight(w, unit);
      await logBodyweight(new Date(), kg, day);
      updateWeight(kg);
    }
    setBodyGoal(goal, t === null ? null : fromDisplayWeight(t, unit), day, lifestyle);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Button title={firstTime ? 'Start tracking' : 'Save goal'} onPress={save} disabled={!goal} style={!goal ? { opacity: 0.45 } : undefined} />
        </View>
      }
    >
      <Text variant="label" accent style={styles.kicker}>
        BODYWEIGHT
      </Text>
      <Text variant="display" style={styles.title}>
        What's your goal?
      </Text>
      <Text variant="label">Liftmark judges your weight trend against it and tells you when to adjust.</Text>

      <View style={{ gap: space.sm, marginTop: space.md }}>
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

      {range && (
        <View style={styles.pace}>
          <Text variant="label" style={{ color: colors.chalk }}>
            {paceText}
          </Text>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Text variant="caption" style={styles.label}>
          OUTSIDE THE GYM, YOU'RE…
        </Text>
        {(Object.keys(LIFESTYLE_LABEL) as Lifestyle[]).map((l) => (
          <ChoiceCard
            key={l}
            title={LIFESTYLE_LABEL[l].title}
            subtitle={LIFESTYLE_LABEL[l].subtitle}
            selected={lifestyle === l}
            onPress={() => setLifestyle(l)}
          />
        ))}
        {preview && (
          <View style={styles.preview}>
            <Text variant="caption">STARTING CALORIE TARGET</Text>
            <Text style={styles.previewValue}>
              {preview.target.toLocaleString()} kcal{' '}
              <Text variant="label">a day · {preview.macros.proteinG} g protein</Text>
            </Text>
            <Text variant="caption">
              Maintenance ≈ {preview.maintenance.toLocaleString()} kcal. Your weekly weigh-ins fine-tune it.
            </Text>
            {preview.caution && (
              <Text variant="caption" style={{ color: colors.warning }}>
                {preview.caution}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="caption" style={styles.label}>
          WEIGH-IN DAY
        </Text>
        <View style={styles.days} accessibilityRole="radiogroup" accessibilityLabel="Weigh-in day">
          {WEEKDAYS.map((name, i) => {
            const on = i === day;
            return (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityLabel={name}
                accessibilityState={{ checked: on }}
                onPress={() => setDay(i)}
                style={({ pressed }) => [styles.day, on && styles.dayOn, pressed && { opacity: 0.75 }]}
              >
                <Text variant="label" style={[styles.dayText, on && styles.dayTextOn]}>
                  {name.slice(0, 3)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption">
          Once a week, on waking, after the bathroom and before eating or drinking. Same day, same conditions, so the
          numbers compare.
        </Text>
      </View>

      {firstTime && <Stepper label={`This morning's weight (${unit})`} value={today} onChange={setToday} step={unit === 'kg' ? 0.1 : 0.2} decimal />}
      <Stepper
        label={`Target weight (${unit}), optional`}
        value={target}
        onChange={setTarget}
        step={unit === 'kg' ? 0.5 : 1}
        decimal
        placeholder="None"
        emptyStart={Math.round(toDisplayWeight(startKg, unit))}
      />
      {goal && targetConflict(goal, parseTarget(), startKg) && (
        <Text variant="caption" style={{ color: colors.warning }}>
          {targetConflict(goal, parseTarget(), startKg) === 'above'
            ? 'That target is above your current weight, but this goal is to lose. Lower it or leave it empty.'
            : 'That target is below your current weight, but this goal is to gain. Raise it or leave it empty.'}
        </Text>
      )}
      <Text variant="caption">
        These are general guidelines, not medical advice.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { fontWeight: '700', letterSpacing: 1.2, marginTop: space.md },
  title: { fontSize: 32, lineHeight: 38 },
  pace: {
    padding: space.md,
    borderRadius: 12,
    backgroundColor: colors.voltSoft,
  },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  label: { fontWeight: '700', letterSpacing: 1.1 },
  preview: { gap: 2, padding: space.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  previewValue: { color: colors.chalk, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOn: { backgroundColor: colors.volt, borderColor: colors.volt },
  dayText: { color: colors.chalk, fontWeight: '700' },
  dayTextOn: { color: colors.voltInk },
});
