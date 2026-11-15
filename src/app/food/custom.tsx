import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Field, MacroFields, num, type MacroDraft } from '@/components/food/FoodFields';
import { Button, Screen, Stepper, Text } from '@/components/ui';
import { deleteCustomFood, fetchCustomFood, saveCustomFood } from '@/db/food';
import type { Meal } from '@/features/nutrition/foods';
import { formatNumber } from '@/lib/format';
import { space } from '@/theme/tokens';

/** Your own food: a recipe you cook often, or a packaged food copied from its label. */
export default function CustomFoodScreen() {
  const params = useLocalSearchParams<{ id?: string; meal?: Meal; day?: string }>();
  const id = params.id ? Number(params.id) : undefined;
  const [name, setName] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [grams, setGrams] = useState('');
  const [draft, setDraft] = useState<MacroDraft>({ kcal: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    if (!id) return;
    fetchCustomFood(id).then((f) => {
      if (!f) return;
      setName(f.name);
      setServing(f.serving);
      setGrams(f.grams ? formatNumber(f.grams) : '');
      setDraft({
        kcal: formatNumber(f.kcal),
        protein: formatNumber(f.proteinG),
        carbs: formatNumber(f.carbsG),
        fat: formatNumber(f.fatG),
      });
    });
  }, [id]);

  const kcal = num(draft.kcal);
  const valid =
    name.trim().length > 0 &&
    serving.trim().length > 0 &&
    kcal !== null &&
    kcal > 0 &&
    [draft.protein, draft.carbs, draft.fat, grams].every((v) => num(v) !== null);

  const save = async () => {
    if (!valid) return;
    const g = num(grams);
    const newId = await saveCustomFood(
      {
        name: name.trim(),
        serving: serving.trim(),
        grams: g ? g : null,
        kcal: kcal!,
        proteinG: num(draft.protein) ?? 0,
        carbsG: num(draft.carbs) ?? 0,
        fatG: num(draft.fat) ?? 0,
      },
      id,
    );
    if (!id && params.meal && params.day) {
      // Straight on to logging it.
      router.replace({ pathname: '/food/portion', params: { key: `c:${newId}`, meal: params.meal, day: params.day } });
    } else router.back();
  };

  const remove = () =>
    id &&
    Alert.alert('Delete this food?', 'Foods you already logged with it stay in your log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomFood(id);
          router.back();
        },
      },
    ]);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={styles.footer}>
          {id && <Button title="Delete" variant="secondary" onPress={remove} style={{ flex: 1 }} />}
          <Button
            title={id ? 'Save' : 'Save food'}
            onPress={save}
            disabled={!valid}
            style={[{ flex: 2 }, !valid && { opacity: 0.45 }]}
          />
        </View>
      }
    >
      <Stack.Screen options={{ title: id ? 'Edit food' : 'New food' }} />
      <Field label="Name" value={name} onChange={setName} placeholder="e.g. Mom's chicken curry" autoFocus={!id} />
      <Field label="One serving is" value={serving} onChange={setServing} placeholder="e.g. 1 cup, 1 pack, 100 g" />
      <Stepper label="Grams in one serving, optional" value={grams} onChange={setGrams} step={10} placeholder="–" />
      <MacroFields draft={draft} onChange={setDraft} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.sm },
});
