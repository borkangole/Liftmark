import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { FoodValues } from '@/features/nutrition/foods';
import { colors, space } from '@/theme/tokens';

export const MACRO_COLOR = { protein: colors.volt, carbs: colors.steel, fat: colors.warning } as const;

/** Protein, carbs and fat: grams eaten against the target. */
export function MacroBars({
  eaten,
  target,
}: {
  eaten: FoodValues;
  target: { proteinG: number; carbsG: number; fatG: number } | null;
}) {
  const rows = [
    { key: 'protein' as const, label: 'Protein', g: eaten.proteinG, t: target?.proteinG },
    { key: 'carbs' as const, label: 'Carbs', g: eaten.carbsG, t: target?.carbsG },
    { key: 'fat' as const, label: 'Fat', g: eaten.fatG, t: target?.fatG },
  ];
  return (
    <View style={styles.wrap}>
      {rows.map((r) => {
        const p = r.t ? Math.min(1, r.g / r.t) : 0;
        return (
          <View
            key={r.key}
            style={styles.col}
            accessible
            accessibilityLabel={`${r.label} ${Math.round(r.g)} of ${r.t ?? 'no target'} grams`}
          >
            <Text variant="caption" style={styles.label}>
              {r.label}
            </Text>
            <Text style={styles.value}>
              {Math.round(r.g)}
              <Text variant="caption">{r.t ? ` / ${r.t} g` : ' g'}</Text>
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${p * 100}%`, backgroundColor: MACRO_COLOR[r.key] }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: space.md },
  col: { flex: 1, gap: 4 },
  label: { fontWeight: '700' },
  value: { color: colors.chalk, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
