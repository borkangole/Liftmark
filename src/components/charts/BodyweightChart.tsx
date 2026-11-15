import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

import { smoothTrend, type BodyEntry } from '@/features/bodyweight/trend';
import { axisTicks } from '@/lib/chartTicks';
import { formatNumber } from '@/lib/format';
import { toDisplayWeight, type WeightUnit } from '@/lib/units';
import { colors } from '@/theme/tokens';

interface BodyweightChartProps {
  entries: BodyEntry[];
  unit: WeightUnit;
  height: number;
  /** Only show weigh-ins from the last N days. Null = everything. */
  days?: number | null;
  targetKg?: number | null;
  /** Axis labels for the detail screen; the Progress card keeps it minimal. */
  showAxis?: boolean;
  now?: Date;
}

const AXIS_W = 34;

/** Daily weigh-ins as faint dots, the smoothed trend as a line, and the goal weight dashed. */
export function BodyweightChart({
  entries,
  unit,
  height,
  days = 56,
  targetKg,
  showAxis = false,
  now = new Date(),
}: BodyweightChartProps) {
  const [width, setWidth] = useState(0);
  // Smooth over everything so the line doesn't restart at the window edge, then crop.
  const all = smoothTrend(entries);
  const from = days === null ? -Infinity : now.getTime() - days * 86_400_000;
  const pts = all.filter((p) => p.date.getTime() >= from);

  const plotW = Math.max(0, width - (showAxis ? AXIS_W : 0));
  const values = pts.flatMap((p) => [p.weightKg, p.trendKg]).map((kg) => toDisplayWeight(kg, unit));
  const target = targetKg ? toDisplayWeight(targetKg, unit) : null;
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  // Draw the goal as a line only when it fits without squashing the data; otherwise point to it.
  const dataSpan = Math.max(1, hi - lo);
  const showTarget =
    target !== null && values.length > 0 && target > lo - dataSpan * 0.5 && target < hi + dataSpan * 0.5;
  const targetAbove = target !== null && !showTarget && target > hi;
  if (showTarget && target !== null) {
    lo = Math.min(lo, target);
    hi = Math.max(hi, target);
  }
  const pad = Math.max(0.4, (hi - lo) * 0.12);
  lo -= pad;
  hi += pad;

  // Gridlines: top, middle, bottom. Flat data collapses them to one (no duplicate React keys).
  const ticks = axisTicks(lo, hi, pad);

  const t0 = pts[0]?.date.getTime() ?? 0;
  const t1 = pts.at(-1)?.date.getTime() ?? 1;
  const x = (d: Date) => (t1 === t0 ? plotW / 2 : 6 + ((d.getTime() - t0) / (t1 - t0)) * (plotW - 12));
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (height - 12);

  const trendPath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.date).toFixed(1)} ${y(toDisplayWeight(p.trendKg, unit)).toFixed(1)}`)
    .join(' ');
  const areaPath =
    pts.length > 1
      ? `${trendPath} L${x(pts.at(-1)!.date).toFixed(1)} ${height} L${x(pts[0].date).toFixed(1)} ${height} Z`
      : '';
  const last = pts.at(-1);

  // A trend needs at least two points: with one, show why the chart isn't there yet.
  if (pts.length < 2) {
    const none = all.length === 0;
    return (
      <View style={[styles.empty, { height }]} accessibilityRole="text">
        <Text variant="label" style={styles.emptyTitle}>
          {none
            ? 'No weigh-ins yet'
            : all.length === 1
              ? 'Chart unlocks after your second weigh-in'
              : 'Not enough weigh-ins in this range'}
        </Text>
        <Text variant="caption" style={{ textAlign: 'center' }}>
          {all.length <= 1
            ? 'Weigh in again next week and your trend line appears here.'
            : 'Pick a longer range to see your trend.'}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        last
          ? `Bodyweight chart. Trend ${formatNumber(toDisplayWeight(last.trendKg, unit), 1)} ${unit}.`
          : 'Bodyweight chart, no weigh-ins yet.'
      }
    >
      {width > 0 && pts.length > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="bwArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.volt} stopOpacity={0.18} />
              <Stop offset="1" stopColor={colors.volt} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {showAxis &&
            ticks.map((v, i) => (
              <Line
                key={`grid${i}`}
                x1={0}
                x2={plotW}
                y1={y(v)}
                y2={y(v)}
                stroke={colors.border}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            ))}
          {showTarget && target !== null && (
            <>
              <Line
                x1={0}
                x2={plotW}
                y1={y(target)}
                y2={y(target)}
                stroke={colors.muted}
                strokeWidth={1.2}
                strokeDasharray="4 4"
              />
              <SvgText x={4} y={y(target) - 4} fontSize={10} fontWeight="700" fill={colors.muted}>
                GOAL
              </SvgText>
            </>
          )}
          {areaPath ? <Path d={areaPath} fill="url(#bwArea)" /> : null}
          {pts.map((p) => (
            <Circle
              key={p.date.getTime()}
              cx={x(p.date)}
              cy={y(toDisplayWeight(p.weightKg, unit))}
              r={2.2}
              fill={colors.muted}
              opacity={0.55}
            />
          ))}
          <Path
            d={trendPath}
            stroke={colors.volt}
            strokeWidth={2.6}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {last && (
            <Circle
              cx={x(last.date)}
              cy={y(toDisplayWeight(last.trendKg, unit))}
              r={4.5}
              fill={colors.volt}
              stroke={colors.surface}
              strokeWidth={2}
            />
          )}
          {target !== null && !showTarget && (
            <SvgText x={4} y={targetAbove ? 12 : height - 4} fontSize={10} fontWeight="700" fill={colors.muted}>
              {`GOAL ${formatNumber(target, 1)} ${unit} ${targetAbove ? '↑' : '↓'}`}
            </SvgText>
          )}
          {showAxis &&
            ticks.map((v, i) => (
              <SvgText
                key={`label${i}`}
                x={width - 2}
                y={y(v) + 3.5}
                fontSize={10}
                fill={colors.muted}
                textAnchor="end"
              >
                {formatNumber(v, 1)}
              </SvgText>
            ))}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 24 },
  emptyTitle: { color: colors.chalk, fontWeight: '700', textAlign: 'center' },
});
