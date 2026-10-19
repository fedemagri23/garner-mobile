import { Pressable, StyleSheet } from 'react-native';

import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { Text } from './text';

/** A filter pill; the selected one is filled. */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={(MIN_TOUCH - 36) / 2}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.idle,
        pressed && !selected && styles.pressed,
      ]}>
      <Text style={styles.label} tone={selected ? 'onAccent' : 'ink'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radii.pill, justifyContent: 'center' },
  selected: { backgroundColor: colors.ink },
  idle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, paddingHorizontal: space.xs / 2 },
});
