import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { Text } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { formatDuration } from '@/lib/format';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { colors, radius, space } from '@/theme/tokens';

/** Pinned rest countdown. Buzzes when rest is over. */
export function RestTimerBar() {
  const { restEndsAt, restDuration, addRest, clearRest } = useActiveWorkout();
  const now = useNow(250, restEndsAt !== null);
  const insets = useSafeAreaInsets();
  const remaining = restEndsAt ? restEndsAt - now : 0;

  useEffect(() => {
    if (restEndsAt && remaining <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      clearRest();
    }
  }, [restEndsAt, remaining, clearRest]);

  if (!restEndsAt || remaining <= 0) return null;

  const progress = restDuration > 0 ? Math.min(1, remaining / (restDuration * 1000)) : 0;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.md) }]} accessibilityLiveRegion="polite">
      <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      <View style={styles.row}>
        <View style={styles.left}>
          <AnimatedLiftmarkMark size={40} progress={1 - progress} continuous />
          <View>
            <Text variant="caption" style={styles.label}>
              REST
            </Text>
            <Text style={styles.time} accessibilityLabel={`Rest, ${Math.ceil(remaining / 1000)} seconds left`}>
              {formatDuration(remaining + 999)}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => addRest(30)} style={styles.chip}>
            <Text style={styles.chipText}>+30s</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={clearRest} style={[styles.chip, styles.skip]}>
            <Text style={[styles.chipText, { color: colors.voltInk }]}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
  },
  progress: { position: 'absolute', top: 0, left: 0, height: 3, backgroundColor: colors.volt },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { fontWeight: '700', letterSpacing: 1.2 },
  time: { color: colors.chalk, fontSize: 28, fontWeight: '700', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: space.sm },
  chip: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: { backgroundColor: colors.volt },
  chipText: { color: colors.chalk, fontWeight: '700' },
});
