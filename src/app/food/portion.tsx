import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Field, MacroFields, num, type MacroDraft } from '@/components/food/FoodFields';
import { FoodIcon } from '@/components/food/FoodIcon';
import { MACRO_COLOR } from '@/components/food/MacroBars';
import { glyphFor } from '@/features/nutrition/icons';
import { Button, Screen, Segmented, Stepper, Text } from '@/components/ui';
import { deleteFoodEntry, fetchEntry, logFood, resolveFood, saveCustomFood, updateFoodEntry } from '@/db/food';
import { MEAL_LABEL, MEALS, portionLabel, scale, type Food, type Meal } from '@/features/nutrition/foods';
import { totals } from '@/features/nutrition/plan';
import { parseNumberInput } from '@/features/logging/prefill';
import { todayKey, useFoodDay, useFoodTargets } from '@/hooks/useFood';
import { formatNumber } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const isWeight = (f: Pick<Food, 'serving' | 'grams'>) => Boolean(f.grams);

/** How much: pick the amount, see what it does to the day, then log it (or change a logged food). */
export default function PortionScreen() {
  const params = useLocalSearchParams<{
    key?: string;
    servings?: string;
    meal?: Meal;
    day?: string;
    entryId?: string;
  }>();
  const entryId = params.entryId ? Number(params.entryId) : null;
  const [food, setFood] = useState<Food | null>(null);
  const [day, setDay] = useState(params.day ?? todayKey());
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'snack');
  const [unit, setUnit] = useState<'servings' | 'grams'>('servings');
  const [amount, setAmount] = useState(params.servings ?? '1');
  const [missing, setMissing] = useState(false);
  // "Values not right?": the user's own numbers for one serving, and whether to keep them for next time.
  const [editing, setEditing] = useState(false);
  const [servingText, setServingText] = useState('');
  const [draft, setDraft] = useState<MacroDraft>({ kcal: '', protein: '', carbs: '', fat: '' });
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    (async () => {
      if (entryId) {
        const e = await fetchEntry(entryId);
        if (!e) return setMissing(true);
        setFood({
          key: e.foodKey ?? `e:${e.id}`,
          name: e.name,
          serving: e.serving,
          grams: e.grams ?? undefined,
          kcal: e.kcal,
          proteinG: e.proteinG,
          carbsG: e.carbsG,
          fatG: e.fatG,
          group: 'snacks',
        });
        setDay(e.day);
        setMeal(e.meal);
        setAmount(formatNumber(e.servings));
      } else if (params.key) {
        const f = await resolveFood(params.key);
        if (!f) return setMissing(true);
        setFood(f);
      }
    })();
  }, [entryId, params.key]);

  const dayEntries = useFoodDay(day);
  const { targets } = useFoodTargets();

  if (missing) {
    return (
      <Screen edges={['bottom']}>
        <Text variant="label">This food isn't available any more.</Text>
      </Screen>
    );
  }
  if (!food) return <Screen edges={['bottom']}>{null}</Screen>;

  // With edited values, the food is the user's version of it.
  const servingChanged = editing && servingText.trim() !== '' && servingText.trim() !== food.serving;
  const edited: Food | null = editing
    ? {
        ...food,
        serving: servingText.trim() || food.serving,
        grams: servingChanged ? undefined : food.grams,
        kcal: num(draft.kcal) ?? food.kcal,
        proteinG: num(draft.protein) ?? food.proteinG,
        carbsG: num(draft.carbs) ?? food.carbsG,
        fatG: num(draft.fat) ?? food.fatG,
      }
    : null;
  const current = edited ?? food;
  const typed = parseNumberInput(amount) ?? 0;
  const servings = unit === 'grams' && current.grams ? typed / current.grams : typed;
  const values = scale(current, servings);
  const editValid =
    !editing || ((num(draft.kcal) ?? 0) > 0 && [draft.protein, draft.carbs, draft.fat].every((v) => num(v) !== null));
  const others = totals(dayEntries.filter((e) => e.id !== entryId));
  const after = { kcal: others.kcal + values.kcal, proteinG: others.proteinG + values.proteinG };
  const valid = servings > 0 && servings < 100 && editValid;

  const switchUnit = (u: 'servings' | 'grams') => {
    if (!current.grams || u === unit) return;
    setAmount(formatNumber(u === 'grams' ? Math.round(servings * current.grams) : servings, 2));
    setUnit(u);
  };

  const startEditing = () => {
    setServingText(food.serving);
    setDraft({
      kcal: formatNumber(food.kcal, 1),
      protein: formatNumber(food.proteinG, 1),
      carbs: formatNumber(food.carbsG, 1),
      fat: formatNumber(food.fatG, 1),
    });
    if (unit === 'grams') switchUnit('servings');
    setEditing(true);
  };

  const save = async () => {
    if (!valid) return;
    let logged = current;
    const fromList = food.key.startsWith('b:') || food.key.startsWith('c:');
    if (edited && remember && fromList) {
      // Keep the corrected values: a built-in food gets the user's own version, their own food is updated.
      const id = await saveCustomFood(
        {
          name: edited.name,
          serving: edited.serving,
          grams: edited.grams ?? null,
          kcal: edited.kcal,
          proteinG: edited.proteinG,
          carbsG: edited.carbsG,
          fatG: edited.fatG,
          ...(food.key.startsWith('b:') ? { baseKey: food.key } : {}),
        },
        food.key.startsWith('c:') ? Number(food.key.slice(2)) : undefined,
      );
      logged = { ...edited, key: `c:${id}` };
    }
    if (entryId) {
      await updateFoodEntry(entryId, {
        servings,
        meal,
        ...(edited
          ? {
              serving: logged.serving,
              kcal: logged.kcal,
              proteinG: logged.proteinG,
              carbsG: logged.carbsG,
              fatG: logged.fatG,
              foodKey: fromList ? logged.key : null,
            }
          : {}),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
      return;
    }
    await logFood(logged, servings, meal, day);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Show what's left and what to eat next.
    router.replace({
      pathname: '/food/next',
      params: {
        day,
        meal,
        added: `${portionLabel(logged, servings)} ${logged.name}`,
        kcal: String(Math.round(values.kcal)),
        protein: String(Math.round(values.proteinG)),
      },
    });
  };

  const remove = () =>
    entryId &&
    Alert.alert('Remove this food?', food.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteFoodEntry(entryId);
          router.back();
        },
      },
    ]);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          {entryId && <Button title="Remove" variant="secondary" onPress={remove} style={{ flex: 1 }} />}
          <Button
            title={entryId ? 'Save' : `Add to ${MEAL_LABEL[meal].toLowerCase()}`}
            onPress={save}
            disabled={!valid}
            style={[{ flex: 2 }, !valid && { opacity: 0.45 }]}
          />
        </View>
      }
    >
      <Stack.Screen options={{ title: entryId ? 'Edit food' : '' }} />
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <FoodIcon glyph={glyphFor(food)} size={56} />
          <Text variant="display" style={[styles.title, { flex: 1 }]}>
            {food.name}
          </Text>
        </View>
        <Text variant="label">
          1 serving = {current.serving}
          {food.estimate ? ' · typical home-cooked estimate' : ''}
          {food.checkLabel ? ' · brands differ, check your label' : ''}
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.kcal}>{fmt(values.kcal)}</Text>
        <Text variant="label">kcal</Text>
        <View style={styles.macros}>
          <Macro label="Protein" g={values.proteinG} color={MACRO_COLOR.protein} />
          <Macro label="Carbs" g={values.carbsG} color={MACRO_COLOR.carbs} />
          <Macro label="Fat" g={values.fatG} color={MACRO_COLOR.fat} />
        </View>
      </View>

      {isWeight(current) && (
        <Segmented
          accessibilityLabel="Amount in"
          value={unit}
          onChange={switchUnit}
          options={[
            { value: 'servings', label: 'Servings' },
            { value: 'grams', label: 'Grams' },
          ]}
        />
      )}
      <Stepper
        label={unit === 'grams' ? 'Grams' : `Servings (${current.serving})`}
        value={amount}
        onChange={setAmount}
        step={unit === 'grams' ? 10 : current.grams || /cup|bowl/.test(current.serving) ? 0.5 : 1}
        decimal
      />

      <View style={{ gap: space.sm }}>
        <Text variant="caption" style={styles.label}>
          MEAL
        </Text>
        <Segmented
          accessibilityLabel="Meal"
          value={meal}
          onChange={setMeal}
          options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
        />
      </View>

      {editing ? (
        <View style={styles.editCard}>
          <Text variant="caption" style={styles.label}>
            YOUR VALUES, PER SERVING
          </Text>
          <Field label="One serving is" value={servingText} onChange={setServingText} placeholder={food.serving} />
          <MacroFields draft={draft} onChange={setDraft} />
          {(food.key.startsWith('b:') || food.key.startsWith('c:')) && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: remember }}
              onPress={() => setRemember((r) => !r)}
              style={styles.remember}
            >
              <Ionicons
                name={remember ? 'checkbox' : 'square-outline'}
                size={22}
                color={remember ? colors.volt : colors.muted}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.chalk, fontWeight: '700' }}>Use these values next time</Text>
                <Text variant="caption">
                  {food.key.startsWith('b:') ? 'Search and picks will use yours' : 'Updates it in My foods'}
                </Text>
              </View>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => setEditing(false)} hitSlop={6}>
            <Text variant="label" style={{ fontWeight: '700' }}>
              Cancel changes
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={startEditing}
          style={({ pressed }) => [styles.editRow, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="create-outline" size={18} color={colors.chalk} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.chalk, fontWeight: '700' }}>Values not right? Edit them</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      )}

      {targets && valid && (
        <View style={styles.after}>
          <Text variant="caption" style={styles.label}>
            {day === todayKey() ? 'TODAY' : 'THAT DAY'}, WITH THIS
          </Text>
          <Text style={{ color: colors.chalk, fontWeight: '700' }}>
            {after.kcal <= targets.kcal
              ? `${fmt(targets.kcal - after.kcal)} kcal left`
              : `${fmt(after.kcal - targets.kcal)} kcal over`}{' '}
            ·{' '}
            {after.proteinG >= targets.proteinG
              ? 'protein hit'
              : `${fmt(targets.proteinG - after.proteinG)} g protein to go`}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function Macro({ label, g, color }: { label: string; g: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.macroValue}>{formatNumber(g, 1)} g</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 34 },
  hero: {
    alignItems: 'center',
    paddingVertical: space.lg,
    gap: 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  kcal: { color: colors.chalk, fontSize: 44, lineHeight: 50, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: space.xl, marginTop: space.md },
  macro: { alignItems: 'center', gap: 2 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  macroValue: { color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { fontWeight: '700', letterSpacing: 1.1 },
  after: { gap: 4, padding: space.md, borderRadius: radius.md, backgroundColor: colors.voltSoft },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editCard: {
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.volt,
  },
  remember: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footer: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
});
