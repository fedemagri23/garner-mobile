import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { Text } from './text';

interface Props extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: Props) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        state.pressed && (primary ? styles.primaryPressed : styles.secondaryPressed),
        inactive && styles.inactive,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={primary ? colors.onAccent : colors.ink} />
      ) : (
        <Text style={styles.label} tone={primary ? 'onAccent' : 'ink'}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Math.max(MIN_TOUCH, 54),
    borderRadius: radii.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  primaryPressed: { backgroundColor: colors.accentPressed },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  secondaryPressed: { backgroundColor: colors.surfaceMuted },
  inactive: { opacity: 0.6 },
  label: { fontFamily: fonts.bodyBold, fontSize: 16 },
});
