import {StyleSheet, View} from 'react-native';
import {RootNavigator} from '../navigation/RootNavigator';
import {VantaLayer} from '../../components/ui/VantaLayer';
import {useTheme} from '../../theme';
import {QueryProvider} from './QueryProvider';
import {ThemeProvider} from './ThemeProvider';

/**
 * A solid background behind the whole tree. The Vanta layer is mounted for the
 * entire app lifetime (hidden with opacity in the light theme) so its WebGL
 * scene is already running when login/logout appears.
 */
function RootShell() {
  const theme = useTheme();

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.skyTop}]}>
      <VantaLayer visible={theme.mode === 'dark'} />
      <RootNavigator />
    </View>
  );
}

export function AppProviders() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <RootShell />
      </ThemeProvider>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
});
