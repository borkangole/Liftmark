import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { Text, type TextProps } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CountUpProps extends Omit<TextProps, 'children'> {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}

/** A number that counts up to its value. */
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 900, ...text }: CountUpProps) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setDisplay(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [anim, value, duration, reduced]);

  return (
    <Text {...text} accessibilityLabel={format(value)}>
      {format(display)}
    </Text>
  );
}
