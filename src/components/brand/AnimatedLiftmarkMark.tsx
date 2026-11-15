import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useReducedMotion } from '@/hooks/useReducedMotion';
import { BRAND } from '@/theme/tokens';
import { ICON_CORNER_RATIO, LOGO_BAR, LOGO_GRID, LOGO_PLATES, LOGO_PLATE_RADIUS } from './logo';

interface AnimatedLiftmarkMarkProps {
  size?: number;
  /** 0–1. Each plate is a third: 0.66 loads the first two plates. */
  progress: number;
  /** Smooth, linear filling for values that change continuously (e.g. a countdown). */
  continuous?: boolean;
  /** Load the plates one by one on mount. */
  staggerOnMount?: boolean;
  /** Change this to a new defined value to play the celebration (bounce + volt glow). */
  celebrateKey?: number | string;
  /** Play the celebration once the plates finish loading on mount. */
  celebrateOnMount?: boolean;
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/**
 * The app icon as a live progress meter: its three plates load onto the bar as progress grows.
 * Used for set progress, the rest timer, PR celebrations and the workout summary.
 */
export function AnimatedLiftmarkMark({
  size = 40,
  progress,
  continuous = false,
  staggerOnMount = false,
  celebrateKey,
  celebrateOnMount = false,
}: AnimatedLiftmarkMarkProps) {
  const reduced = useReducedMotion();
  const plates = useRef(LOGO_PLATES.map(() => new Animated.Value(0))).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);
  const lastCelebrateKey = useRef(celebrateKey);

  const celebrate = () => {
    if (reduced) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1.18,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(bounce, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, delay: 300, useNativeDriver: true }),
      ]),
    ]).start();
  };

  // Plates follow progress.
  useEffect(() => {
    const targets = LOGO_PLATES.map((_, i) => clamp(progress * LOGO_PLATES.length - i));
    const firstRun = !mounted.current;
    mounted.current = true;

    if (reduced) {
      plates.forEach((p, i) => p.setValue(targets[i]));
      return;
    }

    const anims = plates.map((p, i) =>
      continuous
        ? Animated.timing(p, { toValue: targets[i], duration: 260, easing: Easing.linear, useNativeDriver: true })
        : Animated.spring(p, { toValue: targets[i], friction: 5, tension: 170, useNativeDriver: true }),
    );
    const run = firstRun && staggerOnMount ? Animated.stagger(140, anims) : Animated.parallel(anims);
    run.start(({ finished }) => {
      if (finished && firstRun && celebrateOnMount) celebrate();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, reduced]);

  // Celebration on demand.
  useEffect(() => {
    if (celebrateKey === lastCelebrateKey.current) return;
    lastCelebrateKey.current = celebrateKey;
    if (celebrateKey === undefined) return;
    celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateKey]);

  const u = size / LOGO_GRID;
  const corner = size * ICON_CORNER_RATIO;

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: [{ scale: bounce }] }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: corner,
          backgroundColor: BRAND.tile,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: LOGO_BAR.x * u,
            top: LOGO_BAR.y * u,
            width: LOGO_BAR.w * u,
            height: Math.max(1, LOGO_BAR.h * u),
            borderRadius: (LOGO_BAR.h / 2) * u,
            backgroundColor: LOGO_BAR.color,
          }}
        />
        {LOGO_PLATES.map((p, i) => {
          const frame = {
            position: 'absolute' as const,
            left: p.x * u,
            top: p.y * u,
            width: p.w * u,
            height: p.h * u,
            borderRadius: LOGO_PLATE_RADIUS * u,
          };
          return (
            <View key={p.color} style={frame}>
              {/* Empty slot, so unloaded plates still read as part of the icon. */}
              <View style={[frame, { left: 0, top: 0, backgroundColor: p.color, opacity: 0.16 }]} />
              <Animated.View
                style={[
                  frame,
                  {
                    left: 0,
                    top: 0,
                    backgroundColor: p.color,
                    opacity: plates[i].interpolate({ inputRange: [0, 0.05, 1], outputRange: [0, 1, 1] }),
                    transform: [{ scaleY: plates[i] }],
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          borderRadius: corner + 3,
          borderWidth: 2,
          borderColor: BRAND.volt,
          opacity: glow,
        }}
      />
    </Animated.View>
  );
}
