import {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from '../../components/ui/Button';
import {Card} from '../../components/ui/Card';
import {StatusBadge, type StatusTone} from '../../components/ui/StatusBadge';
import {errorMessage} from '../../lib/errors';
import {
  useFoundryStatus,
  useRestartFoundry,
  useStartFoundry,
} from '../../queries/foundry';
import {useTheme} from '../../theme';

/** Foundry is managed on the host; this card only checks and restarts it. */
export function FoundryCard() {
  const theme = useTheme();
  const status = useFoundryStatus();
  const start = useStartFoundry();
  const restart = useRestartFoundry();
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState('');

  // Foundry takes a few seconds to bind its port; avoid a second restart.
  useEffect(() => {
    if (!cooldown) {
      return;
    }
    const id = setTimeout(() => setCooldown(false), 15_000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const online = Boolean(status.data?.online);
  const busy = start.isPending || restart.isPending || cooldown;

  const run = async () => {
    if (busy) {
      return;
    }

    setError('');
    try {
      await (online ? restart.mutateAsync() : start.mutateAsync());
      setCooldown(true);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };

  const badge: {tone: StatusTone; label: string} = status.isPending
    ? {tone: 'muted', label: 'verifica'}
    : online
      ? {tone: 'ok', label: 'online'}
      : {tone: 'danger', label: 'offline'};

  const detail = error || status.data?.error;

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, {backgroundColor: theme.colors.accentSoft}]}>
          <Text style={[styles.iconText, {color: theme.colors.accent}]}>🎲</Text>
        </View>
        <View style={styles.titles}>
          <Text style={[styles.title, {color: theme.colors.ink}]}>
            Foundry VTT
          </Text>
          <Text style={[styles.subtitle, {color: theme.colors.muted}]}>
            Server di gioco · porta 30000
          </Text>
        </View>
        <StatusBadge tone={badge.tone} label={badge.label} />
      </View>

      <Button
        label={online ? 'Riavvia' : 'Avvia'}
        onPress={run}
        loading={busy}
        disabled={busy}
        variant={online ? 'ghost' : 'primary'}
      />

      {detail ? (
        <Text style={[styles.note, {color: theme.colors.danger}]}>{detail}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {gap: 14, flex: 1},
  head: {flexDirection: 'row', alignItems: 'center', gap: 11},
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {fontSize: 18},
  titles: {flex: 1, minWidth: 0},
  title: {fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2},
  subtitle: {fontSize: 12, marginTop: 1},
  note: {fontSize: 12, lineHeight: 18},
});
