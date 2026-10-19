import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii, space } from '@/theme/tokens';

import { Text } from './text';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

/** A labelled input; the label is what screen readers announce. */
export function TextField({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.field}>
      <Text variant="label">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  input: {
    height: 52,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
});
