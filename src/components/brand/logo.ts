import { BRAND } from '@/theme/tokens';

/** Logo geometry on a 1024×1024 grid (Concept A: rising plates). Shared by the icon and the launch animation. */
export const LOGO_GRID = 1024;
export const ICON_CORNER_RATIO = 228 / 1024; // iOS app icon corner radius

export const LOGO_BAR = { x: 170, y: 497, w: 684, h: 30, color: BRAND.bar };
export const LOGO_PLATES = [
  { x: 262, y: 392, w: 120, h: 240, color: BRAND.plateDark },
  { x: 452, y: 322, w: 120, h: 380, color: BRAND.plateLight },
  { x: 642, y: 252, w: 120, h: 520, color: BRAND.volt },
];
export const LOGO_PLATE_RADIUS = 40;
