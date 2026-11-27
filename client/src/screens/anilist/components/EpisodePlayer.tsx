import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {fetchAnimeDownloads} from '../../../api/anilist';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {resolveEpisodeEmbed} from '../../../lib/anisaturn';
import {errorMessage} from '../../../lib/errors';
import {useAnimeLinks, useMarkWatched} from '../../../queries/anilist';
import {cursorPointer, useTheme} from '../../../theme';
import type {AnimeListStatus} from '../../../types/api';

/** Same browser identity the server uses for AniSaturn. */
const ANISATURN_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

/** Disable popups, alerts and target=_blank links inside the player. */
const NO_POPUPS_JS = `
(function () {
  try {
    window.open = function () { return null; };
    window.alert = function () {};
    window.confirm = function () { return false; };
    window.prompt = function () { return null; };
    document.addEventListener('click', function (event) {
      var node = event.target;
      while (node && node !== document) {
        if (node.tagName === 'A' && node.target === '_blank') {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        node = node.parentNode;
      }
    }, true);
  } catch (error) {}
})();
(function () {
  function post(value) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'player-fullscreen', value: value})
        );
      }
    } catch (error) {}
  }
  function leaveNative() {
    try { if (document.exitFullscreen) document.exitFullscreen(); } catch (error) {}
    try { if (document.webkitExitFullscreen) document.webkitExitFullscreen(); } catch (error) {}
  }
  document.addEventListener('fullscreenchange', function () {
    if (document.fullscreenElement) { leaveNative(); post(true); }
  }, true);
  document.addEventListener('webkitfullscreenchange', function () {
    if (document.webkitFullscreenElement) { leaveNative(); post(true); }
  }, true);
  document.addEventListener('webkitbeginfullscreen', function (event) {
    try { if (event.target && event.target.webkitExitFullscreen) event.target.webkitExitFullscreen(); } catch (error) {}
    post(true);
  }, true);
})();
true;
`;

/** Only the resolved /embed/ page may be loaded; every other navigation is dropped. */
function isAllowedEmbedRequest(requestUrl: string, embedUrl: string): boolean {
  if (requestUrl === 'about:blank') {return true;}
  if (/^(?:data|blob):/i.test(requestUrl)) {return true;}

  const allowed = /^https:\/\/([^/?#]+)(\/embed\/[^?#]*)/i.exec(embedUrl);
  if (!allowed) {return false;}
  const target = /^https:\/\/([^/?#]+)(\/embed\/[^?#]*)/i.exec(requestUrl);
  if (!target) {return false;}

  const trim = (value: string) => value.replace(/\/+$/, '');
  return (
    target[1].toLowerCase() === allowed[1].toLowerCase() &&
    trim(target[2]) === trim(allowed[2])
  );
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Minimal page for a downloaded MP4; the native video controls do the rest. */
function videoHtml(src: string): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:contain;background:#000}</style></head><body><video src="${escapeAttribute(src)}" controls autoplay playsinline preload="auto" tabindex="0"></video><script>(function(){var video=document.querySelector('video');if(!video)return;function focus(){try{video.focus();window.focus();}catch(e){}}video.addEventListener('loadedmetadata',focus);document.addEventListener('click',focus);document.addEventListener('keydown',function(event){var key=event.key||event.code||'';if(key!=='ArrowLeft'&&key!=='ArrowRight'&&key!=='Left'&&key!=='Right')return;event.preventDefault();event.stopPropagation();var delta=(key==='ArrowRight'||key==='Right')?5:-5;var next=video.currentTime+delta;if(next<0)next=0;if(Number.isFinite(video.duration)&&next>video.duration)next=video.duration;video.currentTime=next;},true);focus();})();</script></body></html>`;
}

interface EpisodePlayerProps {
  /** AniSaturn episode page; the client extracts the player iframe from it. */
  url: string;
  /** Direct MP4 of a server-side download; skips the embed resolution. */
  playUrl?: string;
  title: string;
  mediaId: number;
  /** AniList progress before opening this player. */
  progress: number;
  /** Episode currently being watched (1-based). */
  episode: number;
  /** CURRENT, PLANNING or REPEATING; preserves rewatches. */
  status: AnimeListStatus;
  /** Number of available episodes (for the picker). */
  episodes: number;
  /** AniSaturn anime URL without `/ep-N`. */
  episodeBase: string;
  onNext: (stream: {
    title: string;
    url: string;
    mediaId: number;
    progress: number;
    episode: number;
    status: AnimeListStatus;
    mode: 'stream' | 'file';
    playUrl?: string;
    episodes: number;
    episodeBase: string;
  }) => void;
  onClose: () => void;
}

export function EpisodePlayer({
  url,
  playUrl,
  title,
  mediaId,
  progress,
  episode,
  status,
  episodes,
  episodeBase,
  onNext,
  onClose,
}: EpisodePlayerProps) {
  const theme = useTheme();
  const anime = useAnimeLinks();
  const markWatched = useMarkWatched();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [webviewLoading, setWebviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [nextLoading, setNextLoading] = useState(false);
  const [nextError, setNextError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setResolving(true);
    setEmbedUrl(null);
    setError('');
    setNextError('');

    if (playUrl) {
      setEmbedUrl(playUrl);
      setResolving(false);
      setWebviewLoading(true);
      return () => {
        cancelled = true;
      };
    }

    resolveEpisodeEmbed(url)
      .then(resolvedUrl => {
        if (!cancelled) {
          setEmbedUrl(resolvedUrl);
          setWebviewLoading(true);
        }
      })
      .catch(reason => {
        if (!cancelled) {setError(errorMessage(reason));}
      })
      .finally(() => {
        if (!cancelled) {setResolving(false);}
      });

    return () => {
      cancelled = true;
    };
  }, [url, playUrl, attempt]);

  const openInBrowser = () => {
    Linking.openURL(playUrl ?? url).catch(() => {});
  };

  const handleNext = async () => {
    if (nextLoading) return;

    setNextLoading(true);
    setNextError('');
    // Rewatching an older downloaded episode must not lower the AniList
    // progress: mark the furthest episode between the current progress and the
    // one being watched.
    const newProgress = Math.max(progress, episode);
    const nextEpisode = newProgress + 1;
    const nextStatus: 'CURRENT' | 'REPEATING' =
      status === 'REPEATING' ? 'REPEATING' : 'CURRENT';

    try {
      await markWatched.mutateAsync({
        mediaId,
        progress: newProgress,
        status: nextStatus,
      });

      // Prefer an already-downloaded next episode; the stream is the fallback.
      const [result, downloads] = await Promise.all([
        anime.refetch(),
        fetchAnimeDownloads(title).catch(() => []),
      ]);
      const entry = result.data?.[title];
      const nextBase =
        entry?.episodeBase || episodeBase || url.replace(/\/ep-\d+\/?$/, '');
      const nextEpisodes = entry?.episodes ?? episodes;
      const downloaded = downloads.find(
        job =>
          job.episode === nextEpisode &&
          job.status === 'done' &&
          Boolean(job.playUrl),
      );
      const downloadedUrl = downloaded?.playUrl;

      if (downloadedUrl) {
        onNext({
          title,
          url: nextBase ? `${nextBase}/ep-${nextEpisode}` : '',
          mediaId,
          progress: newProgress,
          episode: nextEpisode,
          status: nextStatus,
          mode: 'file',
          playUrl: downloadedUrl,
          episodes: nextEpisodes,
          episodeBase: nextBase,
        });
        return;
      }

      if (!entry?.link[0]) {
        setNextError(
          'Episodio segnato come visto, ma il successivo non è ancora disponibile.',
        );
        return;
      }

      onNext({
        title,
        url: entry.link[0],
        mediaId,
        progress: newProgress,
        episode: nextEpisode,
        status: nextStatus,
        mode: 'stream',
        episodes: nextEpisodes,
        episodeBase: nextBase,
      });
    } catch (nextFailure) {
      setNextError(errorMessage(nextFailure));
    } finally {
      setNextLoading(false);
    }
  };

  /** Jump to any episode; a downloaded target wins over the stream. */
  const goToEpisode = async (target: number) => {
    if (
      nextLoading ||
      target < 1 ||
      (episodes > 0 && target > episodes) ||
      target === episode
    ) {
      setPickerOpen(false);
      return;
    }

    setPickerOpen(false);
    setNextLoading(true);
    setNextError('');
    const base = episodeBase || url.replace(/\/ep-\d+\/?$/, '');

    try {
      const downloads = await fetchAnimeDownloads(title).catch(() => []);
      const downloaded = downloads.find(
        job =>
          job.episode === target &&
          job.status === 'done' &&
          Boolean(job.playUrl),
      );
      const downloadedUrl = downloaded?.playUrl;

      if (downloadedUrl) {
        onNext({
          title,
          url: base ? `${base}/ep-${target}` : '',
          mediaId,
          progress,
          episode: target,
          status,
          mode: 'file',
          playUrl: downloadedUrl,
          episodes,
          episodeBase: base,
        });
        return;
      }

      if (!base) {
        setNextError('Link episodio non disponibile.');
        return;
      }

      onNext({
        title,
        url: `${base}/ep-${target}`,
        mediaId,
        progress,
        episode: target,
        status,
        mode: 'stream',
        episodes,
        episodeBase: base,
      });
    } catch (failure) {
      setNextError(errorMessage(failure));
    } finally {
      setNextLoading(false);
    }
  };

  const loading = resolving || (Boolean(embedUrl) && webviewLoading);

  return (
    <SafeAreaView
      accessibilityViewIsModal
      style={[
        styles.root,
        Platform.OS === 'android' && {paddingTop: StatusBar.currentHeight ?? 0},
      ]}>
      {!fullscreen ? (
        <>
          <View style={styles.bar}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Schermo intero"
          onPress={() => setFullscreen(true)}
          style={cursorPointer}>
          <Text pointerEvents="none" style={styles.action}>⛶</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={openInBrowser}
          style={cursorPointer}>
          <Text pointerEvents="none" style={[styles.action, {color: theme.colors.accent}]}>
            Browser
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
          onPress={onClose}
          style={cursorPointer}>
          <Text pointerEvents="none" style={styles.action}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          disabled={episode <= 1 || nextLoading}
          onPress={() => goToEpisode(episode - 1)}
          style={episode <= 1 ? undefined : cursorPointer}>
          <Text
            pointerEvents="none"
            style={[
              styles.controlText,
              {color: theme.colors.accent, opacity: episode <= 1 ? 0.4 : 1},
            ]}>
            ‹ Prec.
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scegli episodio"
          onPress={() => setPickerOpen(true)}
          style={[styles.episodeButton, cursorPointer]}>
          <Text pointerEvents="none" style={styles.controlText}>
            Ep. {episode}
            {episodes > 0 ? ` / ${episodes}` : ''}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Prossimo episodio"
          disabled={nextLoading}
          onPress={handleNext}
          style={nextLoading ? undefined : cursorPointer}>
          <Text
            pointerEvents="none"
            style={[
              styles.controlText,
              {color: theme.colors.accent, opacity: nextLoading ? 0.6 : 1},
            ]}>
            {nextLoading ? '…' : 'Pross. ›'}
          </Text>
        </Pressable>
        {playUrl ? <Text style={styles.keyHint}>←/→ 5s</Text> : null}
      </View>
        </>
      ) : null}

      {nextError && !fullscreen ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{nextError}</Text>
        </View>
      ) : null}

      <View style={styles.video}>
        {embedUrl ? (
          <WebView
            source={playUrl ? {html: videoHtml(playUrl)} : {uri: embedUrl}}
            style={styles.webview}
            userAgent={ANISATURN_USER_AGENT}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            setSupportMultipleWindows={false}
            javaScriptCanOpenWindowsAutomatically={false}
            onShouldStartLoadWithRequest={request =>
              playUrl ? true : isAllowedEmbedRequest(request.url, embedUrl ?? '')
            }
            injectedJavaScriptBeforeContentLoaded={NO_POPUPS_JS}
            injectedJavaScript={NO_POPUPS_JS}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            injectedJavaScriptForMainFrameOnly={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            onLoadStart={() => setWebviewLoading(true)}
            onLoadEnd={() => setWebviewLoading(false)}
            onError={event => {
              setWebviewLoading(false);
              setError(
                event.nativeEvent.description ??
                  'Impossibile caricare il player.',
              );
            }}
            onHttpError={event => {
              setWebviewLoading(false);
              setError(`HTTP ${event.nativeEvent.statusCode}`);
            }}
            onMessage={event => {
              try {
                const payload = JSON.parse(event.nativeEvent.data) as {
                  type?: string;
                  value?: boolean;
                };
                if (payload.type === 'player-fullscreen') {
                  setFullscreen(Boolean(payload.value));
                }
              } catch {
                // Other injected scripts may post non-JSON messages.
              }
            }}
          />
        ) : null}

        {loading ? (
          <View pointerEvents="none" style={styles.center}>
            <ActivityIndicator color={theme.colors.accent} size="large" />
            {resolving ? (
              <Text style={styles.loadingText}>Preparazione del player…</Text>
            ) : null}
          </View>
        ) : null}

        {error && !resolving ? (
          <View style={[styles.center, styles.errorOverlay]}>
            <Text style={styles.error}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setAttempt(value => value + 1)}
              style={cursorPointer}>
              <Text pointerEvents="none" style={[styles.action, {color: theme.colors.accent}]}>
                Riprova
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openInBrowser}
              style={cursorPointer}>
              <Text pointerEvents="none" style={[styles.action, {color: theme.colors.accent}]}>
                Apri nel browser
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={cursorPointer}>
              <Text pointerEvents="none" style={styles.action}>Chiudi</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {fullscreen ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Prossimo episodio"
            disabled={nextLoading}
            onPress={handleNext}
            style={[
              styles.fsNext,
              nextLoading ? styles.fsNextLoading : cursorPointer,
            ]}>
            <Text pointerEvents="none" style={styles.fsNextText}>
              {nextLoading ? '…' : '→'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Esci da schermo intero"
            onPress={() => setFullscreen(false)}
            style={[styles.fsExit, cursorPointer]}>
            <Text pointerEvents="none" style={styles.fsExitText}>✕</Text>
          </Pressable>
          {nextError ? <Text style={styles.fsError}>{nextError}</Text> : null}
        </>
      ) : null}

      {pickerOpen ? (
        <EpisodePicker
          current={episode}
          total={episodes || Math.max(episode, progress + 1)}
          onSelect={goToEpisode}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function EpisodePicker({
  current,
  total,
  onSelect,
  onClose,
}: {
  current: number;
  total: number;
  onSelect: (episode: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const numbers = Array.from({length: Math.max(1, total)}, (_, index) => index + 1);

  return (
    <View style={[StyleSheet.absoluteFill, styles.pickerOverlay]} accessibilityViewIsModal>
      <Card style={styles.pickerCard}>
        <Text style={[styles.pickerEyebrow, {color: theme.colors.accent}]}>
          Episodi
        </Text>
        <Text style={[styles.pickerTitle, {color: theme.colors.ink}]}>
          Scegli episodio
        </Text>
        <Text style={[styles.pickerHint, {color: theme.colors.muted}]}>
          Episodio {current} di {total}
        </Text>
        <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.pickerGrid}>
          {numbers.map(number => {
            const selected = number === current;
            return (
              <Pressable
                key={number}
                accessibilityRole="button"
                accessibilityState={{selected}}
                onPress={() => onSelect(number)}
                style={[
                  styles.pickerNumber,
                  cursorPointer,
                  {
                    borderColor: selected
                      ? theme.colors.accent
                      : theme.colors.line,
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.card,
                  },
                ]}>
                <Text
                  pointerEvents="none"
                  style={[
                    styles.pickerNumberText,
                    {
                      color: selected
                        ? theme.colors.onAccent
                        : theme.colors.ink2,
                    },
                  ]}>
                  {number}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button label="Chiudi" variant="ghost" onPress={onClose} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    backgroundColor: '#000',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0b1420',
  },
  title: {flex: 1, fontSize: 13.5, fontWeight: '600', color: '#e8f0fc'},
  keyHint: {fontSize: 11, fontWeight: '600', color: '#93a9c9'},
  action: {fontSize: 13, fontWeight: '600', color: '#e8f0fc'},
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0b1420',
    borderBottomWidth: 1,
    borderBottomColor: '#152238',
  },
  controlText: {fontSize: 12.5, fontWeight: '600', color: '#e8f0fc'},
  episodeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#24344d',
  },
  notice: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(229, 72, 77, 0.16)',
  },
  noticeText: {fontSize: 12, color: '#ff8f95'},
  video: {flex: 1},
  webview: {flex: 1, backgroundColor: '#000'},
  fsNext: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 52,
  },
  fsNextLoading: {opacity: 0.6},
  fsNextText: {color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 18},
  fsExit: {
    position: 'absolute',
    top: 10,
    right: 42,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 52,
  },
  fsExitText: {color: '#fff', fontSize: 13},
  fsError: {
    position: 'absolute',
    top: 44,
    left: 20,
    right: 20,
    color: '#ff8f95',
    textAlign: 'center',
    fontSize: 12.5,
    zIndex: 51,
  },
  pickerOverlay: {
    zIndex: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(4, 9, 18, 0.65)',
  },
  pickerCard: {width: '100%', maxWidth: 520, maxHeight: '82%', gap: 10},
  pickerEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  pickerTitle: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},
  pickerHint: {fontSize: 12},
  pickerScroll: {maxHeight: 420, flexShrink: 1},
  pickerGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4},
  pickerNumber: {
    width: 46,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerNumberText: {fontSize: 13.5, fontWeight: '700'},
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {fontSize: 12.5, color: '#93a9c9'},
  errorOverlay: {backgroundColor: 'rgba(0, 0, 0, 0.82)'},
  error: {fontSize: 13, color: '#ff8f95', textAlign: 'center'},
});
