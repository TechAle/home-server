import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSettingsStore, type ServerMode} from '../../store/settings';
import {cursorPointer, useTheme} from '../../theme';

const OPTIONS: {mode: ServerMode; label: string}[] = [
  {mode: 'local', label: 'Locale'},
  {mode: 'remote', label: 'Remoto'},
];

/**
 * Bottom-right switch on the login/register card: "Locale" points at the
 * host/emulator address, "Remoto" at the public DuckDNS deployment.
 */
export function ServerModeToggle({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const theme = useTheme();
  const serverMode = useSettingsStore(state => state.serverMode);
  const setServerMode = useSettingsStore(state => state.setServerMode);

  return (
    <View style={styles.row}>
      <Text style={[styles.caption, {color: theme.colors.muted}]}>Server</Text>
      {OPTIONS.map(option => {
        const selected = serverMode === option.mode;
        return (
          <Pressable
            key={option.mode}
            accessibilityRole="checkbox"
            accessibilityState={{checked: selected, disabled}}
            accessibilityLabel={`Server ${option.label.toLowerCase()}`}
            disabled={disabled}
            onPress={() => setServerMode(option.mode)}
            style={[
              styles.option,
              disabled ? styles.disabled : cursorPointer,
            ]}>
            <View
              style={[
                styles.box,
                {
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.line,
                  backgroundColor: selected
                    ? theme.colors.accent
                    : 'transparent',
                },
              ]}>
              {selected ? (
                <Text style={[styles.check, {color: theme.colors.onAccent}]}>
                  ✓
                </Text>
              ) : null}
            </View>
            <Text
              pointerEvents="none"
              style={[
                styles.label,
                {
                  color: selected ? theme.colors.ink : theme.colors.ink2,
                  fontWeight: selected ? '700' : '600',
                },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 2,
  },
  caption: {fontSize: 12, marginRight: 2},
  option: {flexDirection: 'row', alignItems: 'center', gap: 6},
  disabled: {opacity: 0.5},
  box: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {fontSize: 11, fontWeight: '700', lineHeight: 14},
  label: {fontSize: 12.5},
});
