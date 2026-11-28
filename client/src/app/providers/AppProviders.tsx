import {StyleSheet, View} from 'react-native';
import {RootNavigator} from '../navigation/RootNavigator';
import {VantaLayer} from '../../components/ui/VantaLayer';
import {useAuthStore} from '../../store/auth';
import {useTheme} from '../../theme';
import {QueryProvider} from './QueryProvider';
import {ThemeProvider} from './ThemeProvider';

/**
 * A solid background behind the whole tree. The Vanta layer is kept for the
 * authenticated night view; it is never mounted on the login/register screens,
 * where its WebView would steal the keyboard focus from the TextInputs.
 */
function RootShell() {
  const theme = useTheme();
  const token = useAuthStore(state => state.token);

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.skyTop}]}>
      <VantaLayer visible={theme.mode === 'dark' && Boolean(token)} />
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
