import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { PrEvent } from '@/features/progress/overview';
import { formatNumber, formatScore } from '@/lib/format';
import type { WeightUnit } from '@/stores/useSettings';
import { colors, space } from '@/theme/tokens';

const relativeDay = (date: Date) => {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export function PrFeed({ prs, unit }: { prs: PrEvent[]; unit: WeightUnit }) {
  return (
    <View>
      {prs.map((pr, i) => (
        <View key={`${pr.exerciseId}-${pr.date.getTime()}`} style={[styles.row, i > 0 && styles.divider]}>
          <View style={styles.medal}>
            <Ionicons name="trophy" size={16} color={colors.voltInk} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontWeight: '600' }} numberOfLines={1}>
              {pr.name}
            </Text>
            <Text variant="caption">{relativeDay(pr.date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={styles.value}>{formatScore(pr.e1rm, pr.type, unit)}</Text>
            <Text variant="caption" style={{ color: colors.volt }}>
              +{formatNumber(((pr.e1rm - pr.previousBest) / pr.previousBest) * 100, 1)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  medal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { color: colors.chalk, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
