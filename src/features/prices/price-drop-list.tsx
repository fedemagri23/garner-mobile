import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductTile } from '@/components/product-tile';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useShopperLocation } from '@/features/location/location-provider';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/error-message';
import { formatDistance, formatPrice } from '@/lib/format';
import { colors, fonts, radii, space } from '@/theme/tokens';

import { usePriceDrops, type PriceDrop } from './use-prices';

/** The home screen's "Bajaron cerca tuyo". */
export function PriceDropList() {
  const { location } = useShopperLocation();
  const drops = usePriceDrops();

  let body;
  if (location.status === 'none') {
    body = (
      <StateMessage message={t('shell.home.needLocation')} />
    );
  } else if (location.status === 'locating' || drops.isPending) {
    body = <StateMessage loading />;
  } else if (drops.isError) {
    body = <StateMessage tone="danger" message={errorMessage(drops.error)} />;
  } else if (drops.data.length === 0) {
    body = <StateMessage message={t('shell.home.noDrops')} />;
  } else {
    body = drops.data.map((drop, index) => (
      <PriceDropRow key={drop.productId} drop={drop} last={index === drops.data.length - 1} />
    ));
  }

  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header">
        {t('shell.home.dropsTitle')}
      </Text>
      <View style={styles.card}>{body}</View>
    </View>
  );
}

function PriceDropRow({ drop, last }: { drop: PriceDrop; last: boolean }) {
  const where = t('shell.home.dropWhere', { store: drop.storeName, distance: formatDistance(drop.distanceKm) });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('shell.home.dropLabel', { product: drop.productName, price: formatPrice(drop.priceCents, drop.currency), percent: drop.dropPercent, where })}
      onPress={() => router.push(`/product/${drop.productId}`)}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}>
      <ProductTile name={drop.productName} imageUrl={drop.imageUrl} />
      <View style={styles.middle}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {drop.productName}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {where}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{formatPrice(drop.priceCents, drop.currency)}</Text>
        <Text style={styles.badge} tone="signal">
          −{drop.dropPercent}%
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md - 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  pressed: { backgroundColor: colors.surfaceMuted },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  price: { fontFamily: fonts.bodyBold, fontSize: 16, fontVariant: ['tabular-nums'] },
  badge: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    backgroundColor: colors.signalSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
