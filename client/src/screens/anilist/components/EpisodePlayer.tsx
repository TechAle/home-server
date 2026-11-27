import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {resolveEpisodeEmbed} from '../../../lib/anisaturn';
import {errorMessage} from '../../../lib/errors';
import {useAnimeLinks, useMarkWatched} from '../../../queries/anilist';
import {cursorPointer, useTheme} from '../../../theme';

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
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:contain;background:#000}</style></head><body><video src="${escapeAttribute(src)}" controls autoplay playsinline preload="auto"></video></body></html>`;
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
  onNext: (stream: {
    title: string;
    url: string;
    mediaId: number;
    progress: number;
    episode: number;
    mode: 'stream' | 'file';
    playUrl?: string;
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

    try {
      await markWatched.mutateAsync({mediaId, progress: newProgress});
      const result = await anime.refetch();
      const entry = result.data?.[title];

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
        episode: newProgress + 1,
        mode: 'stream',
      });
    } catch (nextFailure) {
      setNextError(errorMessage(nextFailure));
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
      <View style={styles.bar}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Prossimo episodio"
          disabled={nextLoading}
          onPress={handleNext}
          style={nextLoading ? undefined : cursorPointer}>
          <Text
            style={[
              styles.action,
              {
                color: theme.colors.accent,
                opacity: nextLoading ? 0.6 : 1,
              },
            ]}>
            {nextLoading ? '…' : 'Prossimo episodio'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={openInBrowser}
          style={cursorPointer}>
          <Text style={[styles.action, {color: theme.colors.accent}]}>
            Browser
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
          onPress={onClose}
          style={cursorPointer}>
          <Text style={styles.action}>✕</Text>
        </Pressable>
      </View>

      {nextError ? (
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
              <Text style={[styles.action, {color: theme.colors.accent}]}>
                Riprova
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openInBrowser}
              style={cursorPointer}>
              <Text style={[styles.action, {color: theme.colors.accent}]}>
                Apri nel browser
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={cursorPointer}>
              <Text style={styles.action}>Chiudi</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
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
  action: {fontSize: 13, fontWeight: '600', color: '#e8f0fc'},
  notice: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(229, 72, 77, 0.16)',
  },
  noticeText: {fontSize: 12, color: '#ff8f95'},
  video: {flex: 1},
  webview: {flex: 1, backgroundColor: '#000'},
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
