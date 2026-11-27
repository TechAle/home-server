import {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {startAnimeDownload} from '../../../api/anilist';
import {Button} from '../../../components/ui/Button';
import {Card} from '../../../components/ui/Card';
import {errorMessage} from '../../../lib/errors';
import {useAnimeDownload} from '../../../queries/anilist';
import {useTheme} from '../../../theme';

export interface DownloadRequest {
  title: string;
  episode: number;
  url: string;
  mediaId: number;
  progress: number;
}

interface DownloadOverlayProps {
  request: DownloadRequest;
  onDone: (playUrl: string) => void;
  onClose: () => void;
}

function megabytes(bytes: number): string {
  if (bytes <= 0) {
    return '—';
  }
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

/** Starts a server-side download and polls it until the MP4 is ready. */
export function DownloadOverlay({request, onDone, onClose}: DownloadOverlayProps) {
  const theme = useTheme();
  const [jobId, setJobId] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const [startError, setStartError] = useState('');
  const played = useRef(false);
  const playUrlRef = useRef<string | null>(null);
  const onDoneRef = useRef(onDone);
  const job = useAnimeDownload(jobId);

  useEffect(() => {
    let cancelled = false;
    setStarting(true);

    startAnimeDownload({
      url: request.url,
      title: request.title,
      episode: request.episode,
    })
      .then(started => {
        if (!cancelled) setJobId(started.id);
      })
      .catch(failure => {
        if (!cancelled) setStartError(errorMessage(failure));
      })
      .finally(() => {
        if (!cancelled) setStarting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [request.url, request.title, request.episode]);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    playUrlRef.current = job.data?.playUrl ?? null;
  }, [job.data?.playUrl]);

  const done = job.data?.status === 'done';

  // Leave the completed bar visible for a moment before opening the player.
  useEffect(() => {
    if (!done) {
      return;
    }
    const id = setTimeout(() => {
      if (played.current || !playUrlRef.current) {
        return;
      }
      played.current = true;
      onDoneRef.current(playUrlRef.current);
    }, 800);
    return () => clearTimeout(id);
  }, [done]);

  const progress = done ? 100 : (job.data?.progress ?? 0);
  const error =
    startError ||
    job.data?.error ||
    (job.isError ? errorMessage(job.error) : '');

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]} accessibilityViewIsModal>
      <Card style={styles.card}>
        <Text style={[styles.eyebrow, {color: theme.colors.accent}]}>
          Download episodio {request.episode}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.title, {color: theme.colors.ink}]}>
          {request.title}
        </Text>

        {error ? (
          <Text style={[styles.error, {color: theme.colors.danger}]}>{error}</Text>
        ) : (
          <>
            <View style={styles.statusRow}>
              {!done && (starting || !jobId) ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : null}
              <Text style={[styles.status, {color: theme.colors.ink2}]}>
                {done
                  ? 'Download completato'
                  : starting || !jobId
                    ? 'Preparazione del download…'
                    : 'Download in corso…'}
              </Text>
            </View>
            <View
              style={[
                styles.track,
                {backgroundColor: theme.colors.line},
              ]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, Math.max(0, progress))}%`,
                    backgroundColor: theme.colors.accent,
                  },
                ]}
              />
            </View>
            <Text style={[styles.meta, {color: theme.colors.muted}]}>
              {progress.toFixed(1)}% · {megabytes(job.data?.bytes ?? 0)} /{' '}
              {megabytes(job.data?.total ?? 0)}
            </Text>
            <Text style={[styles.hint, {color: theme.colors.muted}]}>
              {done
                ? 'Apro il player…'
                : 'Il download continua sul server anche se chiudi questa finestra.'}
            </Text>
          </>
        )}

        <Button label={error || done ? 'Chiudi' : 'Annulla'} variant="ghost" onPress={onClose} />
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
    backgroundColor: 'rgba(4, 9, 18, 0.55)',
  },
  card: {width: '100%', maxWidth: 420, gap: 12},
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {fontSize: 18, fontWeight: '700', letterSpacing: -0.3},
  status: {fontSize: 13, fontWeight: '600'},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  track: {height: 10, borderRadius: 999, overflow: 'hidden'},
  fill: {height: 10, borderRadius: 999},
  meta: {fontSize: 12},
  hint: {fontSize: 11.5, lineHeight: 17},
  error: {fontSize: 12.5, lineHeight: 18},
});
