import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { VolumeBars } from '@/components/charts/VolumeBars';
import { CountUp } from '@/components/motion/CountUp';
import { FadeIn } from '@/components/motion/FadeIn';
import { BodyweightCard } from '@/components/progress/BodyweightCard';
import { ConsistencyGrid } from '@/components/progress/ConsistencyGrid';
import { LiftCard } from '@/components/progress/LiftCard';
import { PrFeed } from '@/components/progress/PrFeed';
import { RangeTabs, RANGES, type RangeWeeks } from '@/components/progress/RangeTabs';
import { StatusMeter } from '@/components/progress/StatusMeter';
import { Button, Card, Screen, Segmented, Text } from '@/components/ui';
import { HistoryView } from '@/components/history/HistoryView';
import { PlateauBroken } from '@/components/progress/PlateauBroken';
import { db } from '@/db/client';
import { loadDemoData } from '@/db/demo';
import { ACTIVITY_WEEKS } from '@/features/progress/overview';
import { useProgressOverview } from '@/hooks/useProgressOverview';
import { formatCompact } from '@/lib/format';
import { toDisplayWeight, useSettings } from '@/stores/useSettings';
import { colors, radius, space } from '@/theme/tokens';

type ProgressView = 'overview' | 'history';

export default function ProgressScreen() {
  const [view, setView] = useState<ProgressView>('overview');
  return (
    <Screen>
      <FadeIn>
        <Text variant="display">Progress</Text>
      </FadeIn>
      <Segmented
        accessibilityLabel="Progress view"
        value={view}
        onChange={setView}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'history', label: 'History' },
        ]}
      />
      {view === 'history' ? <HistoryView /> : <Overview />}
    </Screen>
  );
}

function Overview() {
  const [range, setRange] = useState<RangeWeeks>(12);
  const unit = useSettings((s) => s.unit);
  const o = useProgressOverview(range);
  const toDisplay = (kg: number) => toDisplayWeight(kg, unit);
  const others = o.lifts.filter((l) => !o.needsAttention.includes(l) && !l.trend.slowing);

  if (o.lifts.length === 0) return <EmptyProgress />;

  return (
    <>
      <FadeIn delay={40}>
        <RangeTabs value={range} onChange={setRange} />
      </FadeIn>

      {/* Hero: this week + lift status */}
      <FadeIn delay={80}>
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(198,244,50,0.18)', 'rgba(198,244,50,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="caption" style={styles.kicker}>
                THIS WEEK
              </Text>
              <View style={styles.heroValueRow}>
                <CountUp value={o.workoutsThisWeek} style={styles.heroValue} />
                <Text variant="label">workout{o.workoutsThisWeek === 1 ? '' : 's'}</Text>
              </View>
              {o.weekStreak > 0 && (
                <View style={styles.streak}>
                  <Ionicons name="flame" size={14} color={colors.volt} />
                  <Text variant="label" style={{ color: colors.chalk }}>
                    {o.weekStreak}-week streak
                  </Text>
                </View>
              )}
            </View>
            <AnimatedLiftmarkMark
              size={72}
              progress={Math.min(1, o.workoutsThisWeek / 3)}
              staggerOnMount
              celebrateOnMount={o.workoutsThisWeek >= 3}
            />
          </View>
          <StatusMeter counts={o.statusCounts} />
        </View>
      </FadeIn>

      {/* Stat tiles */}
      <FadeIn delay={140}>
        <View style={styles.tiles}>
          <Tile label="PRs" value={o.rangePrCount} accent />
          <Tile label="Sessions" value={o.rangeSessions} />
          <Tile label={`${unit} lifted`} value={toDisplay(o.rangeVolume)} format={formatCompact} />
        </View>
      </FadeIn>

      <FadeIn delay={170}>
        <BodyweightCard lifts={o.statusCounts} />
      </FadeIn>

      <PlateauBroken />

      {o.lifts.some((l) => l.trend.slowing) && (
        <FadeIn delay={190} style={styles.section}>
          <SectionHeader icon="time-outline" title="Make the next one count" color={colors.warning} />
          {o.lifts
            .filter((l) => l.trend.slowing)
            .map((lift) => (
              <LiftCard key={lift.exerciseId} lift={lift} unit={unit} detailed />
            ))}
        </FadeIn>
      )}

      {o.needsAttention.length > 0 && (
        <FadeIn delay={200} style={styles.section}>
          <SectionHeader icon="alert-circle" title="Needs attention" color={colors.warning} />
          {o.needsAttention.some((l) => l.diagnosis.causes[0]?.id === 'systemic') && (
            <View style={styles.systemic}>
              <Ionicons name="bed-outline" size={20} color={colors.warning} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.chalk, fontWeight: '800' }}>
                  {o.needsAttention.length} lifts stuck at once
                </Text>
                <Text variant="caption" style={{ lineHeight: 17 }}>
                  That’s recovery, not your programme. Take a deload week: every lift at about 90%, then build back.
                </Text>
              </View>
            </View>
          )}
          {o.needsAttention.map((lift) => (
            <LiftCard key={lift.exerciseId} lift={lift} unit={unit} detailed />
          ))}
        </FadeIn>
      )}

      <FadeIn delay={260}>
        <Card style={{ gap: space.lg }}>
          <SectionHeader icon="bar-chart" title="Weekly volume" subtitle={`${unit} lifted, last 8 weeks`} />
          <VolumeBars weeks={o.weeklyVolume} toDisplay={toDisplay} />
        </Card>
      </FadeIn>

      {others.length > 0 && (
        <FadeIn delay={320} style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <SectionHeader icon="trending-up" title="Your lifts" />
            </View>
            <Pressable accessibilityRole="link" onPress={() => router.push('/exercises')} hitSlop={8}>
              <Text variant="label" accent style={{ fontWeight: '700' }}>
                All exercises ›
              </Text>
            </Pressable>
          </View>
          {others.map((lift) => (
            <LiftCard key={lift.exerciseId} lift={lift} unit={unit} />
          ))}
        </FadeIn>
      )}

      <FadeIn delay={380}>
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <SectionHeader icon="calendar" title="Consistency" subtitle={`Last ${ACTIVITY_WEEKS} weeks`} />
            </View>
            <Pressable accessibilityRole="link" onPress={() => router.push('/year')} hitSlop={8}>
              <Text variant="label" accent style={{ fontWeight: '700' }}>
                Full year ›
              </Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="link" accessibilityHint="Opens the full year" onPress={() => router.push('/year')}>
            <ConsistencyGrid activity={o.activity} start={o.activityStart} />
          </Pressable>
        </Card>
      </FadeIn>

      {o.recentPrs.length > 0 && (
        <FadeIn delay={440}>
          <Card>
            <SectionHeader icon="trophy" title="Recent PRs" subtitle="Best estimated 1RM" />
            <PrFeed prs={o.recentPrs} unit={unit} />
          </Card>
        </FadeIn>
      )}
    </>
  );
}

function Tile({
  label,
  value,
  format,
  accent,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  accent?: boolean;
}) {
  // Three tiles share one row; on 360 dp Android phones "110.2k" would otherwise wrap.
  const narrow = useWindowDimensions().width < 380;
  return (
    <View style={styles.tile}>
      <CountUp
        value={value}
        format={format}
        numberOfLines={1}
        style={[styles.tileValue, narrow && { fontSize: 20 }, accent && { color: colors.volt }]}
      />
      <Text variant="caption" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  color = colors.chalk,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  color?: string;
}) {
  return (
    <View style={styles.sectionHeader} accessibilityRole="header">
      <Ionicons name={icon} size={18} color={color} />
      <Text variant="title" style={{ flex: 1 }}>
        {title}
      </Text>
      {subtitle && <Text variant="caption">{subtitle}</Text>}
    </View>
  );
}

function EmptyProgress() {
  const [loading, setLoading] = useState(false);
  return (
    <>
      <View style={styles.empty}>
        <AnimatedLiftmarkMark size={96} progress={1 / 3} staggerOnMount />
        <Text variant="title">Your trends live here</Text>
        <Text variant="label" style={{ textAlign: 'center' }}>
          Finish a few workouts and Liftmark will show which lifts are moving, which have stalled, and what to do next.
        </Text>
        {(__DEV__ || process.env.EXPO_PUBLIC_DEMO === '1') && (
          <Button
            title={loading ? 'Loading demo…' : 'Load demo data'}
            variant="secondary"
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              await loadDemoData(db).catch(console.error);
              setLoading(false);
            }}
          />
        )}
      </View>
      <BodyweightCard />
    </>
  );
}

const styles = StyleSheet.create({
  systemic: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(198,244,50,0.35)',
    padding: space.lg,
    gap: space.lg,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
  heroValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  heroValue: {
    color: colors.chalk,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  streak: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  tiles: { flexDirection: 'row', gap: space.md },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space.md,
    gap: 2,
  },
  tileValue: { color: colors.chalk, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  section: { gap: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxl },
});
