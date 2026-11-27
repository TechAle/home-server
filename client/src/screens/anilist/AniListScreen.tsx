import {useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Card} from '../../components/ui/Card';
import {PageHead} from '../../components/ui/PageHead';
import {StatusBadge} from '../../components/ui/StatusBadge';
import {errorMessage} from '../../lib/errors';
import {formatAgo, formatAiring} from '../../lib/format';
import {useAnimeLinks} from '../../queries/anilist';
import {useTheme} from '../../theme';

export function AniListScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const anime = useAnimeLinks();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  };

  const entries = Object.entries(anime.data ?? {});
  const waiting = entries.filter(
    ([, item]) => Boolean(item.nextEpisode) && item.link.length === 0,
  ).length;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
        />
      }>
      <View style={styles.content}>
        <PageHead
          eyebrow="Servizio"
          title="AniList"
          subtitle="Bot · sincronizzazione lista"
          status={{online: !anime.isError, updatedAt: anime.dataUpdatedAt}}
          onRefresh={refresh}
        />

        <View style={styles.summary}>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryValue, {color: theme.colors.ink}]}>
              {entries.length}
            </Text>
            <Text style={[styles.summaryLabel, {color: theme.colors.muted}]}>
              In visione
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryValue, {color: theme.colors.ink}]}>
              {waiting}
            </Text>
            <Text style={[styles.summaryLabel, {color: theme.colors.muted}]}>
              In attesa
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryValue, {color: theme.colors.ink}]}>
              {formatAgo(anime.dataUpdatedAt)}
            </Text>
            <Text style={[styles.summaryLabel, {color: theme.colors.muted}]}>
              Aggiornato
            </Text>
          </Card>
        </View>

        {anime.isError ? (
          <Card>
            <Text style={[styles.note, {color: theme.colors.danger}]}>
              {errorMessage(anime.error)}
            </Text>
          </Card>
        ) : null}

        {!anime.isError && !anime.isPending && entries.length === 0 ? (
          <Card>
            <Text style={[styles.note, {color: theme.colors.muted}]}>
              Nessun anime in visione.
            </Text>
          </Card>
        ) : null}

        <View style={styles.list}>
          {entries.map(([title, item]) => (
            <Card key={title} style={styles.row}>
              <View style={styles.rowHead}>
                <Text
                  numberOfLines={2}
                  style={[styles.rowTitle, {color: theme.colors.ink}]}>
                  {title}
                </Text>
                <StatusBadge
                  tone={item.link.length ? 'ok' : 'muted'}
                  label={`Ep. ${item.progress}`}
                />
              </View>

              {item.link.length > 0 ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    Linking.openURL(item.link[0]).catch(() => {});
                  }}>
                  <Text style={[styles.link, {color: theme.colors.accent}]}>
                    Apri episodio {item.progress + 1} →
                  </Text>
                </Pressable>
              ) : item.nextEpisode ? (
                <Text style={[styles.note, {color: theme.colors.muted}]}>
                  Prossimo ep. {item.nextEpisode.episode ?? '—'} ·{' '}
                  {formatAiring(item.nextEpisode.airingAtIso)}
                </Text>
              ) : (
                <Text style={[styles.note, {color: theme.colors.muted}]}>
                  Nessun episodio in programma
                </Text>
              )}
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {paddingBottom: 48},
  content: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 24,
    gap: 18,
  },
  summary: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  summaryCard: {flexGrow: 1, flexBasis: 120, gap: 4},
  summaryValue: {fontSize: 24, fontWeight: '700', letterSpacing: -0.5},
  summaryLabel: {fontSize: 12},
  list: {gap: 10},
  row: {gap: 8},
  rowHead: {flexDirection: 'row', alignItems: 'center', gap: 10},
  rowTitle: {flex: 1, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2},
  link: {fontSize: 13, fontWeight: '600'},
  note: {fontSize: 12.5, lineHeight: 18},
});
