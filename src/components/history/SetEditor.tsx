import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Stepper, Text } from '@/components/ui';
import { deleteSet, updateSet } from '@/db/history';
import type { WorkoutSet } from '@/db/schema';
import { parseNumberInput } from '@/features/logging/prefill';
import type { LoadType } from '@/features/progression';
import { formatNumber } from '@/lib/format';
import { fromDisplayWeight, toDisplayWeight, type WeightUnit } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

interface SetEditorProps {
  set: WorkoutSet | null;
  exerciseName: string;
  /** Timed holds edit seconds only; bodyweight lifts edit the added weight. */
  type: LoadType;
  unit: WeightUnit;
  step: number;
  onClose: () => void;
}

/** Bottom sheet for fixing a past set: weight, reps, warm-up flag, or delete it. */
export function SetEditor({ set, exerciseName, type, unit, step, onClose }: SetEditorProps) {
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [warmup, setWarmup] = useState(false);

  useEffect(() => {
    if (!set) return;
    setWeight(formatNumber(toDisplayWeight(set.weight, unit), 1));
    setReps(String(set.reps));
    setWarmup(set.isWarmup);
  }, [set, unit]);

  if (!set) return null;

  const save = async () => {
    const timed = type === 'timed';
    const w = timed ? set.weight : parseNumberInput(weight);
    const r = parseNumberInput(reps);
    if (w === null || r === null || r < 1 || !Number.isInteger(r)) {
      Alert.alert(
        'Check your set',
        timed
          ? 'Enter how many seconds you held, as a whole number.'
          : 'Enter a weight (0 for bodyweight) and a whole number of reps.',
      );
      return;
    }
    await updateSet(set.id, { weight: timed ? w : fromDisplayWeight(w, unit), reps: r, isWarmup: warmup });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onClose();
  };

  const remove = () =>
    Alert.alert('Delete this set?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSet(set.id);
          onClose();
        },
      },
    ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
          <View style={styles.grabber} />
          <Text variant="caption" style={styles.kicker}>
            EDIT SET
          </Text>
          <Text variant="title">{exerciseName}</Text>

          <View style={styles.inputs}>
            {type !== 'timed' && (
              <Stepper
                label={type === 'bodyweight' ? `Added (${unit})` : `Weight (${unit})`}
                value={weight}
                onChange={setWeight}
                step={step}
                decimal
              />
            )}
            <Stepper
              label={type === 'timed' ? 'Seconds' : 'Reps'}
              value={reps}
              onChange={setReps}
              step={type === 'timed' ? 5 : 1}
            />
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: warmup }}
            onPress={() => setWarmup((w) => !w)}
            style={[styles.warmup, warmup && styles.warmupOn]}
          >
            <Text style={{ fontWeight: '700', color: warmup ? colors.chalk : colors.muted }}>Warm-up set</Text>
            <Text variant="caption">{warmup ? 'Not counted in stats' : 'Counts toward stats'}</Text>
          </Pressable>

          <Button title="Save" onPress={save} />
          <Pressable accessibilityRole="button" onPress={remove} style={styles.delete}>
            <Text variant="label" style={{ color: colors.danger }}>
              Delete set
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    padding: space.lg,
    gap: space.md,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  inputs: { flexDirection: 'row', gap: space.md },
  warmup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  warmupOn: { borderColor: colors.steel, backgroundColor: colors.surfaceRaised },
  delete: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
