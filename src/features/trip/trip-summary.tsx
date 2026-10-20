import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { SyncBanner } from '@/features/outbox/sync-banner';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { t } from '@/i18n';
import { formatPrice, productCount } from '@/lib/format';
import { colors, fonts, radii, space } from '@/theme/tokens';

import type { Trip } from './stops';

/** After "Terminar": what was spent against what was expected, and what was shared. */
export function TripSummary({ trip, onDone }: { trip: Trip; onDone: () => void }) {
  const { pending } = useOutbox();
  const { actualTotalCents, expectedTotalCents, purchasedItemCount } = trip.totals;
  const purchased = trip.items.filter((item) => item.isPurchased);
  // The server turns a paid price into a report only where the line has a store.
  const shared = purchased.filter(
    (item) => item.actualUnitPriceCents !== null && (item.store ?? trip.store),
  ).length;
  const expectedForPurchased = purchased.reduce((sum, item) => sum + (item.expectedLineTotalCents ?? 0), 0);
  const difference = actualTotalCents - expectedForPurchased;

  return (
    <Screen>
      <SyncBanner />
      <View style={styles.hero}>
        <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
        <Text variant="title" accessibilityRole="header">
          {t('trip.summary.title')}
        </Text>
        <Text tone="muted">{trip.listName}</Text>
      </View>
      <View style={styles.card}>
        <Line label={t('trip.summary.spent')} value={formatPrice(actualTotalCents, trip.currency)} strong />
        <Line label={t('trip.summary.products')} value={t('trip.summary.productsOf', { bought: productCount(purchasedItemCount), total: trip.totals.itemCount })} />
        {expectedForPurchased > 0 ? (
          <Line
            label={difference <= 0 ? t('trip.summary.less') : t('trip.summary.more')}
            value={formatPrice(Math.abs(difference), trip.currency)}
            tone={difference <= 0 ? 'accent' : 'signal'}
          />
        ) : null}
        <Line label={t('trip.summary.expectedAll')} value={formatPrice(expectedTotalCents, trip.currency)} />
      </View>
      <Text tone="muted">
        {shared === 1
          ? t('trip.summary.sharedOne')
          : shared > 1
            ? t('trip.summary.sharedMany', { count: shared })
            : t('trip.summary.sharedNone')}
      </Text>
      {pending > 0 ? (
        <Text variant="caption" tone="muted">
          {t('trip.summary.offline')}
        </Text>
      ) : null}
      <Button label={t('trip.summary.done')} onPress={onDone} />
    </Screen>
  );
}

function Line({
  label,
  value,
  strong,
  tone = 'ink',
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'ink' | 'accent' | 'signal';
}) {
  return (
    <View style={styles.line}>
      <Text tone="muted">{label}</Text>
      <Text tone={tone} style={strong ? styles.strong : styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: space.xxl },
  card: {
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.md },
  value: { fontFamily: fonts.bodyBold, fontVariant: ['tabular-nums'] },
  strong: { fontFamily: fonts.display, fontSize: 24, fontVariant: ['tabular-nums'] },
});
