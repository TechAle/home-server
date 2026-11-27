import {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Brand} from '../../components/ui/Brand';
import {Button} from '../../components/ui/Button';
import {Card} from '../../components/ui/Card';
import {ServerModeToggle} from '../../components/ui/ServerModeToggle';
import {TextField} from '../../components/ui/TextField';
import {ThemeToggle} from '../../components/ui/ThemeToggle';
import {errorMessage} from '../../lib/errors';
import {useRegister} from '../../queries/auth';
import {cursorPointer, useTheme} from '../../theme';

interface RegisterScreenProps {
  onLogin: () => void;
  onToggleTheme: () => void;
}

export function RegisterScreen({onLogin, onToggleTheme}: RegisterScreenProps) {
  const theme = useTheme();
  const register = useRegister();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registrationKey, setRegistrationKey] = useState('');
  const [revealKey, setRevealKey] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (register.isPending) {return;}
    setError('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password || !registrationKey.trim()) {
      setError('Username, password e API key sono obbligatori.');
      return;
    }
    if (password.length < 8) {
      setError('La password deve avere almeno 8 caratteri.');
      return;
    }

    register.mutate(
      {
        username: cleanUsername,
        password,
        registrationKey: registrationKey.trim(),
      },
      {onError: mutationError => setError(errorMessage(mutationError))},
    );
  };

  return (
    <View style={styles.root}>
      <SafeAreaView
        style={[
          styles.safe,
          Platform.OS === 'android' && {
            paddingTop: StatusBar.currentHeight ?? 0,
          },
        ]}>
        <View style={styles.toggle}>
          <ThemeToggle onToggle={onToggleTheme} />
        </View>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Card style={styles.card}>
              <View style={styles.brandRow}>
                <Brand />
              </View>

              <Text style={[styles.eyebrow, {color: theme.colors.brandDim}]}>
                Registrazione
              </Text>
              <Text style={[styles.title, {color: theme.colors.brandText}]}>
                Crea il tuo account
              </Text>
              <Text style={[styles.muted, {color: theme.colors.muted}]}>
                Serve la API key del server: si trova nel file{' '}
                <Text style={{fontWeight: '700'}}>.env</Text>.
              </Text>

              <View style={styles.form}>
                <TextField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="almeno 3 caratteri"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="almeno 8 caratteri"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  returnKeyType="next"
                />
                <TextField
                  key={revealKey ? 'api-key-visible' : 'api-key-hidden'}
                  label="API Key"
                  value={registrationKey}
                  onChangeText={setRegistrationKey}
                  placeholder="la chiave di registrazione"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!revealKey}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  rightAction={{
                    label: revealKey ? 'Nascondi' : 'Mostra',
                    onPress: () => setRevealKey(value => !value),
                  }}
                />

                <Text style={[styles.error, {color: theme.colors.danger}]}>
                  {error}
                </Text>

                <Button
                  label="Crea account"
                  onPress={submit}
                  loading={register.isPending}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={onLogin}
                style={[styles.footer, cursorPointer]}>
                <Text style={[styles.footerText, {color: theme.colors.muted}]}>
                  Hai già un account?{' '}
                  <Text
                    style={{
                      color: theme.colors.accent,
                      fontWeight: '600',
                    }}>
                    Accedi
                  </Text>
                </Text>
              </Pressable>

              <ServerModeToggle />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  safe: {flex: 1},
  toggle: {position: 'absolute', top: 12, right: 16, zIndex: 3},
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {width: '100%', maxWidth: 420},
  brandRow: {marginBottom: 26},
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8},
  muted: {fontSize: 14, lineHeight: 21},
  form: {marginTop: 24, gap: 14},
  error: {fontSize: 12.5, minHeight: 18},
  footer: {marginTop: 18, alignItems: 'center'},
  footerText: {fontSize: 13},
});
