import { StyleSheet, View } from 'react-native';

import type { TrendStatus } from '@/features/progression';
import { colors, radius, space } from '@/theme/tokens';
import { Text } from './ui';

const config: Record<TrendStatus, { label: string; color: string }> = {
  progressing: { label: 'Progressing', color: colors.volt },
  stalling: { label: 'Stalling', color: colors.warning },
  regressing: { label: 'Regressing', color: colors.danger },
  insufficient_data: { label: 'Not enough data', color: colors.muted },
};

/** `slowing`: still progressing, but about to stall (the early warning). */
export function TrendBadge({ status, slowing = false }: { status: TrendStatus; slowing?: boolean }) {
  const { label, color } =
    slowing && status === 'progressing' ? { label: 'Slowing', color: colors.warning } : config[status];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text variant="caption" style={{ color, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
});
