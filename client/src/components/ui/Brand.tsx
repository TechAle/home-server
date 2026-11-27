import {StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../../theme';

export function Brand({size = 15}: {size?: number}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.dot,
          {backgroundColor: theme.colors.dot, shadowColor: theme.colors.dot},
        ]}
      />
      <Text style={[styles.name, {color: theme.colors.brandText, fontSize: size}]}>
        home
        <Text style={{color: theme.colors.brandDim}}>.server</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 9},
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 0},
  },
  name: {fontWeight: '700', letterSpacing: -0.2},
});
