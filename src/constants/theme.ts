/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14142B',
    background: '#F3F4FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7E8F2',
    textSecondary: '#6B6E85',
    border: '#E4E5EF',
    accent: '#5B4CF5',
    accentSoft: '#ECEAFF',
    onAccent: '#FFFFFF',
    // Hero gradient and the record button.
    gradientStart: '#6D5BFF',
    gradientEnd: '#B44CF0',
    record: '#FF4D6D',
    recordSoft: '#FFE4EA',
    danger: '#DC2626',
    dangerSoft: '#FDECEC',
    success: '#12A150',
    successSoft: '#E3F6EA',
    warning: '#B45309',
    warningSoft: '#FDF1DE',
    shadow: '#2B2470',
  },
  dark: {
    text: '#EEEEF8',
    background: '#0C0C14',
    backgroundElement: '#171724',
    backgroundSelected: '#262638',
    textSecondary: '#9C9EB8',
    border: '#272738',
    accent: '#9D92FF',
    accentSoft: '#252046',
    onAccent: '#0C0C14',
    gradientStart: '#4B3BD9',
    gradientEnd: '#8E34C4',
    record: '#FF6B85',
    recordSoft: '#3A1825',
    danger: '#F87171',
    dangerSoft: '#3A1A1A',
    success: '#4ADE80',
    successSoft: '#163222',
    warning: '#FBBF24',
    warningSoft: '#3A2C10',
    shadow: '#000000',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = (typeof Colors)['light'] | (typeof Colors)['dark'];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 26,
  pill: 999,
} as const;

/** Soft drop shadow for floating surfaces (cards, the action bar). */
export function shadow(color: string, depth: 'low' | 'high' = 'low') {
  return Platform.select({
    web: { boxShadow: depth === 'high' ? `0 10px 30px ${color}33` : `0 2px 10px ${color}14` },
    android: { elevation: depth === 'high' ? 10 : 2 },
    default: {
      shadowColor: color,
      shadowOpacity: depth === 'high' ? 0.22 : 0.07,
      shadowRadius: depth === 'high' ? 18 : 8,
      shadowOffset: { width: 0, height: depth === 'high' ? 8 : 2 },
    },
  });
}

export const MaxContentWidth = 800;

/** On web the native tab bar is drawn as a floating bar at the top, so tab screens leave room for it. */
export const WebTabBarInset = Platform.OS === 'web' ? 64 : 0;
