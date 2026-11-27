import {StyleSheet, Text, View, type DimensionValue} from 'react-native';
import {useTheme} from '../../theme';

interface MetricBarProps {
  label: string;
  value: string;
  /** 0..1, used for colour and bar width. */
  ratio: number;
  hint?: string;
}

export function MetricBar({label, value, ratio, hint}: MetricBarProps) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const color =
    clamped >= 0.85
      ? theme.colors.danger
      : clamped >= 0.7
        ? theme.colors.warn
        : theme.colors.accent;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <Text style={[styles.label, {color: theme.colors.muted}]}>
          {label}
        </Text>
        <Text style={[styles.value, {color: theme.colors.ink}]}>{value}</Text>
      </View>
      <View style={[styles.track, {backgroundColor: theme.colors.line}]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(clamped * 100)}%` as DimensionValue,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {hint ? (
        <Text style={[styles.hint, {color: theme.colors.muted}]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {gap: 8},
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  label: {fontSize: 12.5, fontWeight: '600'},
  value: {fontSize: 22, fontWeight: '700', letterSpacing: -0.4},
  track: {height: 7, borderRadius: 999, overflow: 'hidden'},
  fill: {height: '100%', borderRadius: 999},
  hint: {fontSize: 11.5},
});
