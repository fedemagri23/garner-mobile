import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { t } from '@/i18n';
import { colors, radii, space } from '@/theme/tokens';

/**
 * "Solo vos la ves: faltan 7 productos": how far a shop the shopper added is
 * from being shown to everyone, with a bar.
 */
export function ProgressCard({ priced, needed }: { priced: number; needed: number }) {
  const remaining = Math.max(0, needed - priced);
  const share = Math.min(1, priced / needed);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="eye-off-outline" size={18} color={colors.signal} />
        <Text variant="bodyStrong" style={styles.title}>
          {t('community.progress.title')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('community.progress.counted', { priced, needed })}
        </Text>
      </View>
      <Text>{t('community.progress.remaining', { count: remaining })}</Text>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('community.progress.label', { priced, needed })}
        accessibilityValue={{ min: 0, max: needed, now: priced }}>
        <View style={[styles.fill, { width: `${share * 100}%` }]} />
      </View>
      <Text variant="caption" tone="muted">
        {t('community.progress.howTo')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.lg,
    gap: space.sm,
    backgroundColor: colors.signalSoft,
    borderWidth: 1,
    borderColor: colors.signal,
    borderRadius: radii.lg,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.signal, borderRadius: 4 },
});
