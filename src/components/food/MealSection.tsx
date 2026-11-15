import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { glyphFor } from '@/features/nutrition/icons';
import { FoodIcon } from './FoodIcon';
import type { FoodEntry } from '@/db/food';
import { MEAL_LABEL, portionLabel, type Meal } from '@/features/nutrition/foods';
import type { MealBudget } from '@/features/nutrition/plan';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** One meal: what was eaten, its budget, and a way to add more. */
export function MealSection({
  meal,
  budget,
  entries,
  onAdd,
  onWeigh,
  onEdit,
}: {
  meal: Meal;
  budget?: MealBudget;
  entries: FoodEntry[];
  onAdd: () => void;
  /** Log by weight from a kitchen scale. */
  onWeigh?: () => void;
  onEdit: (e: FoodEntry) => void;
}) {
  const eaten = entries.reduce((s, e) => s + e.kcal * e.servings, 0);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="title" style={{ flex: 1, fontSize: 17 }}>
          {MEAL_LABEL[meal]}
        </Text>
        {entries.length > 0 ? (
          <Text style={styles.kcal}>{fmt(eaten)} kcal</Text>
        ) : budget ? (
          <Text variant="caption">~{fmt(budget.kcal)} kcal</Text>
        ) : null}
      </View>
      {entries.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          accessibilityLabel={`${e.name}, ${portionLabel(e, e.servings)}, ${fmt(e.kcal * e.servings)} calories. Edit`}
          onPress={() => onEdit(e)}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        >
          <FoodIcon glyph={glyphFor(e)} size={36} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {e.name}
            </Text>
            <Text variant="caption" numberOfLines={1}>
              {portionLabel(e, e.servings)} · P {fmt(e.proteinG * e.servings)} · C {fmt(e.carbsG * e.servings)} · F{' '}
              {fmt(e.fatG * e.servings)}
            </Text>
          </View>
          <Text style={styles.rowKcal}>{fmt(e.kcal * e.servings)}</Text>
        </Pressable>
      ))}
      <View style={styles.addRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add food to ${MEAL_LABEL[meal]}`}
          onPress={onAdd}
          style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add-circle" size={20} color={colors.volt} />
          <Text variant="label" accent style={{ fontWeight: '700' }}>
            Add food
          </Text>
        </Pressable>
        {onWeigh && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Weigh food for ${MEAL_LABEL[meal]}`}
            onPress={onWeigh}
            hitSlop={6}
            style={({ pressed }) => [styles.weigh, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="scale-outline" size={16} color={colors.chalk} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.xs,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.xs },
  kcal: { color: colors.chalk, fontWeight: '800', fontVariant: ['tabular-nums'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  name: { color: colors.chalk, fontWeight: '600' },
  rowKcal: { color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  add: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  weigh: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
