import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Field, MacroFields, num, type MacroDraft } from '@/components/food/FoodFields';
import { Button, Screen, Segmented, Text } from '@/components/ui';
import { addFoodEntry } from '@/db/food';
import { MEAL_LABEL, MEALS, type Meal } from '@/features/nutrition/foods';
import { todayKey } from '@/hooks/useFood';
import { space } from '@/theme/tokens';

/** Log calories without picking a food: a restaurant meal, something from a label. */
export default function QuickAddScreen() {
  const params = useLocalSearchParams<{ meal?: Meal; day?: string }>();
  const [meal, setMeal] = useState<Meal>(params.meal ?? 'snack');
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<MacroDraft>({ kcal: '', protein: '', carbs: '', fat: '' });
  const kcal = num(draft.kcal);
  const valid = kcal !== null && kcal > 0 && [draft.protein, draft.carbs, draft.fat].every((v) => num(v) !== null);

  const save = async () => {
    if (!valid) return;
    await addFoodEntry({
      day: params.day ?? todayKey(),
      meal,
      name: name.trim() || 'Quick add',
      serving: '1 serving',
      servings: 1,
      kcal: kcal!,
      proteinG: num(draft.protein) ?? 0,
      carbsG: num(draft.carbs) ?? 0,
      fatG: num(draft.fat) ?? 0,
      foodKey: null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.replace({
      pathname: '/food/next',
      params: {
        day: params.day ?? todayKey(),
        meal,
        added: name.trim() || 'a quick add',
        kcal: String(Math.round(kcal!)),
        protein: String(Math.round(num(draft.protein) ?? 0)),
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
            onPress={save}
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
      <Field label="Name, optional" value={name} onChange={setName} placeholder="e.g. Burger meal" />
      <MacroFields draft={draft} onChange={setDraft} macrosOptional />
    </Screen>
  );
}

const styles = StyleSheet.create({ footer: { paddingHorizontal: space.lg, paddingTop: space.sm } });
