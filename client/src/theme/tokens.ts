import {Platform, type ViewStyle} from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 11,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const cardShadow: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0d1b2a',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    android: {elevation: 3},
    default: {
      shadowColor: '#0d1b2a',
      shadowOffset: {width: 0, height: 8},
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
  }) ?? {};

/**
 * Desktop builds show a pointer cursor over anything interactive; iOS and
 * Android ignore the style.
 */
export const cursorPointer: ViewStyle =
  Platform.select<ViewStyle>({
    macos: {cursor: 'pointer'},
    windows: {cursor: 'pointer'},
    web: {cursor: 'pointer'},
    default: {},
  }) ?? {};
