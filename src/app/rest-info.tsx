import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { formatRest } from '@/components/rest/RestPicker';
import { Card, Screen, Text } from '@/components/ui';
import { recommendRest, REST_SOURCES } from '@/features/rest/rest';
import { useProfile } from '@/stores/useProfile';
import { colors, radius, space } from '@/theme/tokens';

const EXAMPLES = [
  {
    tier: 'Heavy lifts',
    who: 'Squat, deadlift, bench, overhead press, rows',
    e: {
      name: 'Barbell Back Squat',
      equipment: 'barbell',
      muscleGroup: 'quads',
      repRangeMax: 8,
    },
  },
  {
    tier: 'Other multi-joint',
    who: 'Pull-ups, pulldowns, dumbbell presses, lunges',
    e: {
      name: 'Lat Pulldown',
      equipment: 'cable',
      muscleGroup: 'back',
      repRangeMax: 10,
    },
  },
  {
    tier: 'Single-joint',
    who: 'Curls, raises, extensions, calf raises',
    e: {
      name: 'Barbell Curl',
      equipment: 'barbell',
      muscleGroup: 'biceps',
      repRangeMax: 12,
    },
  },
  {
    tier: 'Core holds',
    who: 'Plank and other timed holds',
    e: {
      name: 'Plank',
      equipment: 'bodyweight',
      muscleGroup: 'core',
      measure: 'time',
      repRangeMax: 60,
    },
  },
];

export default function RestInfoScreen() {
  const profile = useProfile((s) => s.profile);
  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: space.sm, paddingTop: space.lg }}>
        <Text variant="display" style={{ fontSize: 32 }}>
          Rest times
        </Text>
        <Text variant="label" style={{ lineHeight: 20 }}>
          Liftmark picks rest per exercise from published research, tuned to your goal and experience. The aim is
          simple: rest long enough that your next set doesn’t lose reps, and no longer.
        </Text>
      </View>

      <Card style={{ gap: space.sm }}>
        <Text variant="title">Your rest times</Text>
        {EXAMPLES.map((x) => {
          const r = recommendRest(x.e, profile);
          return (
            <View key={x.tier} style={styles.tierRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{x.tier}</Text>
                <Text variant="caption">{x.who}</Text>
              </View>
              <Text style={styles.tierValue}>{formatRest(r.seconds)}</Text>
            </View>
          );
        })}
        <Text variant="caption" style={{ lineHeight: 18 }}>
          Sets of 5 reps or fewer on multi-joint lifts get at least 3:00. Warm-ups rest up to a minute. You can change
          any exercise’s rest on its page or mid-workout.
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="title">What the research says</Text>
        <Point
          icon="trending-up"
          text="More than 60 s of rest builds slightly more muscle than shorter rest, but going past 90 s adds no clear extra growth. So small exercises stay at 90 s."
        />
        <Point
          icon="barbell-outline"
          text="For strength, trained lifters do best with more than 2 minutes on big lifts. Beginners get the same gains with 1–2 minutes."
        />
        <Point
          icon="flame-outline"
          text="Short rest doesn’t burn more fat. It just cuts the reps you can do, so Liftmark keeps the same rest whatever your goal."
        />
        <Point
          icon="swap-horizontal"
          text="Supersets save time without costing gains. Opposing muscles (press + row) keep your reps; two exercises for the same muscle lose some."
        />
      </Card>

      <Card style={{ gap: space.md }}>
        <Text variant="title">Sources</Text>
        {REST_SOURCES.map((s) => (
          <Pressable
            key={s.cite}
            accessibilityRole="link"
            onPress={() => Linking.openURL(s.url)}
            style={({ pressed }) => [styles.source, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" style={{ color: colors.chalk, fontWeight: '700' }}>
                {s.cite}
              </Text>
              <Text variant="caption" style={{ lineHeight: 18 }}>
                {s.finding}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

function Point({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointIcon}>
        <Ionicons name={icon} size={16} color={colors.volt} />
      </View>
      <Text variant="label" style={{ flex: 1, lineHeight: 20, color: colors.chalk }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tierValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.volt,
    fontVariant: ['tabular-nums'],
  },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  pointIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.voltSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: space.md,
  },
});
