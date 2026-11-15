import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Diagnosis, StallCauseId } from '@/features/progression';
import { colors, radius, space } from '@/theme/tokens';

const ICON: Record<StallCauseId, keyof typeof Ionicons.glyphMap> = {
  systemic: 'bed-outline',
  cutting: 'trending-down',
  undereating: 'restaurant-outline',
  protein: 'egg-outline',
  frequency: 'calendar-outline',
  volume: 'layers-outline',
  rest: 'timer-outline',
  adapted: 'sync-outline',
  no_food_log: 'document-text-outline',
};

const sinceLabel = (since: Date | null) => {
  if (!since) return null;
  const days = Math.floor((Date.now() - since.getTime()) / 86_400_000);
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  if (days >= 7) return '1 week';
  return `${days} days`;
};

/** Why a lift is stuck and what to do: the likely cause first, from training, food and weigh-ins together. */
export function StallDiagnosis({
  diagnosis,
  compact = false,
  children,
}: {
  diagnosis: Diagnosis;
  compact?: boolean;
  /** Shown under the causes (the fix picker). */
  children?: ReactNode;
}) {
  if (diagnosis.causes.length === 0) return null;
  const since = sinceLabel(diagnosis.since);
  const [top, ...rest] = diagnosis.causes;
  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.head}>
        <Ionicons name="search" size={16} color={colors.warning} />
        <Text variant="title" style={{ flex: 1 }}>
          Why it’s stuck
        </Text>
        {since && <Text variant="caption">stuck {since}</Text>}
      </View>

      <View style={[styles.cause, styles.top]}>
        <View style={styles.icon}>
          <Ionicons name={ICON[top.id]} size={18} color={colors.warning} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{top.title}</Text>
          <Text variant="caption" style={{ lineHeight: 17 }}>
            {top.detail}
          </Text>
          <View style={styles.fix}>
            <Ionicons name="arrow-forward" size={13} color={colors.volt} />
            <Text variant="label" style={{ color: colors.chalk, flex: 1, lineHeight: 19 }}>
              {top.fix}
            </Text>
          </View>
        </View>
      </View>

      {!compact &&
        rest.map((c) => (
          <View key={c.id} style={styles.cause}>
            <View style={styles.icon}>
              <Ionicons name={ICON[c.id]} size={16} color={colors.muted} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.title, { fontSize: 14 }]}>{c.title}</Text>
              <Text variant="caption" style={{ lineHeight: 17 }}>
                {c.detail} {c.fix}
              </Text>
            </View>
          </View>
        ))}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cause: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  top: {
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  title: { color: colors.chalk, fontWeight: '800' },
  fix: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 4 },
});
