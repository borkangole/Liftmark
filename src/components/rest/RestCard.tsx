import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Exercise } from '@/db/schema';
import { useRest } from '@/hooks/useRest';
import { colors, radius, space } from '@/theme/tokens';
import { RestPicker, formatRest } from './RestPicker';

const SOURCE_LABEL = {
  smart: 'Recommended',
  custom: 'Your setting',
  fixed: 'Fixed in Settings',
} as const;

/** Exercise page: how long the timer rests after each working set, why, and a way to change it. */
export function RestCard({ exercise }: { exercise: Exercise }) {
  const rest = useRest(exercise);
  if (!rest) return null;
  const autoSeconds = rest.source === 'custom' ? rest.advice.seconds : rest.seconds;
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.head}>
        <Ionicons name="timer-outline" size={18} color={colors.volt} />
        <Text variant="title" style={{ flex: 1 }}>
          Rest between sets
        </Text>
        <Text style={styles.value}>{formatRest(rest.seconds)}</Text>
      </View>
      <View style={styles.why}>
        <Text variant="caption" style={styles.source}>
          {SOURCE_LABEL[rest.source].toUpperCase()}
        </Text>
        <Text variant="label" style={{ lineHeight: 20 }}>
          {rest.source === 'custom'
            ? `You picked this. Liftmark would suggest ${formatRest(rest.advice.seconds)}: ${rest.advice.reason.charAt(0).toLowerCase()}${rest.advice.reason.slice(1)}`
            : rest.source === 'fixed'
              ? `Settings uses one rest time for everything. Per exercise, Liftmark would suggest ${formatRest(rest.advice.seconds)}.`
              : rest.advice.reason}
        </Text>
      </View>
      <RestPicker exerciseId={exercise.id} value={exercise.restSeconds} autoSeconds={autoSeconds} />
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/rest-info')}
        style={({ pressed }) => [styles.link, pressed && { opacity: 0.6 }]}
        hitSlop={6}
      >
        <Ionicons name="school-outline" size={14} color={colors.muted} />
        <Text variant="caption" style={{ fontWeight: '700' }}>
          Why these rest times?
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.volt,
    fontVariant: ['tabular-nums'],
  },
  why: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.md,
    gap: 4,
  },
  source: { fontWeight: '700', letterSpacing: 0.8 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 32,
  },
});
