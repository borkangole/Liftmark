import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedLiftmarkMark } from '@/components/brand/AnimatedLiftmarkMark';
import { Text } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useActiveWorkout } from '@/stores/useActiveWorkout';
import { colors, radius, space } from '@/theme/tokens';

const VISIBLE_MS = 2600;

/** Slides in from the top when a set beats your best estimated 1RM. */
export function PrToast() {
  const celebration = useActiveWorkout((s) => s.celebration);
  const clear = useActiveWorkout((s) => s.clearCelebration);
  const reduced = useReducedMotion();
  const y = useRef(new Animated.Value(-160)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!celebration) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    AccessibilityInfo.announceForAccessibility(`New PR. ${celebration.title}. ${celebration.detail}`);

    y.setValue(reduced ? 0 : -160);
    const anim = Animated.sequence([
      reduced ? Animated.delay(0) : Animated.spring(y, { toValue: 0, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.delay(VISIBLE_MS),
      Animated.timing(y, {
        toValue: -160,
        duration: reduced ? 0 : 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    anim.start(({ finished }) => finished && clear());
    return () => anim.stop();
  }, [celebration, reduced, y, clear]);

  if (!celebration) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top > 0 ? space.sm : space.md, transform: [{ translateY: y }] }]}
    >
      <View style={styles.toast}>
        <AnimatedLiftmarkMark key={celebration.id} size={48} progress={1} staggerOnMount celebrateOnMount />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="caption" style={styles.kicker}>
            NEW PR
          </Text>
          <Text variant="title" numberOfLines={1}>
            {celebration.title}
          </Text>
          <Text variant="label">{celebration.detail}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.lg, right: space.lg, zIndex: 20 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.volt,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  kicker: { color: colors.volt, fontWeight: '700', letterSpacing: 1.4 },
});
