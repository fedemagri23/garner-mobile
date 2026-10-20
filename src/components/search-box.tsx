import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii, space } from '@/theme/tokens';

import { Text } from './text';

const LABEL = 'Buscar productos';

/** The search field. Editable on the search screen, a shortcut to it elsewhere. */
export function SearchBox({
  onPress,
  focused,
  ...input
}: TextInputProps & { onPress?: () => void; focused?: boolean }) {
  const icon = <Ionicons name="search" size={20} color={colors.muted} />;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={LABEL}
        onPress={onPress}
        style={({ pressed }) => [styles.box, pressed && styles.pressed]}>
        {icon}
        <Text tone="muted" style={styles.placeholder}>
          {LABEL}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.box, focused && styles.focused]}>
      {icon}
      <TextInput
        accessibilityLabel={LABEL}
        placeholder={LABEL}
        placeholderTextColor={colors.muted}
        returnKeyType="search"
        autoCorrect={false}
        style={styles.input}
        {...input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  focused: { borderWidth: 2, borderColor: colors.accent, paddingHorizontal: space.lg - 1 },
  pressed: { backgroundColor: colors.surfaceMuted },
  placeholder: { fontFamily: fonts.bodyMedium },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
});
