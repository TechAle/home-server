import type {PropsWithChildren} from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {useTheme} from '../../theme';

export function Screen({
  children,
  style,
}: PropsWithChildren<{style?: StyleProp<ViewStyle>}>) {
  const theme = useTheme();
  return (
    <View
      style={[styles.root, {backgroundColor: theme.colors.background}, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
