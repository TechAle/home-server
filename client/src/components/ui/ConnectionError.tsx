import {StyleSheet, Text, View} from 'react-native';
import {errorMessage} from '../../lib/errors';
import {useTheme} from '../../theme';
import {Brand} from './Brand';
import {Button} from './Button';
import {Screen} from './Screen';

interface ConnectionErrorProps {
  error: unknown;
  onRetry: () => void;
  onLogout: () => void;
}

export function ConnectionError({
  error,
  onRetry,
  onLogout,
}: ConnectionErrorProps) {
  const theme = useTheme();

  return (
    <Screen>
      <View style={styles.center}>
        <Brand size={17} />
        <Text style={[styles.title, {color: theme.colors.ink}]}>
          Server non raggiungibile
        </Text>
        <Text style={[styles.message, {color: theme.colors.muted}]}>
          {errorMessage(error)}
        </Text>
        <Button label="Riprova" onPress={onRetry} style={styles.button} />
        <Button
          label="Esci"
          onPress={onLogout}
          variant="ghost"
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  title: {fontSize: 22, fontWeight: '700', textAlign: 'center'},
  message: {fontSize: 14, textAlign: 'center', maxWidth: 360},
  button: {width: '100%', maxWidth: 360},
});
