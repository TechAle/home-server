import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {Card} from '../../components/ui/Card';
import {PageHead} from '../../components/ui/PageHead';
import {useTheme} from '../../theme';

interface PlaceholderScreenProps {
  icon: string;
  title: string;
  subtitle: string;
}

export function PlaceholderScreen({
  icon,
  title,
  subtitle,
}: PlaceholderScreenProps) {
  const theme = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.content}>
        <PageHead eyebrow="Servizio" title={title} subtitle={subtitle} />

        <Card style={styles.card}>
          <Text style={[styles.icon, {color: theme.colors.accent}]}>{icon}</Text>
          <Text style={[styles.title, {color: theme.colors.ink}]}>
            In arrivo
          </Text>
          <Text style={[styles.text, {color: theme.colors.muted}]}>
            Questo servizio non ha ancora un endpoint nel backend.
          </Text>
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
  card: {alignItems: 'center', gap: 10, paddingVertical: 40},
  icon: {fontSize: 34},
  title: {fontSize: 18, fontWeight: '700'},
  text: {fontSize: 13, textAlign: 'center', maxWidth: 360},
});
