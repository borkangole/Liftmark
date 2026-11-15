import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FadeIn } from '@/components/motion/FadeIn';
import { DayEditor } from '@/components/routines/DayEditor';
import { Button, Screen, Text } from '@/components/ui';
import { addDay, deleteRoutine, renameRoutine, setActiveRoutine } from '@/db/routines';
import { useRoutine, useUpNext } from '@/hooks/useRoutines';
import { startWorkout } from '@/lib/startWorkout';
import { colors, radius, space } from '@/theme/tokens';

export default function RoutineScreen() {
  const routineId = Number(useLocalSearchParams<{ id: string }>().id);
  const routine = useRoutine(routineId);
  const upNext = useUpNext();
  const [name, setName] = useState('');

  useEffect(() => {
    if (routine) setName(routine.name);
  }, [routine?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!routine) return null;

  const nextDayId = upNext?.routine.id === routine.id ? upNext.day.id : undefined;

  const confirmDelete = () =>
    Alert.alert(`Delete ${routine.name}?`, 'Your logged workouts stay in History.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRoutine(routine.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />

      <FadeIn>
        <View style={{ gap: space.sm }}>
          <TextInput
            accessibilityLabel="Routine name"
            value={name}
            onChangeText={setName}
            onEndEditing={() => renameRoutine(routine.id, name)}
            style={styles.title}
            maxLength={40}
            returnKeyType="done"
          />
          {routine.isActive ? (
            <View style={styles.activePill}>
              <Ionicons name="checkmark-circle" size={14} color={colors.voltInk} />
              <Text variant="caption" style={{ color: colors.voltInk, fontWeight: '700' }}>
                Active routine
              </Text>
            </View>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setActiveRoutine(routine.id)} style={styles.makeActive}>
              <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
                Make this my active routine
              </Text>
            </Pressable>
          )}
          <Text variant="caption">
            Liftmark rotates through these days in order. Tap a name to rename it, and use − / + to set target sets.
          </Text>
        </View>
      </FadeIn>

      {routine.days.map((day, i) => (
        <FadeIn key={day.id} delay={60 + i * 50}>
          <DayEditor day={day} index={i} isNext={day.id === nextDayId} onStart={(dayId) => startWorkout(dayId)} />
        </FadeIn>
      ))}

      <Button title="Add day" variant="secondary" onPress={() => addDay(routine.id)} />
      <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.delete}>
        <Text variant="label" style={{ color: colors.danger }}>
          Delete routine
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.chalk, fontSize: 34, fontWeight: '700', letterSpacing: -1, paddingVertical: 0 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.volt,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  makeActive: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.volt,
  },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
