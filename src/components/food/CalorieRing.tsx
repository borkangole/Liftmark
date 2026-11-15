import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Calories against the target. Tap to switch between what's left and what's eaten.
 * `expected` (0–1) marks where the day should be by now, so it's easy to see if you're behind.
 */
export function CalorieRing({
  eaten,
  target,
  expected,
  size = 156,
}: {
  eaten: number;
  target: number | null;
  expected?: number | null;
  size?: number;
}) {
  const [showEaten, setShowEaten] = useState(false);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const mid = size / 2;
  const p = target ? eaten / target : 0;
  const over = target !== null && eaten > target * 1.05;
  const left = target === null ? null : target - eaten;
  const eatenView = showEaten || left === null;

  // The "should be here by now" tick on the ring.
  const tick =
    target && expected != null && expected > 0 && expected < 1
      ? (() => {
          const a = 2 * Math.PI * expected - Math.PI / 2;
          const r1 = r - stroke / 2 - 3;
          const r2 = r + stroke / 2 + 3;
          return {
            x1: mid + r1 * Math.cos(a),
            y1: mid + r1 * Math.sin(a),
            x2: mid + r2 * Math.cos(a),
            y2: mid + r2 * Math.sin(a),
          };
        })()
      : null;

  const label =
    target === null
      ? `${fmt(eaten)} calories eaten`
      : left! >= 0
        ? `${fmt(left!)} calories left of ${fmt(target)}, ${fmt(eaten)} eaten`
        : `${fmt(-left!)} calories over ${fmt(target)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Switches between calories left and calories eaten"
      onPress={() => {
        if (left === null) return;
        Haptics.selectionAsync().catch(() => {});
        setShowEaten((v) => !v);
      }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle cx={mid} cy={mid} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <Circle
            cx={mid}
            cy={mid}
            r={r}
            stroke={over ? colors.warning : colors.volt}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * Math.min(1, p)} ${c}`}
            transform={`rotate(-90 ${mid} ${mid})`}
          />
        )}
        {tick && <Line {...tick} stroke={colors.chalk} strokeWidth={3} strokeLinecap="round" />}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={[styles.value, over && !eatenView && { color: colors.warning }]}>
          {fmt(eatenView ? eaten : Math.abs(left!))}
        </Text>
        <Text variant="caption">{eatenView ? 'kcal eaten' : left! >= 0 ? 'kcal left' : 'kcal over'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { color: colors.chalk, fontSize: 32, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
});
