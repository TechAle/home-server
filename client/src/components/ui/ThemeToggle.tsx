import {Pressable, StyleSheet, Text} from 'react-native';
import {useSettingsStore} from '../../store/settings';
import {useTheme} from '../../theme';

interface ThemeToggleProps {
  /** Overrides the app-wide theme switch (used by the login day/night view). */
  onToggle?: () => void;
}

export function ThemeToggle({onToggle}: ThemeToggleProps) {
  const theme = useTheme();
  const toggleTheme = useSettingsStore(state => state.toggleTheme);
  const next = theme.mode === 'light' ? 'scuro' : 'chiaro';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Attiva tema ${next}`}
      onPress={onToggle ?? toggleTheme}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.line,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <Text style={[styles.icon, {color: theme.colors.ink2}]}>
        {theme.mode === 'light' ? '☀' : '☾'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {fontSize: 15},
});
