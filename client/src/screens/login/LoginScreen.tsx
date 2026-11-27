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
import {TextField} from '../../components/ui/TextField';
import {ThemeToggle} from '../../components/ui/ThemeToggle';
import {errorMessage} from '../../lib/errors';
import {useLogin} from '../../queries/auth';
import {useSettingsStore} from '../../store/settings';
import {useTheme} from '../../theme';

interface LoginScreenProps {
  onRegister: () => void;
  onToggleTheme: () => void;
}

export function LoginScreen({onRegister, onToggleTheme}: LoginScreenProps) {
  const theme = useTheme();
  const login = useLogin();
  const baseUrl = useSettingsStore(state => state.baseUrl);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (login.isPending) {return;}
    setError('');

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Inserisci username e password.');
      return;
    }

    login.mutate(
      {username: cleanUsername, password},
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

              <Text style={[styles.title, {color: theme.colors.brandText}]}>
                Welcome to Home
              </Text>
              <Text style={[styles.muted, {color: theme.colors.muted}]}>
                Accedi per gestire il tuo home server.
              </Text>

              <View style={styles.form}>
                <TextField
                  label="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="il tuo username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TextField
                  key={revealPassword ? 'password-visible' : 'password-hidden'}
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!revealPassword}
                  returnKeyType="go"
                  onSubmitEditing={submit}
                  rightAction={{
                    label: revealPassword ? 'Nascondi' : 'Mostra',
                    onPress: () => setRevealPassword(value => !value),
                  }}
                />

                <Text style={[styles.error, {color: theme.colors.danger}]}>
                  {error}
                </Text>

                <Button
                  label="Entra"
                  onPress={submit}
                  loading={login.isPending}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={onRegister}
                style={styles.footer}>
                <Text style={[styles.footerText, {color: theme.colors.muted}]}>
                  Non hai un account?{' '}
                  <Text
                    style={{
                      color: theme.colors.accent,
                      fontWeight: '600',
                    }}>
                    Registrati
                  </Text>
                </Text>
              </Pressable>
            </Card>

            <View style={styles.statusRow}>
              <View
                style={[styles.liveDot, {backgroundColor: theme.colors.ok}]}
              />
              <Text style={[styles.statusText, {color: theme.colors.muted}]}>
                server locale · {baseUrl.replace(/^https?:\/\//, '')}
              </Text>
            </View>
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
    gap: 18,
  },
  card: {width: '100%', maxWidth: 420},
  brandRow: {marginBottom: 26},
  title: {fontSize: 30, fontWeight: '700', letterSpacing: -0.6, marginBottom: 8},
  muted: {fontSize: 14, lineHeight: 21},
  form: {marginTop: 24, gap: 14},
  error: {fontSize: 12.5, minHeight: 18},
  footer: {marginTop: 18, alignItems: 'center'},
  footerText: {fontSize: 13},
  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  liveDot: {width: 7, height: 7, borderRadius: 4},
  statusText: {fontSize: 12},
});
