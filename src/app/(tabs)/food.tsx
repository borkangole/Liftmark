import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { CalorieRing } from '@/components/food/CalorieRing';
import { MacroBars } from '@/components/food/MacroBars';
import { MealSection } from '@/components/food/MealSection';
import { SuggestionCard } from '@/components/food/SuggestionCard';
import { WeekBars } from '@/components/food/WeekBars';
import { FadeIn } from '@/components/motion/FadeIn';
import { Button, Card, Screen, Text } from '@/components/ui';
import { copyDay, logFood, type FoodEntry } from '@/db/food';
import { MEAL_LABEL, MEALS, type Meal } from '@/features/nutrition/foods';
import { expectedShare, mealAt, mealBudgets, paceOf, totals, type Pace } from '@/features/nutrition/plan';
import { suggestForDay, weekInsight, type FoodPick, type Suggestion } from '@/features/nutrition/suggest';
import {
  shiftDay,
  todayKey,
  useAllFoods,
  useFoodDay,
  useFoodTargets,
  useFoodTotals,
  useRecentFoodKeys,
  useTrainedOn,
} from '@/hooks/useFood';
import { useNow } from '@/hooks/useNow';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

function dayTitle(day: string, today: string) {
  if (day === today) return 'Today';
  if (day === shiftDay(today, -1)) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** The food log: today's calories and macros against the target, smart picks, meals and the week. */
export default function FoodScreen() {
  const now = useNow(60_000);
  const today = todayKey();
  const [day, setDay] = useState(today);
  const isToday = day === today;
  const entries = useFoodDay(day);
  const { targets, goal, analysis, profile } = useFoodTargets();
  const recentKeys = useRecentFoodKeys();
  const { foods } = useAllFoods();
  const trained = useTrainedOn(day);
  const last7 = useFoodTotals(today, 7);
  const prev7 = useFoodTotals(shiftDay(today, -1), 7);
  const yesterday = useFoodDay(shiftDay(day, -1));

  const eaten = totals(entries);
  const budgets = targets ? mealBudgets(targets, entries) : null;
  const byMeal = useMemo(() => {
    const out: Record<Meal, FoodEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) out[e.meal].push(e);
    return out;
  }, [entries]);

  const suggestions = useMemo(
    () =>
      isToday && targets
        ? suggestForDay({
            now: new Date(now),
            targets,
            entries,
            foods,
            goal,
            weightKg: profile?.weightKg ?? 70,
            trainedToday: trained,
            recentKeys,
          })
        : [],
    [isToday, targets, entries, foods, goal, profile?.weightKg, trained, recentKeys, now],
  );

  // The week: seven days ending today for the bars, the seven before today for the verdict (today isn't over).
  const fill = (rows: typeof last7, end: string) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = shiftDay(end, i - 6);
      return rows.find((r) => r.day === d) ?? { day: d, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    });
  const weekDays = fill(last7, today);
  const insight = targets
    ? weekInsight(fill(prev7, shiftDay(today, -1)), targets, goal, analysis?.status ?? null)
    : null;

  const pace: Pace | null =
    targets && isToday && entries.length > 0 ? paceOf(eaten.kcal, targets.kcal, new Date(now)) : null;
  const nowMeal = mealAt(new Date(now));

  const openPick = (p: FoodPick, s: Suggestion) =>
    router.push({
      pathname: '/food/portion',
      params: { key: p.food.key, servings: String(p.servings), meal: s.meal ?? 'snack', day },
    });
  const logPick = async (p: FoodPick, s: Suggestion) => {
    await logFood(p.food, p.servings, s.meal ?? 'snack', day);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
  const add = (meal: Meal) => router.push({ pathname: '/food/add', params: { meal, day } });
  const edit = (e: FoodEntry) => router.push({ pathname: '/food/portion', params: { entryId: String(e.id) } });

  const copyYesterday = () =>
    Alert.alert(
      'Copy yesterday?',
      `Adds the ${yesterday.length} foods you logged yesterday to ${dayTitle(day, today).toLowerCase()}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy', onPress: () => copyDay(shiftDay(day, -1), day) },
      ],
    );

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display" style={{ flex: 1 }}>
          Food
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How the food log works"
          hitSlop={8}
          onPress={() => router.push({ pathname: '/food/info', params: { day } })}
          style={styles.navBtn}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.chalk} />
        </Pressable>
      </View>

      <View style={styles.dayNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={8}
          onPress={() => setDay(shiftDay(day, -1))}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.chalk} />
        </Pressable>
        <Text style={styles.dayLabel}>{dayTitle(day, today)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={8}
          disabled={isToday}
          onPress={() => setDay(shiftDay(day, 1))}
          style={[styles.navBtn, isToday && { opacity: 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.chalk} />
        </Pressable>
      </View>

      {!targets && (
        <FadeIn delay={20}>
          <Card style={{ gap: space.md, borderWidth: 1, borderColor: colors.volt }}>
            <Text variant="title">Set your calorie target</Text>
            <Button title="Open calorie calculator" onPress={() => router.push('/food/calculator')} />
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={40}>
        <Card style={{ gap: space.lg }}>
          <View style={styles.hero}>
            <CalorieRing
              eaten={eaten.kcal}
              target={targets?.kcal ?? null}
              expected={isToday && targets ? expectedShare(new Date(now)) : null}
            />
            <View style={{ flex: 1, gap: space.md }}>
              {pace && <PaceChip pace={pace} />}
              {targets && (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Daily goal ${fmt(targets.kcal)} calories. Change`}
                  onPress={() => router.push('/food/calculator')}
                  hitSlop={6}
                >
                  <Text variant="caption">Goal</Text>
                  <Text style={styles.goal}>
                    {fmt(targets.kcal)} <Text variant="caption">kcal ›</Text>
                  </Text>
                </Pressable>
              )}
              <View style={styles.heroButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Log food to ${MEAL_LABEL[isToday ? nowMeal : 'snack']}`}
                  onPress={() => add(isToday ? nowMeal : 'snack')}
                  style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="add" size={18} color={colors.voltInk} />
                  <Text style={{ color: colors.voltInk, fontWeight: '800' }}>Log</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Weigh food"
                  onPress={() =>
                    router.push({ pathname: '/food/weigh', params: { meal: isToday ? nowMeal : 'snack', day } })
                  }
                  style={({ pressed }) => [styles.weighBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="scale-outline" size={18} color={colors.chalk} />
                </Pressable>
              </View>
            </View>
          </View>
          <MacroBars eaten={eaten} target={targets} />
        </Card>
      </FadeIn>

      {suggestions.length > 0 && (
        <FadeIn delay={100}>
          <SuggestionCard suggestions={suggestions} onOpen={openPick} onLog={logPick} />
        </FadeIn>
      )}

      <FadeIn delay={140} style={{ gap: space.md }}>
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            budget={budgets?.find((b) => b.meal === meal)}
            entries={byMeal[meal]}
            onAdd={() => add(meal)}
            onWeigh={() => router.push({ pathname: '/food/weigh', params: { meal, day } })}
            onEdit={edit}
          />
        ))}
        {entries.length === 0 && yesterday.length > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={copyYesterday}
            style={({ pressed }) => [styles.copy, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="copy-outline" size={18} color={colors.chalk} />
            <Text style={{ fontWeight: '700', flex: 1 }}>Same as yesterday</Text>
            <Text variant="caption">{yesterday.length} foods</Text>
          </Pressable>
        )}
      </FadeIn>

      {targets && (
        <FadeIn delay={180}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`This week. ${insight?.title ?? ''}. More in the info page`}
            onPress={() => router.push({ pathname: '/food/info', params: { day } })}
            style={({ pressed }) => [styles.week, pressed && { opacity: 0.9 }]}
          >
            <Text variant="title">This week</Text>
            <WeekBars days={weekDays} target={targets.kcal} height={72} />
            {insight && (
              <View style={styles.insight}>
                <Ionicons
                  name={
                    insight.tone === 'warn'
                      ? 'alert-circle'
                      : insight.tone === 'good'
                        ? 'checkmark-circle'
                        : 'information-circle'
                  }
                  size={16}
                  color={insight.tone === 'warn' ? colors.warning : colors.volt}
                />
                <Text style={{ color: colors.chalk, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {insight.title}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </View>
            )}
          </Pressable>
        </FadeIn>
      )}
    </Screen>
  );
}

const PACE: Record<
  Pace,
  { label: string; color: string; icon: 'checkmark-circle' | 'time-outline' | 'trending-up' | 'alert-circle' | 'flag' }
> = {
  on_pace: { label: 'On pace', color: colors.volt, icon: 'checkmark-circle' },
  ahead: { label: 'Ahead of pace', color: colors.warning, icon: 'trending-up' },
  behind: { label: 'Behind pace', color: colors.steel, icon: 'time-outline' },
  over: { label: 'Over goal', color: colors.warning, icon: 'alert-circle' },
  done: { label: 'Goal reached', color: colors.volt, icon: 'flag' },
};

function PaceChip({ pace }: { pace: Pace }) {
  const p = PACE[pace];
  return (
    <View style={styles.pace} accessible accessibilityLabel={p.label}>
      <Ionicons name={p.icon} size={14} color={p.color} />
      <Text variant="caption" style={{ color: p.color, fontWeight: '800' }}>
        {p.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, marginTop: -space.sm },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dayLabel: { color: colors.chalk, fontWeight: '700', minWidth: 110, textAlign: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  goal: { color: colors.chalk, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroButtons: { flexDirection: 'row', gap: space.sm },
  logBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.volt,
  },
  weighBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pace: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  week: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  insight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
