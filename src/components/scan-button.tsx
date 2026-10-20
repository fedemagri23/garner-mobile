import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { t } from '@/i18n';
import { colors, radii } from '@/theme/tokens';

/** Opens the barcode scanner. Filled on Inicio, outlined beside an active search. */
export function ScanButton({ variant = 'filled' }: { variant?: 'filled' | 'outlined' }) {
  const filled = variant === 'filled';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.scanBarcode')}
      onPress={() => router.push('/scan')}
      style={({ pressed }) => [
        styles.button,
        filled ? styles.filled : styles.outlined,
        pressed && (filled ? styles.filledPressed : styles.outlinedPressed),
      ]}>
      <Ionicons name="barcode-outline" size={24} color={filled ? colors.onAccent : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  filled: { backgroundColor: colors.accent },
  filledPressed: { backgroundColor: colors.accentPressed },
  outlined: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  outlinedPressed: { backgroundColor: colors.surfaceMuted },
});
