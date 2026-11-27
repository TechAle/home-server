import {useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Card} from '../../components/ui/Card';
import {MetricBar} from '../../components/ui/MetricBar';
import {PageHead} from '../../components/ui/PageHead';
import {useWindowSize} from '../../hooks/useWindowSize';
import {
  formatGib,
  formatPercent,
  formatTemperature,
  isUnavailable,
} from '../../lib/format';
import {
  useComputerInfo,
  useSystemResources,
} from '../../queries/computer';
import {useTheme} from '../../theme';

function ratio(value: number | undefined, max = 100): number {
  if (isUnavailable(value) || !value) {return 0;}
  return value / max;
}

function externalIp(value: string | number | undefined): string {
  if (value == null) {return '—';}
  if (typeof value === 'number') {return isUnavailable(value) ? '—' : String(value);}
  return value;
}

export function RaspberryScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const {width} = useWindowSize();
  const info = useComputerInfo();
  const resources = useSystemResources();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  };

  const data = resources.data;
  const hostname = info.data?.hostname ?? info.data?.node_name ?? '—';

  const metrics = [
    {
      label: 'CPU',
      value: formatPercent(data?.cpu_usage_percent),
      ratio: ratio(data?.cpu_usage_percent),
    },
    {
      label: 'RAM',
      value: formatPercent(data?.ram.percent_used),
      ratio: ratio(data?.ram.percent_used),
    },
    {
      label: 'Temperatura',
      value: formatTemperature(data?.cpu_temperature),
      ratio: ratio(data?.cpu_temperature),
    },
    {
      label: 'Disco',
      value: formatPercent(data?.disk.percent_used),
      ratio: ratio(data?.disk.percent_used),
      hint: `${formatGib(data?.disk.free_gib)} liberi di ${formatGib(
        data?.disk.total_gib,
      )}`,
    },
  ];

  const infoRows = [
    {
      label: 'Sistema',
      value:
        [info.data?.system, info.data?.release].filter(Boolean).join(' ') || '—',
    },
    {label: 'Macchina', value: info.data?.machine ?? '—'},
    {label: 'Processore', value: info.data?.processor ?? '—'},
    {label: 'Hostname', value: info.data?.hostname ?? '—'},
    {label: 'IP locale', value: info.data?.ip_address ?? '—'},
    {label: 'IP esterno', value: externalIp(info.data?.external_ip)},
  ];

  const twoColumns = width >= 700;

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
          title="Raspberry Pi"
          subtitle={`Sistema · ${hostname}`}
          status={{online: !resources.isError, updatedAt: resources.dataUpdatedAt}}
          onRefresh={refresh}
        />

        <View style={styles.grid}>
          {metrics.map(metric => (
            <View
              key={metric.label}
              style={{width: twoColumns ? '48%' : '100%'}}>
              <Card style={styles.metricCard}>
                <MetricBar {...metric} />
              </Card>
            </View>
          ))}
        </View>

        <Card style={styles.infoCard}>
          <Text style={[styles.cardTitle, {color: theme.colors.ink}]}>
            Sistema
          </Text>
          {infoRows.map(row => (
            <View
              key={row.label}
              style={[styles.infoRow, {borderTopColor: theme.colors.line}]}>
              <Text style={[styles.infoLabel, {color: theme.colors.muted}]}>
                {row.label}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.infoValue, {color: theme.colors.ink}]}>
                {row.value}
              </Text>
            </View>
          ))}
        </Card>
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
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 14},
  metricCard: {gap: 0},
  infoCard: {gap: 0},
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  infoLabel: {fontSize: 12.5, fontWeight: '600'},
  infoValue: {flex: 1, textAlign: 'right', fontSize: 12.5},
});
