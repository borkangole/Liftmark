import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { WeekVolume } from '@/features/progress/overview';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatCompact } from '@/lib/format';
import { colors, radius, space } from '@/theme/tokens';

const HEIGHT = 120;

interface VolumeBarsProps {
  weeks: WeekVolume[];
  /** Converts stored kg to the display unit. */
  toDisplay: (kg: number) => number;
}

/** Weekly volume bars that grow in on mount. The current week is highlighted. */
export function VolumeBars({ weeks, toDisplay }: VolumeBarsProps) {
  const reduced = useReducedMotion();
  const anims = useRef(weeks.map(() => new Animated.Value(0))).current;
  const max = Math.max(1, ...weeks.map((w) => w.volume));

  useEffect(() => {
    if (reduced) {
      anims.forEach((a) => a.setValue(1));
      return;
    }
    Animated.stagger(
      60,
      anims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ),
    ).start();
  }, [anims, reduced]);

  const current = weeks[weeks.length - 1];

  return (
    <View
      accessible
      accessibilityLabel={`This week's volume ${formatCompact(toDisplay(current?.volume ?? 0))}`}
      style={{ gap: space.sm }}
    >
      <View style={styles.chart}>
        {weeks.map((w, i) => {
          const h = Math.max(4, (w.volume / max) * HEIGHT);
          const isCurrent = i === weeks.length - 1;
          return (
            <View key={w.weekStart.getTime()} style={styles.col}>
              <Animated.View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: isCurrent ? colors.volt : w.volume > 0 ? colors.steel : colors.surfaceRaised,
                    opacity: isCurrent ? 1 : w.volume > 0 ? 0.55 : 1,
                    transform: [
                      { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [h / 2, 0] }) },
                      { scaleY: anims[i] },
                    ],
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {weeks.map((w, i) => (
          <Text
            key={w.weekStart.getTime()}
            variant="caption"
            style={[styles.label, i === weeks.length - 1 && { color: colors.volt, fontWeight: '700' }]}
          >
            {i === weeks.length - 1
              ? 'Now'
              : i % 2 === 1
                ? ''
                : `${w.weekStart.getMonth() + 1}/${w.weekStart.getDate()}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { height: HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  col: { flex: 1, height: HEIGHT, justifyContent: 'flex-end' },
  bar: { borderRadius: radius.sm, width: '100%' },
  labels: { flexDirection: 'row', gap: space.sm },
  label: { flex: 1, textAlign: 'center', fontSize: 10 },
});
