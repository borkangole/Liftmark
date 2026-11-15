import Ionicons from '@expo/vector-icons/Ionicons';
import { asc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { db } from '@/db/client';
import { addExerciseToDay } from '@/db/routines';
import { exercises, routineExercises } from '@/db/schema';
import { cleanName, muscleLabel } from '@/features/custom/custom';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { colors, radius, space } from '@/theme/tokens';

const NO_IDS: number[] = [];

/** Picks an exercise for either the workout in progress (`workoutId`) or a routine day (`dayId`). */
export default function AddExerciseScreen() {
  const params = useLocalSearchParams<{ workoutId?: string; dayId?: string }>();
  const workoutId = Number(params.workoutId);
  const dayId = params.dayId ? Number(params.dayId) : null;
  const { data } = useLiveQuery(db.select().from(exercises).orderBy(asc(exercises.name)));
  const { data: dayItems } = useLiveQuery(
    db
      .select({ exerciseId: routineExercises.exerciseId })
      .from(routineExercises)
      .where(eq(routineExercises.dayId, dayId ?? -1)),
    [dayId],
  );
  const workoutAdded = useActiveWorkout((s) => s.exerciseIdsByWorkout[workoutId] ?? NO_IDS);
  const added = dayId === null ? workoutAdded : dayItems.map((i) => i.exerciseId);
  const addExercise = useActiveWorkout((s) => s.addExercise);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.replace('_', ' ').includes(q) ||
        muscleLabel(e).toLowerCase().includes(q) ||
        e.equipment.includes(q),
    );
  }, [data, query]);

  const typed = cleanName(query);
  const exactMatch = data.some((e) => e.name.toLowerCase() === typed.toLowerCase());
  const createCustom = () =>
    router.push({
      pathname: '/exercise/new',
      params: {
        ...(typed && !exactMatch ? { name: typed } : {}),
        ...(dayId !== null ? { dayId: String(dayId) } : { workoutId: String(workoutId) }),
      },
    });

  const pick = async (id: number) => {
    if (dayId !== null) await addExerciseToDay(dayId, id);
    else addExercise(workoutId, id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Search exercises"
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, muscle or equipment"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(e) => String(e.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          typed.length >= 2 && !exactMatch ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Create custom exercise ${typed}`}
              onPress={createCustom}
              style={({ pressed }) => [styles.create, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.createIcon}>
                <Ionicons name="add" size={20} color={colors.voltInk} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.chalk }} numberOfLines={1}>
                  Create “{typed}”
                </Text>
                <Text variant="caption">Name it and pick the muscle it trains</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          <Text variant="label" style={styles.empty}>
            No exercises match “{query}”.
          </Text>
        }
        ListFooterComponent={
          <Pressable
            accessibilityRole="button"
            onPress={createCustom}
            style={({ pressed }) => [styles.footerBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.volt} />
            <Text variant="label" accent style={{ fontWeight: '700' }}>
              Create a custom exercise
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => {
          const isAdded = added.includes(item.id);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isAdded }}
              disabled={isAdded}
              onPress={() => pick(item.id)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '600', color: isAdded ? colors.muted : colors.chalk }}>{item.name}</Text>
                <Text variant="caption">
                  {muscleLabel(item)} · {item.equipment === 'other' ? 'weights' : item.equipment}
                  {item.isCustom ? ' · custom' : ''}
                </Text>
              </View>
              <Ionicons
                name={isAdded ? 'checkmark-circle' : 'add-circle-outline'}
                size={24}
                color={isAdded ? colors.muted : colors.volt}
              />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    margin: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, minHeight: 48, color: colors.chalk, fontSize: 16 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  empty: { textAlign: 'center', marginTop: space.xl },
  create: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.voltSoft,
    borderWidth: 1,
    borderColor: colors.volt,
  },
  createIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 56,
    marginTop: space.md,
  },
});
