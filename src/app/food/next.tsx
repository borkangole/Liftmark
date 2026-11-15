import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { MACRO_COLOR } from '@/components/food/MacroBars';
import { SuggestionCard } from '@/components/food/SuggestionCard';
import { Button, Screen, Text } from '@/components/ui';
import { logFood } from '@/db/food';
import { MEAL_LABEL, type Meal } from '@/features/nutrition/foods';
import { nextMealPlan, remaining } from '@/features/nutrition/plan';
import { suggestForDay, type FoodPick, type Suggestion } from '@/features/nutrition/suggest';
import { todayKey, useAllFoods, useFoodDay, useFoodTargets, useRecentFoodKeys, useTrainedOn } from '@/hooks/useFood';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Right after logging: what was added, what's left of the day, and what to eat next. */
export default function NextScreen() {
  const params = useLocalSearchParams<{ day?: string; meal?: Meal; added?: string; kcal?: string; protein?: string }>();
  const day = params.day ?? todayKey();
  const meal = params.meal ?? 'snack';
  const entries = useFoodDay(day);
  const { targets, goal, profile } = useFoodTargets();
  const { foods } = useAllFoods();
  const recentKeys = useRecentFoodKeys();
  const trained = useTrainedOn(day);
  const isToday = day === todayKey();

  const left = targets ? remaining(targets, entries) : null;
  const next = targets ? nextMealPlan(targets, entries, meal) : null;
  const suggestions = useMemo(() => {
    if (!targets || !isToday) return [];
    return suggestForDay({
      now: new Date(),
      targets,
      entries,
      foods,
      goal,
      weightKg: profile?.weightKg ?? 70,
      trainedToday: trained,
      recentKeys,
    }).filter((s) => s.id !== 'start');
  }, [targets, isToday, entries, foods, goal, profile?.weightKg, trained, recentKeys]);

  const done = () => (router.canDismiss() ? router.dismissAll() : router.back());
  const addMore = () => {
    if (router.canDismiss()) router.dismissAll();
    router.push({ pathname: '/food/add', params: { meal, day } });
  };
  const openPick = (p: FoodPick, s: Suggestion) =>
    router.push({
      pathname: '/food/portion',
      params: { key: p.food.key, servings: String(p.servings), meal: s.meal ?? next?.meal ?? 'snack', day },
    });
  const logPick = async (p: FoodPick, s: Suggestion) => {
    await logFood(p.food, p.servings, s.meal ?? next?.meal ?? 'snack', day);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const cells = left
    ? [
        { label: 'Calories', v: left.kcal, unit: 'kcal', color: colors.chalk },
        { label: 'Protein', v: left.proteinG, unit: 'g', color: MACRO_COLOR.protein },
        { label: 'Carbs', v: left.carbsG, unit: 'g', color: MACRO_COLOR.carbs },
        { label: 'Fat', v: left.fatG, unit: 'g', color: MACRO_COLOR.fat },
      ]
    : [];

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Button title="Add more" variant="secondary" onPress={addMore} style={{ flex: 1 }} />
          <Button title="Done" onPress={done} style={{ flex: 1 }} />
        </View>
      }
    >
      <View style={styles.added}>
        <Ionicons name="checkmark-circle" size={28} color={colors.volt} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.chalk, fontWeight: '800' }} numberOfLines={2}>
            Added {params.added ?? 'food'}
          </Text>
          {params.kcal && (
            <Text variant="caption">
              {fmt(Number(params.kcal))} kcal{params.protein ? ` · ${fmt(Number(params.protein))} g protein` : ''} to{' '}
              {MEAL_LABEL[meal].toLowerCase()}
            </Text>
          )}
        </View>
      </View>

      {left ? (
        <>
          <Text variant="caption" style={styles.label}>
            {isToday ? "WHAT'S LEFT TODAY" : "WHAT'S LEFT THAT DAY"}
          </Text>
          <View style={styles.grid}>
            {cells.map((c) => {
              const over = c.v < 0;
              return (
                <View key={c.label} style={styles.cell}>
                  <View style={[styles.swatch, { backgroundColor: c.color }]} />
                  <Text style={[styles.value, over && { color: colors.warning }]}>
                    {fmt(Math.abs(c.v))}
                    <Text variant="caption"> {c.unit}</Text>
                  </Text>
                  <Text variant="caption">
                    {c.label} {over ? 'over' : 'left'}
                  </Text>
                </View>
              );
            })}
          </View>

          {next && (
            <View style={styles.next}>
              <Text variant="caption" style={[styles.label, { color: colors.volt }]}>
                NEXT · {MEAL_LABEL[next.meal].toUpperCase()}
              </Text>
              <Text style={{ color: colors.chalk, fontWeight: '800', fontSize: 18 }}>
                About {fmt(next.kcal)} kcal with {fmt(next.proteinG)} g protein
              </Text>
            </View>
          )}

          <SuggestionCard suggestions={suggestions} onOpen={openPick} onLog={logPick} />
        </>
      ) : (
        <Text variant="label">Set a calorie target in the calculator to see what's left and what to eat next.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.voltSoft,
  },
  label: { fontWeight: '800', letterSpacing: 1.1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cell: {
    width: '48%',
    flexGrow: 1,
    gap: 2,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  swatch: { width: 10, height: 10, borderRadius: 3, marginBottom: 4 },
  value: { color: colors.chalk, fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  next: { gap: 4, padding: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.volt },
  footer: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
});
