import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNow} from '../../hooks/useNow';
import {formatAgo} from '../../lib/format';
import {useTheme} from '../../theme';

export interface PageHeadProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  status?: {online: boolean; updatedAt?: number};
  onRefresh?: () => void;
}

export function PageHead({
  eyebrow,
  title,
  subtitle,
  status,
  onRefresh,
}: PageHeadProps) {
  const theme = useTheme();
  const now = useNow();

  return (
    <View style={styles.head}>
      <View style={styles.copy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, {color: theme.colors.accent}]}>
            {eyebrow}
          </Text>
        ) : null}
        <Text style={[styles.title, {color: theme.colors.ink}]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.sub, {color: theme.colors.muted}]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {status || onRefresh ? (
        <View style={styles.actions}>
          {status ? (
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.line,
                },
              ]}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: status.online
                      ? theme.colors.ok
                      : theme.colors.danger,
                  },
                ]}
              />
              <Text style={[styles.pillText, {color: theme.colors.ink2}]}>
                {status.online ? 'Online' : 'Offline'} ·{' '}
                <Text style={{color: theme.colors.ink, fontWeight: '700'}}>
                  {formatAgo(status.updatedAt, now)}
                </Text>
              </Text>
            </View>
          ) : null}

          {onRefresh ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Aggiorna i dati"
              onPress={onRefresh}
              style={({pressed}) => [
                styles.refresh,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.line,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Text style={[styles.refreshIcon, {color: theme.colors.ink2}]}>
                ⟳
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  copy: {flex: 1, minWidth: 200},
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {fontSize: 30, fontWeight: '700', letterSpacing: -0.6},
  sub: {fontSize: 14, marginTop: 4},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 10},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {width: 7, height: 7, borderRadius: 4},
  pillText: {fontSize: 12.5},
  refresh: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIcon: {fontSize: 16},
});
