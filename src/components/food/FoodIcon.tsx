import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';
import { FOOD_GLYPHS, type FoodGlyph, type GlyphData } from './glyphs';

/** A food glyph on a rounded tile, in the brand's chalk-and-volt style. */
export function FoodIcon({ glyph, size = 36, tile = true }: { glyph: FoodGlyph; size?: number; tile?: boolean }) {
  const g: GlyphData = FOOD_GLYPHS[glyph];
  const inner = tile ? size * 0.62 : size;
  const stroke = 1.7;
  const icon = (
    <Svg width={inner} height={inner} viewBox="0 0 24 24">
      {g.a?.map((d) => (
        <Path key={d} d={d} fill={colors.volt} />
      ))}
      {g.s?.map((d) => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={colors.chalk}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {g.as?.map((d) => (
        <Path
          key={d}
          d={d}
          fill="none"
          stroke={colors.volt}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
  if (!tile) return icon;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: colors.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {icon}
    </View>
  );
}
