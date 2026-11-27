import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {Brand} from '../../components/ui/Brand';
import {Button} from '../../components/ui/Button';
import {ThemeToggle} from '../../components/ui/ThemeToggle';
import {useClock} from '../../hooks/useClock';
import {useTheme} from '../../theme';
import {MAIN_NAV, type MainRoute} from './routes';

const WIDE_BREAKPOINT = 900;

interface TopBarProps {
  active: MainRoute;
  onNavigate: (route: MainRoute) => void;
  onOpenMenu: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

export function TopBar({
  active,
  onNavigate,
  onOpenMenu,
  onLogout,
  loggingOut,
}: TopBarProps) {
  const theme = useTheme();
  const {width} = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const now = useClock();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.topbar,
          borderBottomColor: theme.colors.line,
        },
      ]}>
      {!wide ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apri menu"
          onPress={onOpenMenu}
          style={[
            styles.menu,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.line,
            },
          ]}>
          <Text style={[styles.menuIcon, {color: theme.colors.ink2}]}>☰</Text>
        </Pressable>
      ) : null}

      <Brand />

      {wide ? (
        <View style={styles.nav}>
          {MAIN_NAV.map(item => {
            const selected = item.id === active;
            return (
              <Pressable
                key={item.id}
                onPress={() => onNavigate(item.id)}
                style={[
                  styles.navButton,
                  selected && {backgroundColor: theme.colors.accent},
                ]}>
                <Text
                  style={[
                    styles.navText,
                    {
                      color: selected
                        ? theme.colors.onAccent
                        : theme.colors.ink2,
                    },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.right}>
        {width >= 420 ? (
          <Text style={[styles.clock, {color: theme.colors.muted}]}>
            {time}
          </Text>
        ) : null}
        <ThemeToggle />
        <Button
          label="Esci"
          onPress={onLogout}
          loading={loggingOut}
          variant="ghost"
          style={styles.logout}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  menu: {
    width: 38,
    height: 38,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {fontSize: 16},
  nav: {flexDirection: 'row', alignItems: 'center', gap: 2},
  navButton: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9},
  navText: {fontSize: 13, fontWeight: '600'},
  right: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clock: {fontSize: 12.5},
  logout: {minHeight: 38, paddingHorizontal: 12},
});
