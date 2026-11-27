/**
 * Design tokens ported from `mockup/styles.css`.
 *
 * Light is the home palette; dark mirrors the `[data-theme="dark"]` block.
 * The login uses the glass/input tokens on top of the sky background.
 */
import {cardShadow, radius, spacing} from './tokens';

export interface ThemeColors {
  background: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  veil: string;
  topbar: string;
  ink: string;
  ink2: string;
  muted: string;
  mutedSoft: string;
  line: string;
  card: string;
  cardBorder: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  onAccent: string;
  ok: string;
  okSoft: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  glass: string;
  glassBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  brandText: string;
  brandDim: string;
  dot: string;
  sun: string;
  moon: string;
  cloud: string;
  star: string;
}

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  cardShadow: typeof cardShadow;
}

const lightColors: ThemeColors = {
  background: '#f4f8fd',
  skyTop: '#d2e7ff',
  skyMid: '#e7f3ff',
  skyBottom: '#f4faff',
  veil: 'rgba(255, 255, 255, 0.08)',
  topbar: 'rgba(255, 255, 255, 0.82)',
  ink: '#0d1b2a',
  ink2: '#3d4f63',
  muted: '#6b7c90',
  mutedSoft: 'rgba(107, 124, 144, 0.12)',
  line: '#e3eaf2',
  card: '#ffffff',
  cardBorder: 'rgba(13, 27, 42, 0.06)',
  accent: '#2f7df6',
  accent2: '#22b8cf',
  accentSoft: 'rgba(47, 125, 246, 0.10)',
  onAccent: '#ffffff',
  ok: '#18a058',
  okSoft: 'rgba(24, 160, 88, 0.12)',
  warn: '#d98324',
  warnSoft: 'rgba(217, 131, 36, 0.14)',
  danger: '#e5484d',
  dangerSoft: 'rgba(229, 72, 77, 0.12)',
  glass: 'rgba(255, 255, 255, 0.86)',
  glassBorder: 'rgba(13, 27, 42, 0.08)',
  inputBg: '#ffffff',
  inputBorder: '#d9e4f0',
  inputText: '#0d1b2a',
  inputPlaceholder: '#8aa0b8',
  brandText: '#0d1b2a',
  brandDim: '#6b7c90',
  dot: '#2f7df6',
  sun: '#ffe9a3',
  moon: '#eef4ff',
  cloud: '#ffffff',
  star: '#c7ddff',
};

const darkColors: ThemeColors = {
  background: '#0b1420',
  skyTop: '#050a17',
  skyMid: '#071022',
  skyBottom: '#0b1420',
  veil: 'rgba(4, 8, 18, 0.35)',
  topbar: 'rgba(13, 22, 36, 0.82)',
  ink: '#e8f0fc',
  ink2: '#a9bcd6',
  muted: '#7f93ae',
  mutedSoft: 'rgba(127, 147, 174, 0.16)',
  line: '#22324a',
  card: '#111c2c',
  cardBorder: '#22324a',
  accent: '#2f7df6',
  accent2: '#38d0e0',
  accentSoft: 'rgba(47, 125, 246, 0.18)',
  onAccent: '#ffffff',
  ok: '#31d07f',
  okSoft: 'rgba(49, 208, 127, 0.16)',
  warn: '#e9a13b',
  warnSoft: 'rgba(233, 161, 59, 0.18)',
  danger: '#ff6b70',
  dangerSoft: 'rgba(255, 107, 112, 0.18)',
  glass: 'rgba(13, 22, 40, 0.72)',
  glassBorder: 'rgba(140, 180, 255, 0.18)',
  inputBg: '#0f1a2a',
  inputBorder: '#22324a',
  inputText: '#e8f0fc',
  inputPlaceholder: '#5f7695',
  brandText: '#e8f0fc',
  brandDim: '#7f93ae',
  dot: '#4d94ff',
  sun: '#ffe9a3',
  moon: '#eef4ff',
  cloud: '#8fb0d8',
  star: '#bcd7ff',
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radius,
  cardShadow,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radius,
  cardShadow,
};

export const themes: Record<Theme['mode'], Theme> = {
  light: lightTheme,
  dark: darkTheme,
};
