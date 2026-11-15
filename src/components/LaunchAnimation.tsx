import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { BRAND, colors } from '@/theme/tokens';
import { ICON_CORNER_RATIO, LOGO_BAR, LOGO_GRID, LOGO_PLATES, LOGO_PLATE_RADIUS } from './brand/logo';

const ICON_SIZE = 160;
const UNIT = ICON_SIZE / LOGO_GRID;
const BAR = LOGO_BAR;
const PLATES = LOGO_PLATES;

const px = (v: number) => v * UNIT;

const TAGLINE = ['YOUR', 'PROGRESS', 'PARTNER'];

interface LaunchAnimationProps {
  /** True once the app is ready to show. The animation finishes its current rep, then fades out. */
  ready: boolean;
  onFinish: () => void;
  onLayout?: () => void;
}

/**
 * Launch loader: the three plates on the logo's barbell load one at a time, like reps,
 * and repeat until the app is ready.
 */
export function LaunchAnimation({ ready, onFinish, onLayout }: LaunchAnimationProps) {
  const plates = useRef(PLATES.map(() => new Animated.Value(0))).current;
  const wordmark = useRef(new Animated.Value(0)).current;
  const taglineWords = useRef(TAGLINE.map(() => new Animated.Value(0))).current;
  const taglineDone = useRef(false);
  const exit = useRef(new Animated.Value(1)).current;
  const readyRef = useRef(ready);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  readyRef.current = ready;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
  }, []);

  useEffect(() => {
    if (reduceMotion === null) return;
    let cancelled = false;

    const finish = () => {
      Animated.parallel([
        ...plates.map((p) => Animated.timing(p, { toValue: 1, duration: 150, useNativeDriver: true })),
        Animated.timing(wordmark, { toValue: 1, duration: 150, useNativeDriver: true }),
        ...taglineWords.map((w) => Animated.timing(w, { toValue: 1, duration: 150, useNativeDriver: true })),
      ]).start(() => {
        Animated.timing(exit, {
          toValue: 0,
          duration: 280,
          delay: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished }) => finished && !cancelled && onFinish());
      });
    };

    if (reduceMotion) {
      // No looping motion: show the full icon, then fade out once ready.
      plates.forEach((p) => p.setValue(1));
      wordmark.setValue(1);
      taglineWords.forEach((w) => w.setValue(1));
      const wait = () => {
        if (cancelled) return;
        if (readyRef.current) finish();
        else setTimeout(wait, 100);
      };
      wait();
      return () => {
        cancelled = true;
      };
    }

    // "Liftmark." rises in, then the tagline follows word by word.
    Animated.sequence([
      Animated.timing(wordmark, {
        toValue: 1,
        duration: 400,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        130,
        taglineWords.map((w) =>
          Animated.timing(w, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ),
      ),
    ]).start(() => {
      taglineDone.current = true;
    });

    const cycle = () => {
      if (cancelled) return;
      Animated.sequence([
        Animated.stagger(
          140,
          plates.map((p) => Animated.spring(p, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true })),
        ),
        Animated.delay(220),
      ]).start(() => {
        if (cancelled) return;
        // Leave only once the app is ready and the tagline has fully played.
        if (readyRef.current && taglineDone.current) {
          finish();
          return;
        }
        Animated.parallel(
          plates.map((p) =>
            Animated.timing(p, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ),
        ).start(cycle);
      });
    };
    cycle();

    return () => {
      cancelled = true;
    };
  }, [reduceMotion, plates, wordmark, taglineWords, exit, onFinish]);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: exit }]}
      onLayout={onLayout}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Liftmark"
    >
      <Animated.View
        style={[
          styles.icon,
          { transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1] }) }] },
        ]}
      >
        <View
          style={{
            position: 'absolute',
            left: px(BAR.x),
            top: px(BAR.y),
            width: px(BAR.w),
            height: px(BAR.h),
            borderRadius: px(BAR.h / 2),
            backgroundColor: BAR.color,
          }}
        />
        {PLATES.map((plate, i) => (
          <Animated.View
            key={plate.color}
            style={{
              position: 'absolute',
              left: px(plate.x),
              top: px(plate.y),
              width: px(plate.w),
              height: px(plate.h),
              borderRadius: px(LOGO_PLATE_RADIUS),
              backgroundColor: plate.color,
              opacity: plates[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
              transform: [{ scaleY: plates[i] }],
            }}
          />
        ))}
      </Animated.View>

      <Animated.Text
        style={[
          styles.wordmark,
          {
            opacity: wordmark,
            transform: [{ translateY: wordmark.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
      >
        Liftmark<Animated.Text style={{ color: colors.volt }}>.</Animated.Text>
      </Animated.Text>
      <View style={styles.tagline} accessibilityLabel="Your progress partner">
        {TAGLINE.map((word, i) => (
          <Animated.Text
            key={word}
            style={[
              styles.taglineWord,
              {
                opacity: taglineWords[i],
                transform: [
                  { translateY: taglineWords[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                  { scale: taglineWords[i].interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                ],
              },
            ]}
          >
            {word}
          </Animated.Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    zIndex: 10,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * ICON_CORNER_RATIO,
    backgroundColor: BRAND.tile,
    overflow: 'hidden',
  },
  tagline: { flexDirection: 'row', gap: 8, marginTop: -16 },
  taglineWord: {
    color: colors.volt,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  wordmark: {
    color: colors.chalk,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
  },
});
