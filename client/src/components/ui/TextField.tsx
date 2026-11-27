import {useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import {cursorPointer, useTheme} from '../../theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  rightAction?: {label: string; onPress: () => void};
}

export function TextField({
  label,
  rightAction,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, {color: theme.colors.muted}]}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: theme.colors.inputBg,
            borderColor: focused
              ? theme.colors.accent
              : theme.colors.inputBorder,
          },
          focused && {
            shadowColor: theme.colors.accent,
            shadowOpacity: 0.18,
            shadowRadius: 6,
            shadowOffset: {width: 0, height: 0},
          },
        ]}>
        <TextInput
          key={`${theme.mode}-${inputProps.secureTextEntry ? 'secure' : 'plain'}`}
          {...inputProps}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={theme.colors.inputPlaceholder}
          selectionColor={theme.colors.accent}
          style={[styles.input, {color: theme.colors.inputText}]}
        />
        {rightAction ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={rightAction.onPress}
            style={[styles.action, cursorPointer]}>
            <Text pointerEvents="none" style={[styles.actionText, {color: theme.colors.muted}]}>
              {rightAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: 7},
  label: {fontSize: 12, fontWeight: '600'},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 11,
  },
  input: {flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15},
  action: {paddingHorizontal: 12},
  actionText: {fontSize: 12, fontWeight: '600'},
});
