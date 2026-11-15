import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import {
  FIX_INFO,
  fixOptions,
  startPlan,
  type ActivePlan,
  type RepRange,
  type Session,
  type StallCauseId,
} from '@/features/progression';
import { usePlateaus } from '@/stores/usePlateaus';
import { colors, radius, space } from '@/theme/tokens';

const FIX_ICON = {
  deload: 'arrow-down-circle-outline',
  rep_range: 'swap-vertical-outline',
  hold: 'pause-circle-outline',
  add_set: 'add-circle-outline',
  rest: 'timer-outline',
  frequency: 'calendar-outline',
} as const;

/** One-line description of what the fix does, using the lift's numbers. */
function fixLine(fix: ActivePlan['fix'], repRange: RepRange): string {
  switch (fix) {
    case 'deload':
      return 'One session at 90%, then climb back past your best.';
    case 'rep_range': {
      const r = repRange.min >= 6 ? '4–6' : '8–12';
      return `Train ${r} reps for a few weeks, then come back.`;
    }
    case 'hold':
      return 'Repeat your weights; fix food and recovery first.';
    case 'add_set':
      return 'One more working set each session.';
    case 'rest':
      return 'Take the full rest so later sets keep their reps.';
    case 'frequency':
      return 'Train it at least twice a week.';
  }
}

/** Pick how to break the plateau: options that match the cause, what worked for you first. */
export function FixPicker({
  exerciseId,
  cause,
  bestE1rm,
  sessionCount,
  repRange,
  lastSession,
  restSeconds,
}: {
  exerciseId: number;
  cause: StallCauseId | null;
  bestE1rm: number;
  sessionCount: number;
  repRange: RepRange;
  lastSession?: Session;
  restSeconds?: number | null;
}) {
  const episodes = usePlateaus((s) => s.episodes);
  const setPlan = usePlateaus((s) => s.setPlan);
  const options = fixOptions(cause, episodes, exerciseId);

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="caption" style={styles.label}>
        PICK A FIX
      </Text>
      {options.map((o) => (
        <Pressable
          key={o.fix}
          accessibilityRole="button"
          accessibilityLabel={`${FIX_INFO[o.fix].title}. ${fixLine(o.fix, repRange)}${o.note ? `. ${o.note}` : ''}`}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setPlan(
              startPlan(o.fix, { exerciseId, cause, bestE1rm, sessionCount, repRange, lastSession, restSeconds }),
            );
          }}
          style={({ pressed }) => [styles.option, o.recommended && styles.recommended, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name={FIX_ICON[o.fix]} size={22} color={o.recommended ? colors.volt : colors.chalk} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{FIX_INFO[o.fix].title}</Text>
              {o.recommended && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{o.note ? 'WORKED FOR YOU' : 'BEST FIT'}</Text>
                </View>
              )}
            </View>
            <Text variant="caption">{o.note ?? fixLine(o.fix, repRange)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  );
}

/** The fix in progress for a lift: what it is, how long it's been going, and a way to stop it. */
export function ActiveFixCard({
  plan,
  sessionsSince,
  name,
}: {
  plan: ActivePlan;
  sessionsSince: number;
  name: string;
}) {
  const stopPlan = usePlateaus((s) => s.stopPlan);
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(plan.startedAt)) / 86_400_000));
  const stop = () =>
    Alert.alert('Stop this fix?', `${name} goes back to normal progression.`, [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: () => stopPlan(plan.exerciseId) },
    ]);
  return (
    <View style={styles.active}>
      <View style={styles.titleRow}>
        <Ionicons name={FIX_ICON[plan.fix]} size={20} color={colors.volt} />
        <Text variant="caption" style={[styles.label, { color: colors.volt, flex: 1 }]}>
          YOUR FIX
        </Text>
        <Pressable accessibilityRole="button" onPress={stop} hitSlop={8}>
          <Text variant="label" style={{ fontWeight: '700' }}>
            Stop
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.title, { fontSize: 18 }]}>
        {FIX_INFO[plan.fix].title}
        {plan.repRange ? ` · ${plan.repRange.min}–${plan.repRange.max} reps` : ''}
        {plan.sets ? ` · ${plan.sets} sets` : ''}
      </Text>
      <Text variant="caption">
        {sessionsSince === 0
          ? 'Starts next session. Your targets already follow it.'
          : `${sessionsSince} session${sessionsSince === 1 ? '' : 's'} in · ${days} day${days === 1 ? '' : 's'}. Ends when you set a new best.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontWeight: '800', letterSpacing: 1.1 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recommended: { borderColor: colors.volt },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  title: { color: colors.chalk, fontWeight: '800' },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.voltSoft },
  tagText: { color: colors.volt, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  active: {
    gap: 6,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.volt,
  },
});
