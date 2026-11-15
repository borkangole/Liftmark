import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FoodIcon } from '@/components/food/FoodIcon';
import { glyphFor } from '@/features/nutrition/icons';
import { Segmented, Text } from '@/components/ui';
import { copyDay, logFood } from '@/db/food';
import {
  FOODS,
  GROUP_LABEL,
  MEAL_LABEL,
  MEALS,
  portionLabel,
  searchFoods,
  type Food,
  type FoodGroup,
  type Meal,
} from '@/features/nutrition/foods';
import { mealBudgets } from '@/features/nutrition/plan';
import { plateFor } from '@/features/nutrition/suggest';
import { shiftDay, todayKey, useAllFoods, useFoodDay, useFoodTargets, useRecentFoodKeys } from '@/hooks/useFood';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

interface Section {
  title: string;
  key: string;
  data: { food: Food; servings: number }[];
}

/** Find a food and add it: picks that fit the day first, then recent, your own, and the full list. */
export default function AddFoodScreen() {
  const params = useLocalSearchParams<{ meal?: Meal; day?: string }>();
  const day = params.day ?? todayKey();
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'snack');
  const [query, setQuery] = useState('');
  const [added, setAdded] = useState<string | null>(null);
  const { foods, custom } = useAllFoods();
  const recentKeys = useRecentFoodKeys();
  const entries = useFoodDay(day);
  const yesterday = useFoodDay(shiftDay(day, -1));
  const { targets } = useFoodTargets();
  const yesterdayMeal = yesterday.filter((e) => e.meal === meal);

  const sections: Section[] = useMemo(() => {
    const one = (food: Food) => ({ food, servings: 1 });
    if (query.trim()) {
      const hits = searchFoods(foods, query).map(one);
      return [{ title: hits.length ? `${hits.length} found` : 'No matches', key: 'results', data: hits }];
    }
    const out: Section[] = [];
    if (targets) {
      // A plate for this meal: protein, carbs and fat sized to its share of what's left today.
      const budget = mealBudgets(targets, entries).find((b) => b.meal === meal);
      if (budget && !budget.logged && budget.kcal >= 150) {
        const picks = plateFor(foods, budget, { meal, recentKeys });
        if (picks.length)
          out.push({
            title: `Fits ${MEAL_LABEL[meal].toLowerCase()} · ${fmt(budget.proteinG)} P · ${fmt(budget.carbsG)} C · ${fmt(budget.fatG)} F`,
            key: 'picks',
            data: picks,
          });
      }
    }
    const byKey = new Map(foods.map((f) => [f.key, f]));
    const recent = recentKeys
      .map((k) => byKey.get(k))
      .filter((f): f is Food => Boolean(f))
      .slice(0, 8);
    if (recent.length) out.push({ title: 'Recent', key: 'recent', data: recent.map(one) });
    if (custom.length) out.push({ title: 'My foods · hold to edit', key: 'mine', data: custom.map(one) });
    for (const g of Object.keys(GROUP_LABEL) as FoodGroup[]) {
      const list = FOODS.filter((f) => f.group === g);
      if (list.length) out.push({ title: GROUP_LABEL[g], key: g, data: list.map(one) });
    }
    return out;
  }, [query, foods, custom, recentKeys, entries, targets, meal]);

  const open = (food: Food, servings: number) =>
    router.push({ pathname: '/food/portion', params: { key: food.key, servings: String(servings), meal, day } });
  const quickLog = async (food: Food, servings: number) => {
    await logFood(food, servings, meal, day);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setAdded(food.name);
    setTimeout(() => setAdded((a) => (a === food.name ? null : a)), 1600);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.top}>
        <Segmented
          accessibilityLabel="Meal"
          value={meal}
          onChange={setMeal}
          options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
        />
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            accessibilityLabel="Search foods"
            value={query}
            onChangeText={setQuery}
            placeholder="Search: chicken, rice, adobo…"
            placeholderTextColor={colors.muted}
            style={[styles.input, Platform.OS === 'web' && ({ outlineWidth: 0 } as object)]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery('')}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <View style={styles.actions}>
          <Action
            icon="scale-outline"
            label="Weigh it"
            onPress={() => router.push({ pathname: '/food/weigh', params: { meal, day } })}
          />
          <Action
            icon="flash-outline"
            label="Quick add"
            onPress={() => router.push({ pathname: '/food/quick', params: { meal, day } })}
          />
          <Action
            icon="create-outline"
            label="New food"
            onPress={() => router.push({ pathname: '/food/custom', params: { meal, day } })}
          />
          {yesterdayMeal.length > 0 && (
            <Action
              icon="copy-outline"
              label="Yesterday's"
              onPress={async () => {
                await copyDay(shiftDay(day, -1), day, meal);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                router.back();
              }}
            />
          )}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.food.key}-${i}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => (
          <Text variant="caption" style={[styles.sectionTitle, section.key === 'picks' && { color: colors.volt }]}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item }) => <FoodRow food={item.food} servings={item.servings} onOpen={open} onLog={quickLog} />}
      />
      {added && (
        <View style={styles.toast} pointerEvents="none" accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={18} color={colors.voltInk} />
          <Text style={{ color: colors.voltInk, fontWeight: '700' }} numberOfLines={1}>
            Added {added}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={16} color={colors.chalk} />
      <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FoodRow({
  food,
  servings,
  onOpen,
  onLog,
}: {
  food: Food;
  servings: number;
  onOpen: (f: Food, s: number) => void;
  onLog: (f: Food, s: number) => void;
}) {
  const kcal = food.kcal * servings;
  const protein = food.proteinG * servings;
  return (
    <View style={styles.row}>
      <FoodIcon glyph={glyphFor(food)} size={36} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${food.name}, ${portionLabel(food, servings)}, ${fmt(kcal)} calories. Choose amount`}
        onPress={() => onOpen(food, servings)}
        onLongPress={
          food.key.startsWith('c:')
            ? () => router.push({ pathname: '/food/custom', params: { id: food.key.slice(2) } })
            : undefined
        }
        style={({ pressed }) => [{ flex: 1, gap: 2, paddingVertical: space.sm }, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.name} numberOfLines={1}>
          {food.name}
          {food.estimate ? <Text variant="caption"> · est.</Text> : null}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {portionLabel(food, servings)} · {fmt(kcal)} kcal · P {fmt(protein)} · C {fmt(food.carbsG * servings)} · F{' '}
          {fmt(food.fatG * servings)}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${food.name}`}
        onPress={() => onLog(food, servings)}
        hitSlop={6}
        style={({ pressed }) => [styles.plus, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="add" size={20} color={colors.volt} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  top: { gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.chalk, fontSize: 16, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  sectionTitle: { fontWeight: '800', letterSpacing: 1.1, marginTop: space.lg, marginBottom: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: { color: colors.chalk, fontWeight: '600' },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.volt,
  },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.volt,
  },
});
