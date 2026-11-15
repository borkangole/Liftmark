import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Fragment, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { MuscleMap } from '@/components/muscles/MuscleMap';
import { Card, Text } from '@/components/ui';
import {
  deleteDay,
  removeRoutineExercise,
  renameDay,
  setTargetSets,
  toggleRoutineSuperset,
  type RoutineDayDetail,
} from '@/db/routines';
import { combineTargets, getTargets } from '@/features/muscles/targets';
import { colors, radius, space } from '@/theme/tokens';
import { loadTypeOf } from '@/features/progression';
import { formatRepRange } from '@/lib/format';

interface DayEditorProps {
  day: RoutineDayDetail;
  index: number;
  isNext: boolean;
  onStart: (dayId: number) => void;
}

/** One editable day of a routine: rename, set counts, add/remove exercises, start it. */
export function DayEditor({ day, index, isNext, onStart }: DayEditorProps) {
  const [name, setName] = useState(day.name);
  const targets = combineTargets(
    day.exercises.map((e) =>
      getTargets(e.exercise.name, e.exercise.muscleGroup, e.exercise.primaryMuscle, e.exercise.targetMuscles),
    ),
  );
  useEffect(() => setName(day.name), [day.name]);

  const confirmDelete = () =>
    Alert.alert(`Delete ${day.name}?`, 'Past workouts keep their history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteDay(day.id),
      },
    ]);

  // Superset letters in day order: A, B, C…
  const letters = new Map<number, string>();
  {
    let n = 0;
    day.exercises.forEach((item, i) => {
      const next = day.exercises[i + 1];
      if (item.supersetGroup != null && next?.supersetGroup === item.supersetGroup && !letters.has(item.id)) {
        const l = String.fromCharCode(65 + (n++ % 26));
        letters.set(item.id, `${l}1`);
        letters.set(next.id, `${l}2`);
      }
    });
  }

  const link = (aId: number, bId: number) => {
    Haptics.selectionAsync().catch(() => {});
    toggleRoutineSuperset(aId, bId).catch(console.error);
  };

  const bumpSets = (id: number, sets: number) => {
    Haptics.selectionAsync().catch(() => {});
    setTargetSets(id, sets);
  };

  return (
    <Card style={[styles.card, isNext && { borderColor: colors.volt }]}>
      <View style={styles.header}>
        <View style={[styles.index, isNext && { backgroundColor: colors.volt }]}>
          <Text
            variant="caption"
            style={{
              fontWeight: '700',
              color: isNext ? colors.voltInk : colors.chalk,
            }}
          >
            {index + 1}
          </Text>
        </View>
        <TextInput
          accessibilityLabel="Day name"
          value={name}
          onChangeText={setName}
          onEndEditing={() => renameDay(day.id, name)}
          style={styles.name}
          returnKeyType="done"
          maxLength={40}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${day.name}`}
          onPress={confirmDelete}
          hitSlop={8}
          style={styles.iconBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {isNext && (
        <Text variant="caption" style={{ color: colors.volt, fontWeight: '700', letterSpacing: 1.2 }}>
          UP NEXT
        </Text>
      )}

      {day.exercises.length > 0 && (
        <View style={styles.map}>
          <MuscleMap targets={targets} height={110} />
        </View>
      )}

      {day.exercises.map((item, i) => {
        const next = day.exercises[i + 1];
        const tag = letters.get(item.id);
        const pairedWithNext = !!tag && tag.endsWith('1');
        return (
          <Fragment key={item.id}>
            <View style={[styles.row, tag && styles.rowPaired, tag?.endsWith('2') && styles.rowPairedEnd]}>
              {tag && (
                <View style={styles.ssBadge}>
                  <Text variant="caption" style={styles.ssBadgeText}>
                    {tag}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1}>{item.exercise.name}</Text>
                <Text variant="caption">
                  {formatRepRange(item.exercise.repRangeMin, item.exercise.repRangeMax, loadTypeOf(item.exercise))}
                </Text>
              </View>
              <View style={styles.sets}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Fewer sets of ${item.exercise.name}`}
                  onPress={() => bumpSets(item.id, item.targetSets - 1)}
                  style={styles.setBtn}
                >
                  <Ionicons name="remove" size={16} color={colors.chalk} />
                </Pressable>
                <Text style={styles.setCount} accessibilityLabel={`${item.targetSets} sets`}>
                  {item.targetSets}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`More sets of ${item.exercise.name}`}
                  onPress={() => bumpSets(item.id, item.targetSets + 1)}
                  style={styles.setBtn}
                >
                  <Ionicons name="add" size={16} color={colors.chalk} />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.exercise.name}`}
                onPress={() => removeRoutineExercise(item.id)}
                hitSlop={6}
                style={styles.iconBtn}
              >
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
            {next && (pairedWithNext || (!tag && !letters.has(next.id))) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  pairedWithNext
                    ? `Unlink ${item.exercise.name} and ${next.exercise.name}`
                    : `Superset ${item.exercise.name} with ${next.exercise.name}`
                }
                onPress={() => link(item.id, next.id)}
                style={({ pressed }) => [
                  styles.linkRow,
                  pairedWithNext && styles.rowPaired,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <Ionicons
                  name={pairedWithNext ? 'link' : 'link-outline'}
                  size={13}
                  color={pairedWithNext ? colors.volt : colors.muted}
                />
                <Text
                  variant="caption"
                  style={{
                    fontWeight: '700',
                    color: pairedWithNext ? colors.volt : colors.muted,
                  }}
                >
                  {pairedWithNext ? 'Superset · tap to unlink' : 'Superset with next'}
                </Text>
              </Pressable>
            )}
          </Fragment>
        );
      })}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/workout/add-exercise',
              params: { dayId: String(day.id) },
            })
          }
          style={styles.add}
        >
          <Ionicons name="add" size={18} color={colors.chalk} />
          <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
            Exercise
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Start ${day.name}`}
          disabled={day.exercises.length === 0}
          onPress={() => onStart(day.id)}
          style={[styles.start, day.exercises.length === 0 && { opacity: 0.4 }]}
        >
          <Ionicons name="play" size={14} color={colors.voltInk} />
          <Text variant="label" style={{ color: colors.voltInk, fontWeight: '700' }}>
            Start
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  index: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    color: colors.chalk,
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: space.xs,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sets: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPaired: {
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
    paddingLeft: space.sm,
  },
  rowPairedEnd: { borderTopWidth: 0 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    marginVertical: -space.sm,
  },
  ssBadge: {
    minWidth: 28,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.voltSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ssBadgeText: { color: colors.volt, fontWeight: '800' },
  setCount: {
    minWidth: 18,
    textAlign: 'center',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actions: { flexDirection: 'row', gap: space.sm },
  map: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
  },
  add: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.volt,
  },
});
