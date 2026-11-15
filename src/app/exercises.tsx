import Ionicons from '@expo/vector-icons/Ionicons';
import { asc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MuscleMap } from '@/components/muscles/MuscleMap';
import { Card, PressableLink, Screen, Text } from '@/components/ui';
import { db } from '@/db/client';
import { exercises, type Exercise } from '@/db/schema';
import { muscleLabel } from '@/features/custom/custom';
import { getTargets } from '@/features/muscles/targets';
import { loadTypeOf } from '@/features/progression';
import { formatRepRange } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

export default function ExercisesScreen() {
  const { data } = useLiveQuery(db.select().from(exercises).orderBy(asc(exercises.name)));
  const custom = data.filter((e) => e.isCustom);
  const library = data.filter((e) => !e.isCustom);

  return (
    <Screen edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="label" style={{ flex: 1 }}>
          {data.length} exercises · {custom.length} of your own
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create a custom exercise"
          onPress={() => router.push('/exercise/new')}
          style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}
          hitSlop={6}
        >
          <Ionicons name="add" size={18} color={colors.voltInk} />
          <Text variant="label" style={styles.newText}>
            New
          </Text>
        </Pressable>
      </View>

      {custom.length > 0 && (
        <Text variant="label" style={styles.section}>
          YOUR EXERCISES
        </Text>
      )}
      {custom.map((e) => (
        <ExerciseRow key={e.id} exercise={e} />
      ))}
      {custom.length > 0 && (
        <Text variant="label" style={styles.section}>
          LIBRARY
        </Text>
      )}
      {library.map((e) => (
        <ExerciseRow key={e.id} exercise={e} />
      ))}
    </Screen>
  );
}

function ExerciseRow({ exercise: e }: { exercise: Exercise }) {
  return (
    <PressableLink href={{ pathname: '/exercise/[id]', params: { id: String(e.id) } }} accessibilityRole="link">
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Text variant="title" numberOfLines={1} style={{ flexShrink: 1 }}>
              {e.name}
            </Text>
            {e.isCustom && (
              <View style={styles.tag}>
                <Text variant="caption" style={styles.tagText}>
                  Custom
                </Text>
              </View>
            )}
          </View>
          <Text variant="label">
            {muscleLabel(e)} · {e.equipment === 'other' ? 'weights' : e.equipment} ·{' '}
            {formatRepRange(e.repRangeMin, e.repRangeMax, loadTypeOf(e))}
          </Text>
        </View>
        <MuscleMap targets={getTargets(e.name, e.muscleGroup, e.primaryMuscle, e.targetMuscles)} height={64} />
      </Card>
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.volt,
  },
  newText: { color: colors.voltInk, fontWeight: '700' },
  section: { fontWeight: '700', letterSpacing: 1.2, marginTop: space.sm },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.voltSoft },
  tagText: { color: colors.volt, fontWeight: '700' },
});
