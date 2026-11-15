import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { buildScene, repProgress, type Tone } from '@/features/demos/scene';
import type { DemoSpec } from '@/features/demos/specs';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { colors, radius, space } from '@/theme/tokens';

const TONE: Record<Tone, string> = {
  far: colors.figureFar,
  near: colors.figure,
  target: colors.volt,
  glow: 'rgba(198,244,50,0.28)',
  equipment: colors.equipment,
  equipmentDark: colors.equipmentDark,
  prop: colors.border,
  cable: colors.muted,
};

interface ExerciseDemoProps {
  spec: DemoSpec;
  size: number;
  /** Show the coaching cue and muscle chips under the figure. */
  showDetails?: boolean;
}

/**
 * Looping, original form demo: a side-view figure moving through one rep at a real tempo,
 * with the target muscles lit in volt. Tap to pause. Reduce Motion starts it paused.
 */
export function ExerciseDemo({ spec, size, showDetails = true }: ExerciseDemoProps) {
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const [frame, setFrame] = useState({ t: 0.5, phase: 0 as 0 | 1 });
  const elapsed = useRef(0);

  useEffect(() => setPlaying(!reduced), [reduced]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      elapsed.current += now - last;
      last = now;
      setFrame(repProgress(spec, elapsed.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, spec]);

  const shapes = useMemo(() => buildScene(spec, frame.t), [spec, frame.t]);

  return (
    <View style={{ gap: space.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Form demo. Works ${spec.muscles.join(', ')}. ${playing ? 'Pause' : 'Play'}`}
        onPress={() => setPlaying((p) => !p)}
        style={[styles.stage, { width: size, height: size }]}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200">
          {shapes.map((s, i) =>
            s.kind === 'line' ? (
              <Line
                key={i}
                x1={s.a.x}
                y1={s.a.y}
                x2={s.b.x}
                y2={s.b.y}
                stroke={TONE[s.tone]}
                strokeWidth={s.width}
                strokeLinecap="round"
              />
            ) : s.kind === 'circle' ? (
              <Circle key={i} cx={s.c.x} cy={s.c.y} r={s.r} fill={TONE[s.tone]} />
            ) : (
              <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={2} fill={TONE[s.tone]} />
            ),
          )}
        </Svg>
        {!playing && (
          <View style={styles.play}>
            <Ionicons name="play" size={18} color={colors.voltInk} />
          </View>
        )}
      </Pressable>

      {showDetails && (
        <View style={{ gap: space.sm }}>
          <Text style={styles.cue} accessibilityLiveRegion="polite">
            {spec.cues[frame.phase]}
          </Text>
          <View style={styles.chips}>
            {spec.muscles.map((m) => (
              <View key={m} style={styles.chip}>
                <View style={styles.dot} />
                <Text variant="caption" style={{ color: colors.chalk, fontWeight: '600' }}>
                  {m}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignSelf: 'center',
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  play: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cue: { color: colors.chalk, fontWeight: '600', textAlign: 'center', minHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
});
