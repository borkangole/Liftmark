import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { TrendStatus } from '@/features/progression';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radius, space } from '@/theme/tokens';

const SEGMENTS: { key: Exclude<TrendStatus, 'insufficient_data'>; label: string; color: string }[] = [
  { key: 'progressing', label: 'Progressing', color: colors.volt },
  { key: 'stalling', label: 'Stalling', color: colors.warning },
  { key: 'regressing', label: 'Regressing', color: colors.danger },
];

/** One bar split by how many lifts are moving, stuck or slipping. Sweeps in from the left. */
export function StatusMeter({ counts }: { counts: Record<TrendStatus, number> }) {
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;
  const total = SEGMENTS.reduce((n, s) => n + counts[s.key], 0);

  useEffect(() => {
    if (reduced) {
      sweep.setValue(1);
      return;
    }
    sweep.setValue(0);
    Animated.timing(sweep, {
      toValue: 1,
      duration: 800,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [sweep, total, reduced]);

  const summary = SEGMENTS.map((s) => `${counts[s.key]} ${s.label.toLowerCase()}`).join(', ');

  return (
    <View style={{ gap: space.md }} accessible accessibilityLabel={`Lifts: ${summary}`}>
      <View style={styles.track}>
        <Animated.View
          style={[styles.fill, { width: sweep.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}
        >
          {total === 0
            ? null
            : SEGMENTS.filter((s) => counts[s.key] > 0).map((s) => (
                <View key={s.key} style={{ flex: counts[s.key], backgroundColor: s.color }} />
              ))}
        </Animated.View>
      </View>
      <View style={styles.legend}>
        {SEGMENTS.map((s) => (
          <View key={s.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text variant="caption">
              <Text variant="caption" style={{ color: colors.chalk, fontWeight: '700' }}>
                {counts[s.key]}
              </Text>{' '}
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
