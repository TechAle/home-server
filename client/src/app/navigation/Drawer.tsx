import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Brand} from '../../components/ui/Brand';
import {cursorPointer, useTheme} from '../../theme';
import {MAIN_NAV, type MainRoute} from './routes';

interface DrawerProps {
  open: boolean;
  active: MainRoute;
  onNavigate: (route: MainRoute) => void;
  onClose: () => void;
  onLogout: () => void;
}

export function Drawer({
  open,
  active,
  onNavigate,
  onClose,
  onLogout,
}: DrawerProps) {
  const theme = useTheme();

  if (!open) {return null;}

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.overlay]}
      accessibilityViewIsModal>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chiudi menu"
        onPress={onClose}
        style={[
          StyleSheet.absoluteFill,
          {backgroundColor: 'rgba(4, 9, 18, 0.5)'},
        ]}
      />

      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.colors.card,
            borderRightColor: theme.colors.line,
          },
        ]}>
        <View style={styles.head}>
          <Brand />
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={8}
            style={cursorPointer}>
            <Text pointerEvents="none" style={[styles.close, {color: theme.colors.muted}]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.items}>
          {MAIN_NAV.map(item => {
            const selected = item.id === active;
            return (
              <Pressable
                key={item.id}
                onPress={() => onNavigate(item.id)}
                style={[
                  styles.item,
                  cursorPointer,
                  selected && {backgroundColor: theme.colors.accentSoft},
                ]}>
                <Text
                  pointerEvents="none"
                  style={[
                    styles.itemText,
                    {
                      color: selected
                        ? theme.colors.accent
                        : theme.colors.ink2,
                    },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onLogout}
          style={[styles.logout, cursorPointer, {borderTopColor: theme.colors.line}]}>
          <Text pointerEvents="none" style={[styles.logoutText, {color: theme.colors.danger}]}>
            Esci
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {zIndex: 30},
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 290,
    maxWidth: '82%',
    padding: 18,
    gap: 12,
    borderRightWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  close: {fontSize: 16},
  items: {gap: 4},
  item: {paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10},
  itemText: {fontSize: 13.5, fontWeight: '600'},
  logout: {marginTop: 'auto', paddingTop: 14, borderTopWidth: 1},
  logoutText: {fontSize: 13, fontWeight: '600'},
});
