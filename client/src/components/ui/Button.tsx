import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {cursorPointer, useTheme} from '../../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: isDisabled, busy: loading}}
      disabled={isDisabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.base,
        !isDisabled && cursorPointer,
        {
          backgroundColor: primary ? theme.colors.accent : theme.colors.card,
          borderColor: primary ? 'transparent' : theme.colors.line,
          borderWidth: primary ? 0 : 1,
          opacity: isDisabled ? 0.65 : pressed ? 0.88 : 1,
        },
        primary && {
          shadowColor: theme.colors.accent,
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: {width: 0, height: 8},
          elevation: 3,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={primary ? theme.colors.onAccent : theme.colors.accent}
        />
      ) : (
        <Text
          pointerEvents="none"
          style={[
            styles.label,
            {color: primary ? theme.colors.onAccent : theme.colors.ink2},
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  label: {fontSize: 14.5, fontWeight: '600'},
});
