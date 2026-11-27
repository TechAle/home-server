import type {PropsWithChildren} from 'react';
import {View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../../theme';

export function Card({
  children,
  style,
}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.cardBorder,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
        },
        theme.cardShadow,
        style,
      ]}>
      {children}
    </View>
  );
}
