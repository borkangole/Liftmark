import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { portionLabel, scale, servingStep } from '@/features/nutrition/foods';
import { glyphFor } from '@/features/nutrition/icons';
import { FoodIcon } from './FoodIcon';
import { MACRO_COLOR } from './MacroBars';
import type { FoodPick, Suggestion } from '@/features/nutrition/suggest';
import { colors, radius, space } from '@/theme/tokens';

const TONE = {
  good: { icon: 'checkmark-circle' as const, color: colors.volt },
  info: { icon: 'bulb-outline' as const, color: colors.volt },
  warn: { icon: 'alert-circle' as const, color: colors.warning },
};

const ROLE_LABEL = { protein: 'PROTEIN', carbs: 'CARBS', fat: 'FAT' } as const;

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Liftmark's suggestions for today. Every pick can be adjusted before it's logged: − / + changes the
 * amount right here, and tapping the food opens it to set an exact amount or fix its values.
 */
export function SuggestionCard({
  suggestions,
  onOpen,
  onLog,
}: {
  suggestions: Suggestion[];
  onOpen: (pick: FoodPick, s: Suggestion) => void;
  onLog: (pick: FoodPick, s: Suggestion) => void;
}) {
  // The user's amount per pick, if they changed it.
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  if (suggestions.length === 0) return null;

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={14} color={colors.volt} />
        <Text variant="caption" style={styles.kicker}>
          SMART PICKS
        </Text>
      </View>
      {suggestions.map((s) => {
        const tone = TONE[s.tone];
        return (
          <View
            key={s.id}
            style={{ gap: space.sm }}
            accessible={!s.picks?.length}
            accessibilityLabel={`${s.title}. ${s.body}`}
          >
            <View style={styles.titleRow}>
              <Ionicons name={tone.icon} size={18} color={tone.color} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{s.title}</Text>
                <Text variant="caption">{s.hint}</Text>
              </View>
            </View>
            {s.picks && s.picks.length > 0 && (
              <View style={{ gap: 6 }}>
                {s.picks.map((suggested) => {
                  const id = `${s.id}:${suggested.food.key}`;
                  const servings = amounts[id] ?? suggested.servings;
                  const pick: FoodPick = {
                    food: suggested.food,
                    servings,
                    values: scale(suggested.food, servings),
                    role: suggested.role,
                  };
                  const step = servingStep(pick.food);
                  const bump = (dir: 1 | -1) => {
                    const next = Math.round((servings + dir * step) / step) * step;
                    if (next < step - 1e-9) return;
                    Haptics.selectionAsync().catch(() => {});
                    setAmounts((a) => ({ ...a, [id]: Number(next.toFixed(4)) }));
                  };
                  const changed = Math.abs(servings - suggested.servings) > 1e-9;
                  return (
                    <View key={id} style={styles.pick}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${pick.food.name}: set an exact amount or edit its values`}
                        onPress={() => onOpen(pick, s)}
                        style={({ pressed }) => [styles.nameRow, pressed && { opacity: 0.6 }]}
                      >
                        <FoodIcon glyph={glyphFor(pick.food)} size={30} />
                        {suggested.role && (
                          <View style={[styles.role, { borderColor: MACRO_COLOR[suggested.role] }]}>
                            <Text style={[styles.roleText, { color: MACRO_COLOR[suggested.role] }]}>
                              {ROLE_LABEL[suggested.role]}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.pickName} numberOfLines={1}>
                          {pick.food.name}
                        </Text>
                        <Ionicons name="create-outline" size={16} color={colors.muted} />
                      </Pressable>
                      <View style={styles.controls}>
                        <View style={styles.amount}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Less ${pick.food.name}`}
                            onPress={() => bump(-1)}
                            hitSlop={4}
                            style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}
                          >
                            <Ionicons name="remove" size={18} color={colors.chalk} />
                          </Pressable>
                          <Text
                            style={[styles.amountText, changed && { color: colors.volt }]}
                            numberOfLines={1}
                            accessibilityLiveRegion="polite"
                          >
                            {portionLabel(pick.food, servings)}
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`More ${pick.food.name}`}
                            onPress={() => bump(1)}
                            hitSlop={4}
                            style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}
                          >
                            <Ionicons name="add" size={18} color={colors.chalk} />
                          </Pressable>
                        </View>
                        <View style={{ flex: 1 }} />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Log ${portionLabel(pick.food, servings)} ${pick.food.name}`}
                          onPress={() => onLog(pick, s)}
                          hitSlop={6}
                          style={({ pressed }) => [styles.log, pressed && { opacity: 0.7 }]}
                        >
                          <Ionicons name="checkmark" size={20} color={colors.voltInk} />
                        </Pressable>
                      </View>
                      <Text variant="caption" style={styles.values} numberOfLines={1}>
                        <Text variant="caption" style={{ color: colors.chalk, fontWeight: '700' }}>
                          {fmt(pick.values.kcal)} kcal
                        </Text>
                        {'  '}
                        <Text variant="caption" style={{ color: MACRO_COLOR.protein, fontWeight: '700' }}>
                          P
                        </Text>{' '}
                        {fmt(pick.values.proteinG)} g{'  '}
                        <Text variant="caption" style={{ color: MACRO_COLOR.carbs, fontWeight: '700' }}>
                          C
                        </Text>{' '}
                        {fmt(pick.values.carbsG)} g{'  '}
                        <Text variant="caption" style={{ color: MACRO_COLOR.fat, fontWeight: '700' }}>
                          F
                        </Text>{' '}
                        {fmt(pick.values.fatG)} g
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontWeight: '800', letterSpacing: 1.2, color: colors.volt },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { color: colors.chalk, fontWeight: '800', flex: 1 },
  pick: {
    gap: 6,
    padding: space.sm,
    paddingLeft: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 },
  pickName: { color: colors.chalk, fontWeight: '700', flexShrink: 1 },
  role: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  roleText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  amount: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  step: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  amountText: {
    color: colors.chalk,
    fontWeight: '700',
    minWidth: 64,
    maxWidth: 150,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  values: { fontVariant: ['tabular-nums'] },
  log: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
