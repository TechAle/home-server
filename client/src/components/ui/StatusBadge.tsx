import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../theme';

export type StatusTone = 'ok' | 'warn' | 'danger' | 'muted';

export function StatusBadge({
  tone,
  label,
}: {
  tone: StatusTone;
  label: string;
}) {
  const theme = useTheme();
  const palette = {
    ok: {fg: theme.colors.ok, bg: theme.colors.okSoft},
    warn: {fg: theme.colors.warn, bg: theme.colors.warnSoft},
    danger: {fg: theme.colors.danger, bg: theme.colors.dangerSoft},
    muted: {fg: theme.colors.muted, bg: theme.colors.mutedSoft},
  }[tone];

  return (
    <View style={[styles.pill, {backgroundColor: palette.bg}]}>
      <View style={[styles.dot, {backgroundColor: palette.fg}]} />
      <Text style={[styles.text, {color: palette.fg}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: {width: 6, height: 6, borderRadius: 3},
  text: {fontSize: 11, fontWeight: '700'},
});
