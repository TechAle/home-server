import {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {TextField} from '../../../components/ui/TextField';
import {errorMessage} from '../../../lib/errors';
import {
  useAllAnimeDownloads,
  useAnimeDownloads,
  useDeleteAnimeDownload,
  useStartAnimeDownload,
} from '../../../queries/anilist';
import {cursorPointer, useTheme} from '../../../theme';
import type {AnimeDownload, AnimeListStatus} from '../../../types/api';

export interface EpisodeDownloadsRequest {
  title: string;
  progress: number;
  episodes: number;
  episodeBase: string;
  mediaId: number;
  status: AnimeListStatus;
}

interface EpisodeDownloadsOverlayProps {
  request: EpisodeDownloadsRequest;
  onWatch: (episode: number, playUrl: string) => void;
  onRewatch: (episode: number) => Promise<void>;
  onWatchSaved: (job: AnimeDownload) => void;
  onRewatchSaved: (job: AnimeDownload) => Promise<void>;
  onClose: () => void;
}

type Tab = 'episodes' | 'all';

function Action({
  label,
  onPress,
  tone,
}: {
  label: string;
  onPress: () => void;
  tone: 'accent' | 'danger';
}) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.colors.danger : theme.colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, cursorPointer, {borderColor: color}]}>
      <Text pointerEvents="none" style={[styles.actionText, {color}]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Episode table for one anime plus a library of every completed download.
 * The next episode is yellow; already watched episodes are green.
 */
export function EpisodeDownloadsOverlay({
  request,
  onWatch,
  onRewatch,
  onWatchSaved,
  onRewatchSaved,
  onClose,
}: EpisodeDownloadsOverlayProps) {
  const theme = useTheme();
  const downloads = useAnimeDownloads(request.title);
  const start = useStartAnimeDownload();
  const remove = useDeleteAnimeDownload();
  const [tab, setTab] = useState<Tab>('episodes');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const all = useAllAnimeDownloads(tab === 'all');

  const byEpisode = new Map<number, AnimeDownload>(
    (downloads.data ?? []).map(job => [job.episode, job]),
  );
  const episodes = Array.from(
    {length: Math.max(1, request.episodes)},
    (_, index) => index + 1,
  );
  const query = search.trim().toLowerCase();
  const saved = (all.data ?? []).filter(job =>
    query ? job.title.toLowerCase().includes(query) : true,
  );

  const download = async (episode: number) => {
    setError('');
    try {
      await start.mutateAsync({
        url: `${request.episodeBase}/ep-${episode}`,
        title: request.title,
        episode,
        mediaId: request.mediaId,
        episodeBase: request.episodeBase,
        status: request.status,
        animeProgress: request.progress,
      });
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const removeEpisode = async (job: AnimeDownload) => {
    setError('');
    try {
      await remove.mutateAsync(job.id);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const rewatchEpisode = async (episode: number) => {
    setError('');
    try {
      await onRewatch(episode);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const rewatchSaved = async (job: AnimeDownload) => {
    setError('');
    try {
      await onRewatchSaved(job);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} accessibilityViewIsModal>
      <Card style={styles.card}>
        <Text style={[styles.eyebrow, {color: theme.colors.accent}]}>
          Download episodi
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.title, {color: theme.colors.ink}]}>
          {request.title}
        </Text>

        <View style={styles.tabs}>
          {[
            {id: 'episodes' as const, label: 'Episodi'},
            {id: 'all' as const, label: 'Tutti'},
          ].map(option => {
            const selected = tab === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{selected}}
                onPress={() => setTab(option.id)}
                style={[
                  styles.tab,
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
                    styles.tabText,
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

        {tab === 'episodes' ? (
          <Text style={[styles.subtitle, {color: theme.colors.muted}]}>
            Scarica sul server. Giallo = da guardare, verde = già visto.
          </Text>
        ) : (
          <TextField
            label="Cerca per nome"
            value={search}
            onChangeText={setSearch}
            placeholder="Titolo anime"
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        {error ? (
          <Text style={[styles.error, {color: theme.colors.danger}]}>{error}</Text>
        ) : null}

        {tab === 'episodes' ? (
          <>
            <View style={styles.head}>
              <Text style={[styles.headText, {color: theme.colors.muted}]}>
                Episodio
              </Text>
              <Text style={[styles.headText, {color: theme.colors.muted}]}>
                Azioni
              </Text>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator>
              {episodes.map(episode => {
                const job = byEpisode.get(episode);
                const current = episode === request.progress + 1;
                const watched = episode <= request.progress;

                return (
                  <View
                    key={episode}
                    style={[
                      styles.row,
                      current && styles.currentRow,
                      !current && watched && styles.watchedRow,
                    ]}>
                    <Text
                      style={[
                        styles.number,
                        {color: theme.colors.ink},
                        current && {color: theme.colors.warn},
                        !current && watched && {color: theme.colors.ok},
                      ]}>
                      {episode}
                    </Text>

                    <View style={styles.actions}>
                      {job?.status === 'downloading' ? (
                        <>
                          <View style={styles.progress}>
                            <Text style={[styles.percent, {color: theme.colors.muted}]}>
                              {job.progress.toFixed(0)}%
                            </Text>
                            <View
                              style={[
                                styles.miniTrack,
                                {backgroundColor: theme.colors.line},
                              ]}>
                              <View
                                style={[
                                  styles.miniFill,
                                  {
                                    width: `${Math.max(0, Math.min(100, job.progress))}%`,
                                    backgroundColor: theme.colors.accent,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                          <Action
                            label="Annulla"
                            tone="danger"
                            onPress={() => removeEpisode(job)}
                          />
                        </>
                      ) : job?.status === 'done' && job.playUrl ? (
                        <>
                          <Action
                            label="Guarda"
                            tone="accent"
                            onPress={() => onWatch(episode, job.playUrl as string)}
                          />
                          <Action
                            label="Rewatch"
                            tone="accent"
                            onPress={() => rewatchEpisode(episode)}
                          />
                          <Action
                            label="Elimina"
                            tone="danger"
                            onPress={() => removeEpisode(job)}
                          />
                        </>
                      ) : job?.status === 'error' ? (
                        <>
                          <Action
                            label="Riprova"
                            tone="accent"
                            onPress={() => download(episode)}
                          />
                          <Text
                            numberOfLines={1}
                            style={[styles.rowError, {color: theme.colors.danger}]}>
                            {job.error}
                          </Text>
                        </>
                      ) : (
                        <Action
                          label="Scarica"
                          tone="accent"
                          onPress={() => download(episode)}
                        />
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.head}>
              <Text style={[styles.headText, {color: theme.colors.muted}]}>
                Completati
              </Text>
              <Text style={[styles.headText, {color: theme.colors.muted}]}>
                Azioni
              </Text>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator>
              {saved.length === 0 ? (
                <Text style={[styles.subtitle, {color: theme.colors.muted}]}>
                  {all.isPending
                    ? 'Caricamento…'
                    : query
                      ? 'Nessun download corrisponde al nome.'
                      : 'Nessun episodio completato.'}
                </Text>
              ) : (
                saved.map(job => (
                  <View key={job.id} style={styles.row}>
                    <View style={styles.savedTitle}>
                      <Text
                        numberOfLines={2}
                        style={[styles.savedName, {color: theme.colors.ink}]}>
                        {job.title}
                      </Text>
                      <Text style={[styles.savedEpisode, {color: theme.colors.muted}]}>
                        Episodio {job.episode}
                      </Text>
                    </View>
                    <View style={styles.actions}>
                      <Action
                        label="Guarda"
                        tone="accent"
                        onPress={() => onWatchSaved(job)}
                      />
                      <Action
                        label="Rewatch"
                        tone="accent"
                        onPress={() => rewatchSaved(job)}
                      />
                      <Action
                        label="Elimina"
                        tone="danger"
                        onPress={() => removeEpisode(job)}
                      />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}

        <Button label="Chiudi" variant="ghost" onPress={onClose} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 35,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(4, 9, 18, 0.6)',
  },
  card: {width: '100%', maxWidth: 560, maxHeight: '88%', gap: 10},
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},
  subtitle: {fontSize: 12, lineHeight: 17},
  tabs: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {fontSize: 12.5, fontWeight: '600'},
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  headText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  scroll: {maxHeight: 390, flexShrink: 1},
  list: {gap: 6, paddingVertical: 2},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  currentRow: {
    backgroundColor: 'rgba(234, 179, 8, 0.18)',
    borderColor: 'rgba(234, 179, 8, 0.55)',
  },
  watchedRow: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.45)',
  },
  number: {width: 34, fontSize: 15, fontWeight: '700', textAlign: 'center'},
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    flexShrink: 1,
  },
  action: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: {fontSize: 12, fontWeight: '700'},
  progress: {width: 128, gap: 4},
  percent: {fontSize: 11, fontWeight: '600', textAlign: 'right'},
  miniTrack: {height: 6, borderRadius: 999, overflow: 'hidden'},
  miniFill: {height: 6, borderRadius: 999},
  rowError: {fontSize: 10.5, maxWidth: 150},
  savedTitle: {flex: 1, minWidth: 0, gap: 2},
  savedName: {fontSize: 13.5, fontWeight: '700'},
  savedEpisode: {fontSize: 11.5},
  error: {fontSize: 12, lineHeight: 17},
});
