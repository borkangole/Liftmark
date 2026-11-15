import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Field, MacroFields, num, type MacroDraft } from '@/components/food/FoodFields';
import { FoodIcon } from '@/components/food/FoodIcon';
import { MACRO_COLOR } from '@/components/food/MacroBars';
import { glyphFor } from '@/features/nutrition/icons';
import { Button, Screen, Segmented, Stepper, Text } from '@/components/ui';
import { addFoodEntry, saveCustomFood } from '@/db/food';
import { MEAL_LABEL, MEALS, searchFoods, type Food, type Meal } from '@/features/nutrition/foods';
import { remaining } from '@/features/nutrition/plan';
import { todayKey, useAllFoods, useFoodDay, useFoodTargets } from '@/hooks/useFood';
import { formatNumber } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Per-100 g values of a food whose serving has a known weight. */
const per100 = (f: Food) => {
  const k = 100 / (f.grams ?? 100);
  return { kcal: f.kcal * k, proteinG: f.proteinG * k, carbsG: f.carbsG * k, fatG: f.fatG * k };
};
const draftOf = (v: { kcal: number; proteinG: number; carbsG: number; fatG: number }): MacroDraft => ({
  kcal: formatNumber(v.kcal, 0),
  protein: formatNumber(v.proteinG, 1),
  carbs: formatNumber(v.carbsG, 1),
  fat: formatNumber(v.fatG, 1),
});

/**
 * Log exactly what the kitchen scale says: the grams, and the food's values per 100 g (picked from the
 * list or copied from the label). Liftmark does the maths and shows what's left.
 */
export default function WeighScreen() {
  const params = useLocalSearchParams<{ meal?: Meal; day?: string }>();
  const day = params.day ?? todayKey();
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'snack');
  const [name, setName] = useState('');
  const [grams, setGrams] = useState('');
  const [draft, setDraft] = useState<MacroDraft>({ kcal: '', protein: '', carbs: '', fat: '' });
  const [base, setBase] = useState<Food | null>(null);
  const [save, setSave] = useState(true);
  const { foods } = useAllFoods();
  const entries = useFoodDay(day);
  const { targets } = useFoodTargets();

  // Foods with a known weight can be prefilled per 100 g.
  const weighable = useMemo(() => foods.filter((f) => f.grams), [foods]);
  const matches = name.trim().length >= 2 && !base ? searchFoods(weighable, name).slice(0, 5) : [];

  const g = num(grams) ?? 0;
  const p = {
    kcal: num(draft.kcal) ?? 0,
    proteinG: num(draft.protein) ?? 0,
    carbsG: num(draft.carbs) ?? 0,
    fatG: num(draft.fat) ?? 0,
  };
  const values = {
    kcal: (p.kcal * g) / 100,
    proteinG: (p.proteinG * g) / 100,
    carbsG: (p.carbsG * g) / 100,
    fatG: (p.fatG * g) / 100,
  };
  // Unchanged values from a list food: log it as that food; otherwise it's a new one.
  const fromList = base && JSON.stringify(draftOf(per100(base))) === JSON.stringify(draft) ? base : null;
  const valid =
    name.trim().length > 0 &&
    g > 0 &&
    g < 5000 &&
    p.kcal > 0 &&
    [draft.protein, draft.carbs, draft.fat].every((v) => num(v) !== null);
  const left = targets && valid ? remaining(targets, [...entries, { meal, servings: 1, ...values }]) : null;

  const pick = (f: Food) => {
    setBase(f);
    setName(f.name);
    setDraft(draftOf(per100(f)));
    setSave(false);
  };

  const submit = async () => {
    if (!valid) return;
    let key: string | null = fromList?.key ?? null;
    if (!fromList && save) {
      const id = await saveCustomFood({ name: name.trim(), serving: '100 g', grams: 100, ...p });
      key = `c:${id}`;
    }
    // Stored per 100 g, so the log reads "185 g" and can be edited by weight later.
    await addFoodEntry({
      day,
      meal,
      name: name.trim(),
      serving: '100 g',
      grams: 100,
      servings: g / 100,
      ...p,
      foodKey: key,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({
      pathname: '/food/next',
      params: {
        day,
        meal,
        added: `${fmt(g)} g ${name.trim()}`,
        kcal: String(Math.round(values.kcal)),
        protein: String(Math.round(values.proteinG)),
      },
    });
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          <Button
            title={`Add to ${MEAL_LABEL[meal].toLowerCase()}`}
            onPress={submit}
            disabled={!valid}
            style={!valid && { opacity: 0.45 }}
          />
        </View>
      }
    >
      <Segmented
        accessibilityLabel="Meal"
        value={meal}
        onChange={setMeal}
        options={MEALS.map((m) => ({ value: m, label: MEAL_LABEL[m] }))}
      />

      <View style={{ gap: space.xs }}>
        <Field
          label="Food"
          value={name}
          onChange={(t) => {
            setName(t);
            if (base) setBase(null);
          }}
          placeholder="e.g. chicken breast, rice, your granola"
          autoFocus
        />
        {matches.map((f) => (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityLabel={`Use ${f.name}`}
            onPress={() => pick(f)}
            style={({ pressed }) => [styles.match, pressed && { opacity: 0.7 }]}
          >
            <FoodIcon glyph={glyphFor(f)} size={28} />
            <Text style={{ color: colors.chalk, fontWeight: '600', flex: 1 }} numberOfLines={1}>
              {f.name}
            </Text>
            <Text variant="caption">{fmt(per100(f).kcal)} kcal / 100 g</Text>
          </Pressable>
        ))}
      </View>

      <Stepper label="Weight on your scale (g)" value={grams} onChange={setGrams} step={5} placeholder="0" />

      <View style={styles.result}>
        <Text style={styles.kcal}>{fmt(values.kcal)}</Text>
        <Text variant="label">kcal{g > 0 ? ` in ${fmt(g)} g` : ''}</Text>
        <View style={styles.macros}>
          {[
            ['Protein', values.proteinG, MACRO_COLOR.protein],
            ['Carbs', values.carbsG, MACRO_COLOR.carbs],
            ['Fat', values.fatG, MACRO_COLOR.fat],
          ].map(([label, v, color]) => (
            <View key={label as string} style={{ alignItems: 'center', gap: 2 }}>
              <View style={[styles.swatch, { backgroundColor: color as string }]} />
              <Text style={styles.macroValue}>{formatNumber(v as number, 1)} g</Text>
              <Text variant="caption">{label as string}</Text>
            </View>
          ))}
        </View>
      </View>

      {left && (
        <View style={styles.after}>
          <Text variant="caption" style={styles.label}>
            AFTER THIS
          </Text>
          <Text style={{ color: colors.chalk, fontWeight: '700' }}>
            {left.kcal >= 0 ? `${fmt(left.kcal)} kcal left` : `${fmt(-left.kcal)} kcal over`} ·{' '}
            {left.proteinG > 0 ? `${fmt(left.proteinG)} g protein to go` : 'protein hit'}
          </Text>
        </View>
      )}

      <View style={{ gap: space.sm }}>
        <Text variant="caption" style={styles.label}>
          VALUES PER 100 G{base ? ` · FROM ${fromList ? 'THE LIST' : 'THE LIST, EDITED'}` : ''}
        </Text>
        <MacroFields draft={draft} onChange={setDraft} per="per 100 g" />
      </View>

      {!fromList && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: save }}
          onPress={() => setSave((v) => !v)}
          style={styles.remember}
        >
          <Ionicons name={save ? 'checkbox' : 'square-outline'} size={22} color={save ? colors.volt : colors.muted} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.chalk, fontWeight: '700' }}>Save to My foods</Text>
          </View>
        </Pressable>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  result: {
    alignItems: 'center',
    paddingVertical: space.lg,
    gap: 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  kcal: { color: colors.chalk, fontSize: 44, lineHeight: 50, fontWeight: '800', fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: space.xl, marginTop: space.md },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  macroValue: { color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
  after: { gap: 4, padding: space.md, borderRadius: radius.md, backgroundColor: colors.voltSoft },
  label: { fontWeight: '700', letterSpacing: 1.1 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
