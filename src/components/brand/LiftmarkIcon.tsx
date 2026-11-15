import { View } from 'react-native';

import { BRAND, colors } from '@/theme/tokens';
import { ICON_CORNER_RATIO, LOGO_BAR, LOGO_GRID, LOGO_PLATES, LOGO_PLATE_RADIUS } from './logo';

/** The Liftmark app icon, drawn natively so it stays sharp at any size. */
export function LiftmarkIcon({ size = 40 }: { size?: number }) {
  const u = size / LOGO_GRID;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * ICON_CORNER_RATIO,
        backgroundColor: BRAND.tile,
        borderWidth: 1,
        borderColor: colors.border,
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
      {LOGO_PLATES.map((p) => (
        <View
          key={p.color}
          style={{
            position: 'absolute',
            left: p.x * u,
            top: p.y * u,
            width: p.w * u,
            height: p.h * u,
            borderRadius: LOGO_PLATE_RADIUS * u,
            backgroundColor: p.color,
          }}
        />
      ))}
    </View>
  );
}
