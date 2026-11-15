import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Switch, View } from 'react-native';

import { FadeIn } from '@/components/motion/FadeIn';
import { Screen, Text } from '@/components/ui';
import { fetchWorkoutDays } from '@/db/history';
import {
  autoWorkoutDays,
  DINNER_TIME,
  formatClock,
  LUNCH_TIME,
  WEEKDAY_SHORT,
  type ClockTime,
  type ReminderKind,
} from '@/features/reminders/plan';
import { useFoodTotals, todayKey } from '@/hooks/useFood';
import { useLiveTables } from '@/hooks/useLiveTables';
import {
  openNotificationSettings,
  restAlertPermission,
  restAlertsSupported,
  type AlertPermission,
} from '@/lib/restAlert';
import { useProfile } from '@/stores/useProfile';
import { useReminders } from '@/stores/useReminders';
import { colors, radius, space } from '@/theme/tokens';

/** Monday first, as Date#getDay values. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const NO_WORKOUTS: Awaited<ReturnType<typeof fetchWorkoutDays>> = [];

export default function RemindersScreen() {
  const settings = useReminders((s) => s.settings);
  const { toggle, setTime, setWorkoutDays } = useReminders.getState();
  const daysPerWeek = useProfile((s) => s.profile?.daysPerWeek ?? null);
  const bodyGoal = useProfile((s) => s.bodyGoal);
  const weighInDay = useProfile((s) => s.weighInDay);
  const workouts = useLiveTables(fetchWorkoutDays, ['workouts', 'sets'], NO_WORKOUTS);
  const tracksFood = useFoodTotals(todayKey(), 14).some((d) => d.kcal > 0);
  const permission = usePermission();

  const auto = useMemo(
    () => autoWorkoutDays(workouts.map((w) => w.startedAt), daysPerWeek, new Date()),
    [workouts, daysPerWeek],
  );
  const days = settings.workoutDays ?? auto;
  const dayList = WEEK.filter((d) => days.includes(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(', ');
  const on = settings.enabled;

  const pickDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    if (next.length > 0) setWorkoutDays(next);
  };

  return (
    <Screen edges={['bottom']}>
      <FadeIn>
        <Text variant="label">
          A nudge at the right moment, never more than three a day. Everything is scheduled on your phone; nothing is
          sent anywhere.
        </Text>
      </FadeIn>

      {!restAlertsSupported ? (
        <Banner text="Reminders work in the phone app." />
      ) : permission.state !== 'granted' ? (
        <Banner
          text={
            permission.state === 'denied'
              ? 'Notifications are off for Liftmark, so none of these can reach you.'
              : 'Allow notifications so these can reach you.'
          }
          action={permission.state === 'denied' ? 'Open settings' : 'Allow'}
          onPress={permission.state === 'denied' ? openNotificationSettings : permission.ask}
        />
      ) : null}

      <FadeIn delay={60}>
        <Section title="Training">
          <Toggle
            icon="barbell-outline"
            title="Workout days"
            subtitle={`${settings.workoutDays ? '' : 'Auto · '}${dayList} at ${formatClock(settings.workoutTime)}`}
            value={on.workout}
            onChange={(v) => toggle('workout', v)}
          >
            <TimeRow value={settings.workoutTime} onChange={(m) => setTime('workoutTime', m)} />
            <View style={styles.days}>
              {WEEK.map((d) => {
                const active = days.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => pickDay(d)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={WEEKDAY_SHORT[d]}
                    style={[styles.day, active && styles.dayOn]}
                  >
                    <Text style={[styles.dayText, active && { color: colors.voltInk }]}>{WEEKDAY_SHORT[d][0]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption">
              {settings.workoutDays
                ? 'Your days. '
                : 'Picked from the days you usually train. Tap a day to choose your own. '}
              Skipped once you’ve trained that day.
            </Text>
            {settings.workoutDays && (
              <Pressable onPress={() => setWorkoutDays(null)} hitSlop={8}>
                <Text variant="label" accent style={{ fontWeight: '700' }}>
                  Use my usual days ({auto.length > 0 ? WEEK.filter((d) => auto.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(', ') : '—'})
                </Text>
              </Pressable>
            )}
          </Toggle>
          <Toggle
            icon="flame-outline"
            title="Streak saver"
            subtitle="Sunday 6:00 PM, only if the week has no workout yet"
            value={on.streak}
            onChange={(v) => toggle('streak', v)}
          />
          <Toggle
            icon="pulse-outline"
            title="Plateau heads-up"
            subtitle="The morning after a lift starts slowing down or stalls"
            value={on.plateau}
            onChange={(v) => toggle('plateau', v)}
          />
        </Section>
      </FadeIn>

      <FadeIn delay={120}>
        <Section title="Food" hint={tracksFood ? undefined : 'These start once you log food.'}>
          <Toggle
            icon="nutrition-outline"
            title="Protein check"
            subtitle={`${formatClock(settings.eveningTime)}, only when you’re short, with a food that fits`}
            value={on.protein}
            onChange={(v) => toggle('protein', v)}
          >
            <TimeRow value={settings.eveningTime} onChange={(m) => setTime('eveningTime', m)} />
          </Toggle>
          <Toggle
            icon="restaurant-outline"
            title="Meal reminders"
            subtitle={`Lunch ${formatClock(LUNCH_TIME)}, dinner ${formatClock(DINNER_TIME)}, if not logged yet`}
            value={on.meals}
            onChange={(v) => toggle('meals', v)}
          />
          <Toggle
            icon="alert-circle-outline"
            title="Over target"
            subtitle="In the evening, only when you’re 200+ kcal over"
            value={on.over}
            onChange={(v) => toggle('over', v)}
          />
        </Section>
      </FadeIn>

      <FadeIn delay={180}>
        <Section title="Body">
          <Toggle
            icon="scale-outline"
            title="Weigh-in"
            subtitle={
              bodyGoal
                ? `${WEEKDAY_SHORT[weighInDay]}days at ${formatClock(settings.weighInTime)}, skipped once logged`
                : 'Starts once you set a bodyweight goal'
            }
            value={on.weighIn}
            onChange={(v) => toggle('weighIn', v)}
          >
            {bodyGoal ? <TimeRow value={settings.weighInTime} onChange={(m) => setTime('weighInTime', m)} /> : null}
          </Toggle>
        </Section>
      </FadeIn>
    </Screen>
  );
}

function usePermission() {
  const [state, setState] = useState<AlertPermission>('granted');
  useEffect(() => {
    if (!restAlertsSupported) return;
    const check = () => restAlertPermission(false).then(setState).catch(() => {});
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  const ask = () => restAlertPermission(true).then(setState).catch(() => {});
  return { state, ask };
}

function Banner({ text, action, onPress }: { text: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="notifications-off-outline" size={18} color={colors.warning} />
      <Text style={{ flex: 1 }}>{text}</Text>
      {action && onPress && (
        <Pressable onPress={onPress} accessibilityRole="button" style={styles.bannerButton}>
          <Text style={{ color: colors.voltInk, fontWeight: '800' }}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" style={styles.sectionTitle} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      {children}
      {hint && <Text variant="caption">{hint}</Text>}
    </View>
  );
}

function Toggle({
  icon,
  title,
  subtitle,
  value,
  onChange,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: space.md }}>
      <Pressable onPress={() => onChange(!value)} style={styles.row} accessibilityRole="switch" accessibilityState={{ checked: value }}>
        <View style={[styles.icon, value && { backgroundColor: colors.voltSoft }]}>
          <Ionicons name={icon} size={18} color={value ? colors.volt : colors.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700' }}>{title}</Text>
          <Text variant="caption">{subtitle}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.volt, false: colors.surfaceRaised }}
          thumbColor={colors.chalk}
          accessibilityLabel={title}
        />
      </Pressable>
      {value && children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

function TimeRow({ value, onChange }: { value: ClockTime; onChange: (m: ClockTime) => void }) {
  return (
    <View style={styles.time}>
      <Step icon="remove" label="30 minutes earlier" onPress={() => onChange(value - 30)} />
      <Text style={styles.clock} accessibilityLiveRegion="polite">
        {formatClock(value)}
      </Text>
      <Step icon="add" label="30 minutes later" onPress={() => onChange(value + 30)} />
    </View>
  );
}

function Step({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.step, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={colors.chalk} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.lg,
  },
  sectionTitle: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extra: { marginLeft: 36 + space.md, gap: space.md },
  time: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  clock: { fontSize: 20, fontWeight: '800', minWidth: 96, textAlign: 'center', fontVariant: ['tabular-nums'] },
  step: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  days: { flexDirection: 'row', gap: 6 },
  day: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.volt },
  dayText: { fontWeight: '800', color: colors.muted },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
  },
  bannerButton: {
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.volt,
  },
});
