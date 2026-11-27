import {useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type {MainRoute} from '../../app/navigation/routes';
import {PageHead} from '../../components/ui/PageHead';
import {ServiceCard} from '../../components/ui/ServiceCard';
import type {StatusTone} from '../../components/ui/StatusBadge';
import {errorMessage} from '../../lib/errors';
import {useNow} from '../../hooks/useNow';
import {
  formatAgo,
  formatGib,
  formatPercent,
  formatTemperature,
} from '../../lib/format';
import {useAnimeLinks} from '../../queries/anilist';
import {
  useComputerInfo,
  useSystemResources,
} from '../../queries/computer';
import {useAuthStore} from '../../store/auth';
import {useTheme} from '../../theme';

interface DashboardScreenProps {
  onOpen: (route: MainRoute) => void;
}

function greeting(hour: number): string {
  if (hour < 12) {return 'Buongiorno';}
  if (hour < 18) {return 'Buon pomeriggio';}
  return 'Buonasera';
}

export function DashboardScreen({onOpen}: DashboardScreenProps) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const {width} = useWindowDimensions();

  const username = useAuthStore(state => state.username) ?? 'utente';
  const info = useComputerInfo();
  const resources = useSystemResources();
  const anime = useAnimeLinks();
  const now = useNow();

  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  };

  const titles = Object.values(anime.data ?? {});
  const waiting = titles.filter(
    item => Boolean(item.nextEpisode) && item.link.length === 0,
  ).length;
  const hostname = info.data?.hostname ?? info.data?.node_name ?? '—';
  const system = info.data?.system ?? '';
  const updatedAt = Math.max(resources.dataUpdatedAt, info.dataUpdatedAt);

  const raspberryStatus: {tone: StatusTone; label: string} = resources.isError
    ? {tone: 'danger', label: 'offline'}
    : resources.isPending
      ? {tone: 'muted', label: 'carico'}
      : {tone: 'ok', label: 'online'};

  const animeStatus: {tone: StatusTone; label: string} = anime.isError
    ? {tone: 'danger', label: 'errore'}
    : anime.isPending
      ? {tone: 'muted', label: 'carico'}
      : {tone: 'ok', label: 'online'};

  const cards = [
    <ServiceCard
      key="raspberry"
      icon="◐"
      title="Raspberry Pi"
      subtitle={`Sistema · ${hostname}`}
      status={raspberryStatus}
      loading={resources.isPending}
      onPress={() => onOpen('raspberry')}
      stats={[
        {
          label: 'CPU',
          value: formatPercent(resources.data?.cpu_usage_percent),
        },
        {
          label: 'RAM',
          value: formatPercent(resources.data?.ram.percent_used),
        },
        {
          label: 'Temp',
          value: formatTemperature(resources.data?.cpu_temperature),
        },
        {
          label: 'Disco',
          value: formatPercent(resources.data?.disk.percent_used),
        },
      ]}
      footer={
        system
          ? `${system} · ${formatGib(resources.data?.disk.free_gib)} liberi`
          : undefined
      }
    />,
    <ServiceCard
      key="anilist"
      icon="◈"
      title="AniList"
      subtitle="Bot · sincronizzazione lista"
      status={animeStatus}
      loading={anime.isPending}
      onPress={() => onOpen('anilist')}
      stats={[
        {label: 'In visione', value: String(titles.length)},
        {label: 'In attesa', value: String(waiting)},
        {label: 'Aggiornato', value: formatAgo(anime.dataUpdatedAt, now)},
      ]}
      footer={anime.isError ? errorMessage(anime.error) : undefined}
    />,
    <ServiceCard
      key="files"
      icon="▤"
      title="File Server"
      subtitle="Samba · condivisioni"
      status={{tone: 'muted', label: 'presto'}}
      onPress={() => onOpen('files')}
      stats={[
        {label: 'Condivisioni', value: '—'},
        {label: 'Spazio usato', value: '—'},
      ]}
      footer="In arrivo"
    />,
    <ServiceCard
      key="media"
      icon="▦"
      title="Media"
      subtitle="Libreria locale · foto e video"
      status={{tone: 'muted', label: 'presto'}}
      onPress={() => onOpen('media')}
      stats={[
        {label: 'Elementi', value: '—'},
        {label: 'Ultima scansione', value: '—'},
      ]}
      footer="In arrivo"
    />,
    <ServiceCard
      key="backup"
      icon="⛁"
      title="Backup"
      subtitle="Pianificazione · retention"
      status={{tone: 'muted', label: 'presto'}}
      onPress={() => onOpen('backup')}
      stats={[
        {label: 'Ultimo', value: '—'},
        {label: 'Prossimo', value: '—'},
      ]}
      footer="In arrivo"
    />,
  ];

  const twoColumns = width >= 760;

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
          eyebrow={`${greeting(new Date().getHours())}, ${username}`}
          title="Dashboard"
          subtitle="Stato dei servizi"
          status={{online: !resources.isError, updatedAt}}
          onRefresh={refresh}
        />

        <View style={styles.grid}>
          {cards.map(card => (
            <View
              key={card.key}
              style={{width: twoColumns ? '48%' : '100%'}}>
              {card}
            </View>
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
    gap: 22,
  },
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
});
