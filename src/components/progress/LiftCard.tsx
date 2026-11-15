import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts/Sparkline';
import { TrendBadge } from '@/components/TrendBadge';
import { FIX_INFO } from '@/features/progression';
import { PressableLink, Text } from '@/components/ui';
import type { LiftProgress } from '@/features/progress/overview';
import { formatNumber, formatScore, formatTarget, scoreLabel } from '@/lib/format';
import type { WeightUnit } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

const statusColor = {
  progressing: colors.volt,
  stalling: colors.warning,
  regressing: colors.danger,
  insufficient_data: colors.muted,
} as const;

interface LiftCardProps {
  lift: LiftProgress;
  unit: WeightUnit;
  /** Show the coaching line (reason + next target). */
  detailed?: boolean;
}

export function LiftCard({ lift, unit, detailed = false }: LiftCardProps) {
  const accent = statusColor[lift.trend.status];
  const changePct = lift.change === null ? null : lift.change * 100;
  const up = (changePct ?? 0) >= 0;
  // The badge is the change over the whole window; only paint it as a win when the lift is still moving,
  // so a regressing lift never shows a green arrow next to its red status.
  const deltaTone = !up ? colors.danger : lift.trend.status === 'progressing' ? colors.volt : colors.muted;
  const deltaBg = !up ? colors.dangerSoft : lift.trend.status === 'progressing' ? colors.voltSoft : colors.ink;

  return (
    <PressableLink
      href={{ pathname: '/exercise/[id]', params: { id: String(lift.exerciseId) } }}
      accessibilityRole="link"
      accessibilityLabel={`${lift.name}, ${lift.trend.status.replace('_', ' ')}, ${scoreLabel(lift.type).toLowerCase()} ${formatScore(lift.latestE1rm, lift.type, unit)}`}
      style={({ pressed }) => [styles.card, detailed && { borderColor: accent }, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.top}>
        <View style={{ flex: 1, gap: space.xs }}>
          <Text variant="title" numberOfLines={1}>
            {lift.name}
          </Text>
          <TrendBadge status={lift.trend.status} slowing={lift.trend.slowing} />
        </View>
        <Sparkline values={lift.series} width={96} height={44} color={accent} />
      </View>

      <View style={styles.stats}>
        <View>
          <Text variant="caption">
            {scoreLabel(lift.type).toUpperCase()}
            {lift.type === 'bodyweight' ? ' · INCL. BW' : ''}
          </Text>
          <Text style={styles.big}>{formatScore(lift.latestE1rm, lift.type, unit)}</Text>
        </View>
        {changePct !== null && (
          <View style={[styles.delta, { backgroundColor: deltaBg }]}>
            <Ionicons name={up ? 'arrow-up' : 'arrow-down'} size={12} color={deltaTone} />
            <Text variant="caption" style={{ color: deltaTone, fontWeight: '700' }}>
              {formatNumber(Math.abs(changePct), 1)}%
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        <Text variant="caption">{lift.sessionCount} sessions</Text>
      </View>

      {detailed && (
        <View style={styles.coach}>
          <Text variant="label">{lift.trend.reason}</Text>
          {lift.plan && (
            <View style={styles.next}>
              <Ionicons name="construct-outline" size={14} color={colors.volt} />
              <Text variant="label" style={{ color: colors.chalk, flex: 1 }}>
                Your fix: {FIX_INFO[lift.plan.fix].title.toLowerCase()}
              </Text>
            </View>
          )}
          {!lift.plan && lift.diagnosis.causes[0] && lift.diagnosis.causes[0].id !== 'no_food_log' && (
            <View style={styles.next}>
              <Ionicons name="search" size={14} color={colors.warning} />
              <Text variant="label" style={{ color: colors.chalk, flex: 1 }}>
                Likely cause: {lift.diagnosis.causes[0].title.toLowerCase()}
              </Text>
            </View>
          )}
          {lift.suggestion && (
            <View style={styles.next}>
              <Ionicons name="sparkles" size={14} color={colors.volt} />
              <Text variant="label" style={{ color: colors.chalk, flex: 1 }}>
                Next: {formatTarget(lift.suggestion, lift.type, unit)}
                {lift.suggestion.kind === 'deload' ? ' (deload)' : ''}
              </Text>
            </View>
          )}
        </View>
      )}
    </PressableLink>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stats: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  big: { color: colors.chalk, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    marginBottom: 3,
  },
  coach: {
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.md,
  },
  next: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
