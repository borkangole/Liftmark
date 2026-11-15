import { useEffect, useId, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { Text } from '@/components/ui';
import { BACK_FLAT, FRONT_FLAT, shapeState, type FlatShape, type ShapeState } from '@/features/muscles/bodyMap';
import { MUSCLE_LABEL, type Targets } from '@/features/muscles/targets';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BRAND, colors, space } from '@/theme/tokens';

const AnimatedG = Animated.createAnimatedComponent(G);

/** Flat colours, used for the legend swatches. */
const FILL: Record<ShapeState, string> = {
  primary: colors.musclePrimary[1],
  secondary: colors.muscleSecondary[1],
  idle: colors.muscleIdle[1],
  structure: colors.muscleStructure[1],
};

/** Top → bottom shading per state, so each muscle reads as a lit, rounded form. */
const SHADE: Record<ShapeState, [string, string]> = {
  primary: colors.musclePrimary,
  secondary: colors.muscleSecondary,
  idle: colors.muscleIdle,
  structure: colors.muscleStructure,
};
const STATES = Object.keys(SHADE) as ShapeState[];

interface MuscleMapProps {
  targets: Targets;
  /** Rendered height in px. Width follows the 250:220 aspect. */
  height: number;
  /** Show Front/Back captions, legend and muscle names. */
  showDetails?: boolean;
  /** Change to a new number to pulse the worked muscles (e.g. after logging a set). */
  pulseKey?: number;
}

function View2D({ shapes, targets, gradientId }: { shapes: FlatShape[]; targets: Targets; gradientId: string }) {
  return shapes.map((s, i) => {
    const state = shapeState(s, targets.primary, targets.secondary);
    return (
      <Path
        key={i}
        d={s.d}
        fill={`url(#${gradientId}-${state})`}
        stroke={state === 'structure' ? undefined : colors.muscleOutline}
        strokeWidth={state === 'structure' ? 0 : 0.6}
      />
    );
  });
}

/** Front and back body map with the exercise's muscles lit: primary in volt, secondary dimmed. */
export function MuscleMap({ targets, height, showDetails = false, pulseKey }: MuscleMapProps) {
  const width = (height * 250) / 220;
  const gradientId = `mm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const reduced = useReducedMotion();
  const glow = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const lastPulse = useRef(pulseKey);

  // Pulse: worked muscles flash bright and the map pops, then settle back.
  useEffect(() => {
    if (pulseKey === undefined || pulseKey === lastPulse.current) return;
    lastPulse.current = pulseKey;
    if (reduced) return;
    glow.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.08, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      ]),
    ]).start();
  }, [pulseKey, reduced, glow, pop]);

  const hot = useMemo(
    () => ({
      front: FRONT_FLAT.filter((s) => shapeState(s, targets.primary, targets.secondary) === 'primary'),
      back: BACK_FLAT.filter((s) => shapeState(s, targets.primary, targets.secondary) === 'primary'),
    }),
    [targets],
  );

  const names = (list: Targets['primary']) => list.map((m) => MUSCLE_LABEL[m]).join(', ');
  const label =
    `Works ${names(targets.primary)}` + (targets.secondary.length ? `, plus ${names(targets.secondary)}` : '');

  return (
    <View style={{ gap: space.md }}>
      <Animated.View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={{ alignSelf: 'center', transform: [{ scale: pop }] }}
      >
        <Svg width={width} height={height} viewBox="0 0 250 220">
          <Defs>
            {STATES.map((state) => (
              <LinearGradient key={state} id={`${gradientId}-${state}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={SHADE[state][0]} />
                <Stop offset="1" stopColor={SHADE[state][1]} />
              </LinearGradient>
            ))}
          </Defs>
          <G>
            <View2D shapes={FRONT_FLAT} targets={targets} gradientId={gradientId} />
          </G>
          <G x={130}>
            <View2D shapes={BACK_FLAT} targets={targets} gradientId={gradientId} />
          </G>
          {pulseKey !== undefined && (
            <AnimatedG opacity={glow}>
              {hot.front.map((s, i) => (
                <Path key={`f${i}`} d={s.d} fill="#F4FFC9" stroke={BRAND.volt} strokeWidth={2.4} />
              ))}
              <G x={130}>
                {hot.back.map((s, i) => (
                  <Path key={`b${i}`} d={s.d} fill="#F4FFC9" stroke={BRAND.volt} strokeWidth={2.4} />
                ))}
              </G>
            </AnimatedG>
          )}
        </Svg>
        {showDetails && (
          <View style={[styles.captions, { width }]}>
            <Text variant="caption" style={styles.caption}>
              FRONT
            </Text>
            <Text variant="caption" style={styles.caption}>
              BACK
            </Text>
          </View>
        )}
      </Animated.View>

      {showDetails && (
        <View style={styles.legend}>
          {targets.primary.length > 0 && (
            <LegendRow color={FILL.primary} title="Primary" muscles={names(targets.primary)} />
          )}
          {targets.secondary.length > 0 && (
            <LegendRow color={FILL.secondary} title="Secondary" muscles={names(targets.secondary)} />
          )}
        </View>
      )}
    </View>
  );
}

function LegendRow({ color, title, muscles }: { color: string; title: string; muscles: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text variant="caption" style={styles.legendTitle}>
        {title}
      </Text>
      <Text variant="label" style={{ flex: 1, color: colors.chalk }}>
        {muscles}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  captions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: space.xs },
  caption: { fontWeight: '700', letterSpacing: 1.4 },
  legend: { gap: space.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendTitle: { width: 72, fontWeight: '700', letterSpacing: 0.6 },
});
