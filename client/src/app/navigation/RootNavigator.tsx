/**
 * Auth gate + minimal navigator.
 *
 * The project also targets macOS, where react-native-screens (and therefore
 * React Navigation's native stack) is not supported. This keeps the same
 * structure — app/navigation owns the routes, screens stay dumb — with a plain
 * state machine; swapping in React Navigation later only touches this file.
 */
import {useState} from 'react';
import {View} from 'react-native';
import {Background} from '../../components/ui/Background';
import {ConnectionError} from '../../components/ui/ConnectionError';
import {Splash} from '../../components/ui/Splash';
import {useAuthHydrated} from '../../hooks/useAuthHydrated';
import {useMe} from '../../queries/auth';
import {LoginScreen} from '../../screens/login/LoginScreen';
import {RegisterScreen} from '../../screens/register/RegisterScreen';
import {useAuthStore} from '../../store/auth';
import {useSettingsStore} from '../../store/settings';
import {MainNavigator} from './MainNavigator';
import type {PublicRoute} from './routes';

export function RootNavigator() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore(state => state.token);

  // The splash uses the app theme: day sky in light, Vanta in dark.
  if (!hydrated) {
    return <Splash />;
  }

  if (!token) {
    return <PublicNavigator />;
  }

  return <AuthenticatedApp />;
}

function PublicNavigator() {
  const [route, setRoute] = useState<PublicRoute>('login');
  const toggleTheme = useSettingsStore(state => state.toggleTheme);

  // The login uses the app theme: light in the home means a day login, dark
  // means the Vanta night. The toggle changes both at once.
  return (
    <View style={styles.root}>
      {/* Outside the route switch: switching login/register keeps Vanta alive. */}
      <Background variant="login" />

      {route === 'register' ? (
        <RegisterScreen
          onLogin={() => setRoute('login')}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <LoginScreen
          onRegister={() => setRoute('register')}
          onToggleTheme={toggleTheme}
        />
      )}
    </View>
  );
}

function AuthenticatedApp() {
  const me = useMe();
  const clearSession = useAuthStore(state => state.clearSession);

  if (me.isPending) {
    return <Splash />;
  }

  if (me.isError) {
    return (
      <ConnectionError
        error={me.error}
        onRetry={() => {
          me.refetch();
        }}
        onLogout={clearSession}
      />
    );
  }

  return <MainNavigator />;
}

const styles = {
  root: {flex: 1},
} as const;
