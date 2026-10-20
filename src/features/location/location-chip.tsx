import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useShopperLocation } from './location-provider';

/**
 * Where "near me" is. When there is both a phone position and a saved place,
 * tapping switches between them; otherwise it only says which one is in use.
 */
export function LocationChip() {
  const { location, canSwitch, setMode } = useShopperLocation();

  const label =
    location.status === 'ready'
      ? location.label
      : location.status === 'locating'
        ? t('shell.location.locating')
        : t('shell.location.none');

  const content = (
    <>
      {location.status === 'locating' ? (
        <ActivityIndicator size="small" color={colors.muted} />
      ) : (
        <Ionicons name="location-outline" size={16} color={colors.ink} />
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {canSwitch ? <Ionicons name="swap-horizontal" size={14} color={colors.muted} /> : null}
    </>
  );

  if (!canSwitch || location.status !== 'ready') {
    return (
      <View style={styles.chip} accessible accessibilityLabel={t('shell.location.chip', { label })}>
        {content}
      </View>
    );
  }

  const other = location.source === 'device' ? 'saved' : 'device';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('shell.location.chipChange', { label })}
      onPress={() => setMode(other)}
      hitSlop={(MIN_TOUCH - 36) / 2}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    maxWidth: 170,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, flexShrink: 1 },
});
