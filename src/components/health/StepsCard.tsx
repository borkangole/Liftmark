import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { dayKeyOf } from '@/features/bodyweight/trend';
import { averageSteps } from '@/features/health/health';
import { shiftDay } from '@/hooks/useFood';
import { health } from '@/lib/health';
import { useHealth } from '@/stores/useHealth';
import { colors, radius, space } from '@/theme/tokens';

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Today's steps and the last week, from the watch or phone via Apple Health / Health Connect. */
export function StepsCard() {
  const connected = useHealth((s) => s.connected);
  const on = useHealth((s) => s.share.steps);
  const steps = useHealth((s) => s.steps);
  const dismissed = useHealth((s) => s.promptDismissed);
  const dismiss = useHealth((s) => s.dismissPrompt);

  if (!health) return null;

  if (!connected) {
    if (dismissed) return null;
    return (
      <View style={styles.prompt}>
        <Ionicons name="watch-outline" size={20} color={colors.volt} />
        <Pressable style={{ flex: 1 }} onPress={() => router.push('/health')} accessibilityRole="button">
          <Text style={{ fontWeight: '700' }}>Connect your watch</Text>
          <Text variant="caption">Steps, sleep and scale weigh-ins, via {health.name}</Text>
        </Pressable>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide">
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
    );
  }
  if (!on) return null;

  const today = dayKeyOf(new Date());
  const byDay = new Map(steps.map((d) => [d.day, d.steps]));
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
  const values = week.map((d) => byDay.get(d) ?? 0);
  const max = Math.max(1, ...values);
  const avg = averageSteps(steps, today);

  return (
    <Pressable
      onPress={() => router.push('/health')}
      accessibilityRole="button"
      accessibilityLabel={`${fmt(values[6])} steps today${avg ? `, ${fmt(avg)} a day this week` : ''}`}
      style={styles.card}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" style={styles.kicker}>
          STEPS
        </Text>
        <Text style={styles.big}>{fmt(values[6])}</Text>
        <Text variant="caption">{avg ? `${fmt(avg)} a day this week` : 'Today'}</Text>
      </View>
      <View style={styles.bars}>
        {values.map((v, i) => {
          const [y, m, d] = week[i].split('-').map(Number);
          return (
            <View key={week[i]} style={styles.barCol}>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    { height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: i === 6 ? colors.volt : colors.steel },
                    i !== 6 && { opacity: 0.45 },
                  ]}
                />
              </View>
              <Text variant="caption" style={[styles.day, i === 6 && { color: colors.volt, fontWeight: '800' }]}>
                {WEEKDAY[new Date(y, m - 1, d).getDay()]}
              </Text>
            </View>
          );
        })}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  big: { color: colors.chalk, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  bars: { flexDirection: 'row', gap: 6, height: 72, alignItems: 'flex-end' },
  barCol: { alignItems: 'center', gap: 4, height: '100%' },
  track: { flex: 1, width: 10, justifyContent: 'flex-end' },
  bar: { width: 10, borderRadius: 5 },
  day: { fontSize: 10 },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    paddingLeft: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
});
