import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../theme';
import {Background} from './Background';
import {Brand} from './Brand';
import {Card} from './Card';

export function Splash() {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <Background variant="login" />
      <View style={styles.center}>
        <Card style={styles.card}>
          <Brand size={17} />
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={[styles.text, {color: theme.colors.muted}]}>
            Verifica della sessione…
          </Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {width: '100%', maxWidth: 360, alignItems: 'center', gap: 16},
  text: {fontSize: 13},
});
