import {Pressable, StyleSheet, Text, View} from 'react-native';
import {cursorPointer, useTheme} from '../../theme';
import {Card} from './Card';
import {StatusBadge, type StatusTone} from './StatusBadge';

interface Stat {
  label: string;
  value: string;
}

interface ServiceCardProps {
  icon: string;
  title: string;
  subtitle: string;
  status: {tone: StatusTone; label: string};
  stats: Stat[];
  footer?: string;
  loading?: boolean;
  onPress?: () => void;
}

export function ServiceCard({
  icon,
  title,
  subtitle,
  status,
  stats,
  footer,
  loading = false,
  onPress,
}: ServiceCardProps) {
  const theme = useTheme();

  const content = (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, {backgroundColor: theme.colors.accentSoft}]}>
          <Text style={[styles.iconText, {color: theme.colors.accent}]}>
            {icon}
          </Text>
        </View>
        <View style={styles.titles}>
          <Text style={[styles.title, {color: theme.colors.ink}]}>{title}</Text>
          <Text
            numberOfLines={1}
            style={[styles.subtitle, {color: theme.colors.muted}]}>
            {subtitle}
          </Text>
        </View>
        <StatusBadge tone={status.tone} label={status.label} />
      </View>

      <View style={[styles.stats, loading && styles.loading]}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.stat}>
            <Text style={[styles.statLabel, {color: theme.colors.muted}]}>
              {stat.label}
            </Text>
            <Text style={[styles.statValue, {color: theme.colors.ink}]}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      {footer ? (
        <Text
          numberOfLines={2}
          style={[styles.footer, {color: theme.colors.muted}]}>
          {footer}
        </Text>
      ) : null}
    </Card>
  );

  if (!onPress) {return content;}

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.pressable,
        cursorPointer,
        pressed && styles.pressed,
      ]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {gap: 16, flex: 1},
  pressable: {flex: 1},
  pressed: {opacity: 0.92},
  head: {flexDirection: 'row', alignItems: 'center', gap: 11},
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {fontSize: 16},
  titles: {flex: 1, minWidth: 0},
  title: {fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2},
  subtitle: {fontSize: 12, marginTop: 1},
  stats: {flexDirection: 'row', flexWrap: 'wrap', rowGap: 12},
  loading: {opacity: 0.5},
  stat: {width: '50%'},
  statLabel: {fontSize: 11.5, fontWeight: '600'},
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  footer: {fontSize: 12},
});
