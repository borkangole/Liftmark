import Storage from 'expo-sqlite/kv-store';
import { Appearance } from 'react-native';

/**
 * Liftmark design tokens.
 *
 * The palette is chosen once, when this module first loads, from the saved appearance setting
 * (read synchronously, before any screen is drawn). Switching appearance saves the choice and
 * reloads the app, so every StyleSheet is rebuilt with the new palette.
 */
export type ThemePreference = 'system' | 'dark' | 'light';
// Key predates the Liftmark rename; kept so the saved appearance survives the update.
export const THEME_KEY = 'repster.theme';

function readPreference(): ThemePreference {
  try {
    const v = Storage.getItemSync(THEME_KEY);
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const themePreference = readPreference();
export const isDark =
  themePreference === 'system' ? Appearance.getColorScheme() !== 'light' : themePreference === 'dark';

/** The brand lime, used where it must stay bright in both themes (logo, highlights). */
export const BRAND = {
  volt: '#C6F432',
  tile: '#1A1C21',
  bar: '#4A4E57',
  plateDark: '#6B707A',
  plateLight: '#B9BCC2',
} as const;

const dark = {
  ink: '#0E0F12', // app background
  surface: '#1A1C21', // cards, sheets
  surfaceRaised: '#24272D',
  border: '#2E3138',
  volt: '#C6F432', // accent: buttons, PRs, active states
  voltInk: '#0E0F12', // text on volt
  voltSoft: 'rgba(198,244,50,0.12)',
  steel: '#B9BCC2',
  chalk: '#F4F5F0', // primary text
  muted: '#A3A6AD', // secondary text
  danger: '#FF8A7A',
  dangerSoft: 'rgba(255,138,122,0.12)',
  warning: '#FFC266',
  // Exercise demo figure
  figure: '#B9BCC2',
  figureFar: '#4A4E57',
  equipment: '#6B707A',
  equipmentDark: '#2E3138',
  // Muscle map (top → bottom shading)
  musclePrimary: ['#DDFF6A', '#A9D61E'] as [string, string],
  muscleSecondary: ['#7E9C2A', '#5A7219'] as [string, string],
  muscleIdle: ['#4A4E57', '#383B42'] as [string, string],
  muscleStructure: ['#282B31', '#212328'] as [string, string],
  muscleOutline: '#15171B',
};

const light: typeof dark = {
  ink: '#F2F3EE',
  surface: '#FFFFFF',
  surfaceRaised: '#E9EBE4',
  border: '#D6D9D0',
  volt: '#4E7A00', // deeper lime so accent text passes contrast on white
  voltInk: '#FFFFFF',
  voltSoft: 'rgba(78,122,0,0.10)',
  steel: '#8A8F98',
  chalk: '#121316',
  muted: '#5B5F68',
  danger: '#C2410C',
  dangerSoft: 'rgba(194,65,12,0.10)',
  warning: '#B45309',
  figure: '#5B5F68',
  figureFar: '#B7BAB2',
  equipment: '#8A8F98',
  equipmentDark: '#3A3D44',
  musclePrimary: ['#C6F432', '#93C400'],
  muscleSecondary: ['#DDEBB0', '#C4D98A'],
  muscleIdle: ['#D3D6CE', '#C2C5BD'],
  muscleStructure: ['#E7E9E3', '#DEE1DA'],
  muscleOutline: '#FFFFFF',
};

export const colors = isDark ? dark : light;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28, display: 40 },
  weight: { regular: '400', medium: '500', bold: '700' },
} as const;

export const theme = { colors, space, radius, font, isDark };
export type Theme = typeof theme;
