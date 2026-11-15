import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableLink, Text } from '@/components/ui';
import type { UpNext } from '@/db/routines';
import { combineTargets, getTargets } from '@/features/muscles/targets';
import { notReadyFor, readyWhen, type PartRecovery, type RecoveryState } from '@/features/recovery/recovery';
import { useRecovery } from '@/hooks/useRecovery';
import { colors, radius, space } from '@/theme/tokens';
import { RECOVERY_SHADE, RecoveryMap } from './RecoveryMap';

const ORDER: RecoveryState[] = ['tired', 'recovering', 'ready'];
const PLURAL = new Set(['Legs', 'Shoulders', 'Arms']);
const TITLE: Record<RecoveryState, string> = { tired: 'Tired', recovering: 'Recovering', ready: 'Ready' };

/** Today's recovery at a glance: the body map, what's ready, and when the rest will be. */
export function RecoveryCard({ upNext }: { upNext: UpNext | null }) {
  const recovery = useRecovery();
  const now = new Date();

  const clash = useMemo(() => {
    if (!upNext) return [];
    const targets = combineTargets(
      upNext.day.exercises.map((e) =>
        getTargets(e.exercise.name, e.exercise.muscleGroup, e.exercise.primaryMuscle, e.exercise.targetMuscles),
      ),
    );
    return notReadyFor(targets, recovery);
  }, [upNext, recovery]);

  const groups = ORDER.map((state) => ({ state, parts: recovery.parts.filter((p) => p.state === state) })).filter(
    (g) => g.parts.length > 0,
  );

  const label = recovery.allReady
    ? 'Recovery: every muscle is ready'
    : groups.map((g) => `${TITLE[g.state]}: ${g.parts.map((p) => p.label).join(', ')}`).join('. ');

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text variant="caption" style={styles.kicker}>
          RECOVERY
        </Text>
        <Text variant="caption">Last 3 days</Text>
      </View>

      <View style={styles.body} accessible accessibilityLabel={label}>
        <RecoveryMap recovery={recovery} height={128} />
        <View style={styles.list}>
          {recovery.allReady ? (
            <>
              <Dot state="ready" />
              <Text variant="title">All ready</Text>
              <Text variant="caption">Nothing trained hard in the last 3 days.</Text>
            </>
          ) : (
            groups.map((g) => <Group key={g.state} state={g.state} parts={g.parts} now={now} />)
          )}
        </View>
      </View>

      {recovery.sleep && (
        <View style={styles.sleep}>
          <Ionicons name="moon" size={14} color={recovery.sleep.short ? RECOVERY_SHADE.recovering[1] : colors.muted} />
          <Text variant="caption" style={recovery.sleep.short && { color: colors.chalk }}>
            {recovery.sleep.short
              ? `${formatHours(recovery.sleep.avgHours)} of sleep a night lately, so recovery is running slower.`
              : `${formatHours(recovery.sleep.avgHours)} of sleep a night lately. Good for recovery.`}
          </Text>
        </View>
      )}

      {upNext && clash.length > 0 && (
        <View style={styles.clash}>
          <Ionicons name="alert-circle" size={16} color={RECOVERY_SHADE.recovering[1]} />
          <Text variant="label" style={{ flex: 1, color: colors.chalk }}>
            Up next is {upNext.day.name}, but {clash.map((p) => p.label.toLowerCase()).join(' and ')}{' '}
            {clash.length === 1 && !PLURAL.has(clash[0].label) ? 'is' : 'are'} still recovering.
          </Text>
          <PressableLink href="/routines/switch" hitSlop={8}>
            <Text variant="label" accent style={{ fontWeight: '800' }}>
              Switch ›
            </Text>
          </PressableLink>
        </View>
      )}
    </View>
  );
}

function Group({ state, parts, now }: { state: RecoveryState; parts: PartRecovery[]; now: Date }) {
  const latest = parts.reduce<Date | null>((a, p) => (p.readyAt && (!a || p.readyAt > a) ? p.readyAt : a), null);
  return (
    <View style={{ gap: 1 }}>
      <View style={styles.groupHead}>
        <Dot state={state} />
        <Text variant="caption" style={styles.groupTitle}>
          {TITLE[state].toUpperCase()}
        </Text>
      </View>
      <Text style={styles.parts} numberOfLines={2}>
        {parts.map((p) => p.label).join(' · ')}
      </Text>
      {latest && <Text variant="caption">ready {readyWhen(latest, now)}</Text>}
    </View>
  );
}

const formatHours = (h: number) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} m`;
};

function Dot({ state }: { state: RecoveryState }) {
  return <View style={[styles.dot, { backgroundColor: RECOVERY_SHADE[state][1] }]} />;
}

const styles = StyleSheet.create({
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  body: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  list: { flex: 1, gap: space.md },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: { fontWeight: '800', letterSpacing: 1 },
  parts: { fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sleep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clash: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
