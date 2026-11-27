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
import {useNow} from '../../hooks/useNow';
import {formatAgo, formatAiring} from '../../lib/format';
import {useAnimeLinks, useMarkWatched} from '../../queries/anilist';
import {cursorPointer, useTheme} from '../../theme';
import {EpisodeActions} from './components/EpisodeActions';
import {
  EpisodeDownloadsOverlay,
  type EpisodeDownloadsRequest,
} from './components/EpisodeDownloadsOverlay';

interface AniListScreenProps {
  onPlay: (stream: {
    title: string;
    url: string;
    mediaId: number;
    progress: number;
    episode: number;
    mode: 'stream' | 'file';
    playUrl?: string;
  }) => void;
}

type AnimeFilter = 'all' | 'watching' | 'planning';

const FILTERS: {id: AnimeFilter; label: string}[] = [
  {id: 'all', label: 'Tutto'},
  {id: 'watching', label: 'Watching'},
  {id: 'planning', label: 'Planning'},
];

export function AniListScreen({onPlay}: AniListScreenProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const anime = useAnimeLinks();
  const markWatched = useMarkWatched();
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AnimeFilter>('all');
  const [marking, setMarking] = useState<string | null>(null);
  const [markError, setMarkError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [choice, setChoice] = useState<{
    title: string;
    episode: number;
    url: string;
    mediaId: number;
    progress: number;
    episodes: number;
    episodeBase: string;
  } | null>(null);
  const [download, setDownload] = useState<EpisodeDownloadsRequest | null>(null);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  };

  const markEpisodeWatched = async (
    title: string,
    mediaId: number,
    progress: number,
  ) => {
    if (marking) {
      return;
    }

    setMarking(title);
    setMarkError(null);

    try {
      await markWatched.mutateAsync({mediaId, progress: progress + 1});
      await anime.refetch();
    } catch (failure) {
      setMarkError({title, message: errorMessage(failure)});
    } finally {
      setMarking(null);
    }
  };

  const entries = Object.entries(anime.data ?? {});
  const watching = entries.filter(
    ([, item]) => item.status === 'CURRENT',
  ).length;
  const planning = entries.filter(
    ([, item]) => item.status === 'PLANNING',
  ).length;
  const waiting = entries.filter(
    ([, item]) => Boolean(item.nextEpisode) && item.link.length === 0,
  ).length;
  const visible = entries.filter(([, item]) => {
    if (filter === 'watching') {return item.status === 'CURRENT';}
    if (filter === 'planning') {return item.status === 'PLANNING';}
    return true;
  });

  return (
    <View style={styles.root}>
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
              {watching}
            </Text>
            <Text style={[styles.summaryLabel, {color: theme.colors.muted}]}>
              In visione
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryValue, {color: theme.colors.ink}]}>
              {planning}
            </Text>
            <Text style={[styles.summaryLabel, {color: theme.colors.muted}]}>
              Pianificati
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
              {formatAgo(anime.dataUpdatedAt, now)}
            </Text>
            <Text style={[styles.summaryLabel, {color: theme.colors.muted}]}>
              Aggiornato
            </Text>
          </Card>
        </View>

        <View style={styles.filters}>
          {FILTERS.map(option => {
            const selected = filter === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{selected}}
                onPress={() => setFilter(option.id)}
                style={[
                  styles.filter,
                  cursorPointer,
                  {
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.card,
                    borderColor: selected
                      ? theme.colors.accent
                      : theme.colors.line,
                  },
                ]}>
                <Text
                  pointerEvents="none"
                  style={[
                    styles.filterText,
                    {
                      color: selected
                        ? theme.colors.onAccent
                        : theme.colors.ink2,
                    },
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {anime.isError ? (
          <Card>
            <Text style={[styles.note, {color: theme.colors.danger}]}>
              {errorMessage(anime.error)}
            </Text>
          </Card>
        ) : null}

        {!anime.isError && !anime.isPending && visible.length === 0 ? (
          <Card>
            <Text style={[styles.note, {color: theme.colors.muted}]}>
              {filter === 'watching'
                ? 'Nessun anime in visione.'
                : filter === 'planning'
                  ? 'Nessun anime pianificato.'
                  : 'Nessun anime.'}
            </Text>
          </Card>
        ) : null}

        <View style={styles.list}>
          {visible.map(([title, item]) => (
            <Card key={title} style={styles.row}>
              <View style={styles.rowHead}>
                <Text
                  numberOfLines={2}
                  style={[styles.rowTitle, {color: theme.colors.ink}]}>
                  {title}
                </Text>
                <StatusBadge
                  tone={
                    item.status === 'PLANNING'
                      ? 'muted'
                      : item.link.length
                        ? 'ok'
                        : 'muted'
                  }
                  label={
                    item.status === 'PLANNING'
                      ? 'Pianificato'
                      : `Ep. ${item.progress}`
                  }
                />
              </View>

              {item.link.length > 0 ? (
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="link"
                    style={cursorPointer}
                    onPress={() => {
                      Linking.openURL(item.link[0]).catch(() => {});
                    }}>
                    <Text
                      pointerEvents="none"
                      style={[styles.link, {color: theme.colors.accent}]}>
                      Apri episodio {item.progress + 1} →
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Segna come visto l'episodio ${item.progress + 1}`}
                    disabled={marking === title}
                    onPress={() =>
                      markEpisodeWatched(title, item.mediaId, item.progress)
                    }
                    style={[
                      styles.ghost,
                      marking === title ? undefined : cursorPointer,
                      {
                        borderColor: theme.colors.accent,
                        opacity: marking === title ? 0.6 : 1,
                      },
                    ]}>
                    <Text
                      pointerEvents="none"
                      style={[styles.ghostText, {color: theme.colors.accent}]}>
                      {marking === title ? '…' : 'Ep guardato'}
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setChoice({
                        title,
                        episode: item.progress + 1,
                        url: item.link[0],
                        mediaId: item.mediaId,
                        progress: item.progress,
                        // Fallbacks keep the action working with a cache created
                        // before episodes/episodeBase existed.
                        episodes: item.episodes || item.progress + 1,
                        episodeBase:
                          item.episodeBase ||
                          item.link[0].replace(/\/ep-\d+\/?$/, ''),
                      })
                    }
                    style={[
                      styles.play,
                      cursorPointer,
                      {backgroundColor: theme.colors.accent},
                    ]}>
                    <Text
                      pointerEvents="none"
                      style={[
                        styles.playText,
                        {color: theme.colors.onAccent},
                      ]}>
                      Esegui ep
                    </Text>
                  </Pressable>
                </View>
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

              {markError?.title === title ? (
                <Text style={[styles.note, {color: theme.colors.danger}]}>
                  {markError.message}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      </View>
    </ScrollView>

      <EpisodeActions
        visible={Boolean(choice)}
        title={choice?.title ?? ''}
        episode={choice?.episode ?? 0}
        onClose={() => setChoice(null)}
        onStream={() => {
          if (!choice) {
            return;
          }
          onPlay({
            title: choice.title,
            url: choice.url,
            mediaId: choice.mediaId,
            progress: choice.progress,
            episode: choice.episode,
            mode: 'stream',
          });
          setChoice(null);
        }}
        onDownload={() => {
          if (!choice) {
            return;
          }
          setDownload({
            title: choice.title,
            progress: choice.progress,
            episodes: choice.episodes,
            episodeBase: choice.episodeBase,
            mediaId: choice.mediaId,
          });
          setChoice(null);
        }}
      />

      {download ? (
        <EpisodeDownloadsOverlay
          request={download}
          onWatch={(episode, playUrl) => {
            onPlay({
              title: download.title,
              url: `${download.episodeBase}/ep-${episode}`,
              mediaId: download.mediaId,
              progress: download.progress,
              episode,
              mode: 'file',
              playUrl,
            });
            setDownload(null);
          }}
          onClose={() => setDownload(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
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
  filters: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  filter: {paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1},
  filterText: {fontSize: 12.5, fontWeight: '600'},
  list: {gap: 10},
  row: {gap: 8},
  rowHead: {flexDirection: 'row', alignItems: 'center', gap: 10},
  rowTitle: {flex: 1, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2},
  actions: {flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'},
  play: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8},
  playText: {fontSize: 12, fontWeight: '700'},
  ghost: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1},
  ghostText: {fontSize: 12, fontWeight: '700'},
  link: {fontSize: 13, fontWeight: '600'},
  note: {fontSize: 12.5, lineHeight: 18},
});
