import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

import { BACK_FLAT, FRONT_FLAT, type FlatShape } from '@/features/muscles/bodyMap';
import type { Recovery, RecoveryState } from '@/features/recovery/recovery';
import { colors, isDark } from '@/theme/tokens';

type Fill = RecoveryState | 'idle' | 'structure';

/** Top → bottom shading, so each muscle reads as a lit, rounded form. */
export const RECOVERY_SHADE: Record<Fill, [string, string]> = {
  ready: colors.muscleSecondary,
  recovering: isDark ? ['#FFD58C', '#E39B34'] : ['#F3BA5C', '#C47C17'],
  tired: isDark ? ['#FFA392', '#E25A45'] : ['#EF8A6C', '#C2410C'],
  idle: colors.muscleIdle,
  structure: colors.muscleStructure,
};
const FILLS = Object.keys(RECOVERY_SHADE) as Fill[];
const RANK: Record<RecoveryState, number> = { ready: 0, recovering: 1, tired: 2 };

function fillOf(shape: FlatShape, recovery: Recovery): Fill {
  if (shape.base) return 'structure';
  if (shape.detail || shape.muscles.length === 0) return 'idle';
  // A shape covering several muscles shows the most tired one.
  return shape.muscles
    .map((m) => recovery.muscles[m].state)
    .reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'ready' as RecoveryState);
}

/** Front and back body, each muscle coloured by how recovered it is. */
export function RecoveryMap({ recovery, height }: { recovery: Recovery; height: number }) {
  const width = (height * 250) / 220;
  const id = `rm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const view = (shapes: FlatShape[]) =>
    shapes.map((s, i) => {
      const fill = fillOf(s, recovery);
      return (
        <Path
          key={i}
          d={s.d}
          fill={`url(#${id}-${fill})`}
          stroke={fill === 'structure' ? undefined : colors.muscleOutline}
          strokeWidth={fill === 'structure' ? 0 : 0.6}
        />
      );
    });

  return (
    <Svg width={width} height={height} viewBox="0 0 250 220">
      <Defs>
        {FILLS.map((f) => (
          <LinearGradient key={f} id={`${id}-${f}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={RECOVERY_SHADE[f][0]} />
            <Stop offset="1" stopColor={RECOVERY_SHADE[f][1]} />
          </LinearGradient>
        ))}
      </Defs>
      <G>{view(FRONT_FLAT)}</G>
      <G x={130}>{view(BACK_FLAT)}</G>
    </Svg>
  );
}
