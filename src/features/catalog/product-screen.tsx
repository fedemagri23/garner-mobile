import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams, useNavigation, useSegments } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ProductTile } from '@/components/product-tile';
import { Screen } from '@/components/screen';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { NewAlertSheet } from '@/features/alerts/new-alert-sheet';
import { OriginBadge } from '@/features/community/badges';
import { StandingCard } from '@/features/community/standing-card';
import { StoreSheet } from '@/features/community/store-sheet';
import { AddToListSheet } from '@/features/lists/add-to-list-sheet';
import { useShopperLocation } from '@/features/location/location-provider';
import { usePriceHistory, useProductPrices, type StorePrice } from '@/features/prices/use-prices';
import { t } from '@/i18n';
import { categoryName } from '@/lib/category-name';
import { errorMessage } from '@/lib/error-message';
import { confidenceLabel, confidenceTone, formatDistance, formatPrice, shortDay } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useProduct } from './use-catalog';

/** A product: where it is cheapest near the shopper, and how its price moved. */
export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);
  const prices = useProductPrices(id);
  const [adding, setAdding] = useState(false);
  const [watching, setWatching] = useState(false);
  const navigation = useNavigation();
  const segments = useSegments() as string[];
  const tabRoot = segments.includes('search') ? '/search' : segments.includes('lists') ? '/lists' : segments.includes('inbox') ? '/inbox' : '/';

  // Back means the screen beneath this one in the tab. A product opened by
  // the scanner has none, and the router's own back would fall through to
  // whichever tab was open before — so it goes to the tab's first screen.
  const back = () => {
    if (navigation.getState()?.index) {
      router.back();
    } else {
      router.replace(tabRoot);
    }
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={back}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        {product.data ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('browse.product.addToList')}
            onPress={() => setAdding(true)}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Ionicons name="add" size={18} color={colors.ink} />
            <Text variant="label">{t('browse.product.toList')}</Text>
          </Pressable>
        ) : null}
      </View>
      {product.data ? (
        <NewAlertSheet
          productId={id}
          productName={product.data.name}
          currency={prices.data?.prices[0]?.currency ?? null}
          cheapestCents={prices.data?.prices[0]?.priceCents ?? null}
          visible={watching}
          onClose={() => setWatching(false)}
        />
      ) : null}
      {product.data ? (
        <AddToListSheet
          productId={id}
          productName={product.data.name}
          currency={prices.data?.prices[0]?.currency ?? null}
          visible={adding}
          onClose={() => setAdding(false)}
        />
      ) : null}

      {product.isPending ? (
        <StateMessage loading />
      ) : product.isError ? (
        <StateMessage
          tone="danger"
          message={errorMessage(product.error, { 404: t('browse.product.gone') })}
        />
      ) : (
        <>
          <View style={styles.identity}>
            <ProductTile name={product.data.name} imageUrl={product.data.imageUrl} size={72} />
            <View style={styles.identityText}>
              <Text variant="heading" style={styles.name} accessibilityRole="header">
                {product.data.name}
              </Text>
              <Text tone="muted" variant="caption">
                {[product.data.brand?.name, product.data.packageLabel, categoryName(product.data.category)]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <OriginBadge origin={product.data.origin} />
              {product.data.imageSource === 'OPEN_FOOD_FACTS' ? (
                <Text variant="caption" tone="muted">
                  {t('browse.product.photoCredit')}
                </Text>
              ) : null}
            </View>
          </View>
          {product.data.origin === 'COMMUNITY' ? (
            <StandingCard
              productId={id}
              productName={product.data.name}
              confirmations={product.data.confirmationCount}
            />
          ) : null}
          <PriceHistoryCard productId={id} />
          <StorePrices productId={id} />
          <View style={styles.actions}>
            <Button
              label={t('browse.product.reportPrice')}
              variant="secondary"
              onPress={() => router.push({ pathname: '/report-price', params: { productId: id } })}
              style={styles.action}
            />
            <Button label={t('browse.product.watch')} onPress={() => setWatching(true)} style={styles.action} />
          </View>
        </>
      )}
    </Screen>
  );
}

function PriceHistoryCard({ productId }: { productId: string }) {
  // The chart speaks the currency of the prices below it; it waits for them,
  // and asks for the backend's pick when there are none.
  const prices = useProductPrices(productId);
  const history = usePriceHistory(
    productId,
    prices.data?.prices[0]?.currency,
    !prices.isPending,
  );

  if (history.isPending) {
    return (
      <View style={styles.card}>
        <StateMessage loading />
      </View>
    );
  }
  if (history.isError) {
    return (
      <View style={styles.card}>
        <StateMessage tone="danger" message={errorMessage(history.error)} />
      </View>
    );
  }

  const { points, trend, currency } = history.data;
  if (points.length === 0 || !trend || !currency) {
    return (
      <View style={styles.card}>
        <Text variant="bodyStrong">{t('browse.product.history.title')}</Text>
        <Text tone="muted" variant="caption">
          {t('browse.product.history.empty')}
        </Text>
      </View>
    );
  }

  const price = (cents: number) => formatPrice(cents, currency);
  // A peso average to the centavo is false precision; euro cents are real.
  const average = currency === 'ARS' ? Math.round(trend.averageCents / 100) * 100 : trend.averageCents;
  const values = points.map((point) => point.averageCents);
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const first = points[0];
  const last = points[points.length - 1];
  const movement =
    trend.direction === 'stable'
      ? t('browse.product.history.stable')
      : t(trend.direction === 'up' ? 'browse.product.history.up' : 'browse.product.history.down', {
          percent: Math.abs(Math.round(trend.changePercent)),
        });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text variant="bodyStrong">{t('browse.product.history.title')}</Text>
        <Text variant="caption" tone="muted">
          {t('browse.product.history.average')}<Text variant="caption" style={styles.strong}>{price(average)}</Text>
        </Text>
      </View>
      <View
        style={styles.bars}
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('browse.product.history.chart', { from: price(first.averageCents), fromDay: shortDay(first.date), to: price(last.averageCents), toDay: shortDay(last.date), movement })}>
        {points.map((point, index) => (
          <View
            key={point.date}
            style={[
              styles.bar,
              {
                height: 12 + ((point.averageCents - low) / span) * 52,
                backgroundColor: index === points.length - 1 ? colors.accent : '#C9D9CD',
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.cardHeader}>
        <Text variant="caption" tone="muted">
          {shortDay(first.date)}
        </Text>
        <Text variant="caption" tone="muted">
          {movement}
        </Text>
        <Text variant="caption" tone="muted">
          {shortDay(last.date)}
        </Text>
      </View>
    </View>
  );
}

function StorePrices({ productId }: { productId: string }) {
  const { location } = useShopperLocation();
  const prices = useProductPrices(productId);
  const [storeId, setStoreId] = useState<string | null>(null);
  const nearby = location.status === 'ready';

  let body;
  if (location.status === 'locating' || prices.isPending) {
    body = <StateMessage loading />;
  } else if (prices.isError) {
    body = <StateMessage tone="danger" message={errorMessage(prices.error)} />;
  } else if (prices.data.prices.length === 0) {
    body = (
      <StateMessage
        message={
          nearby
            ? t('browse.product.stores.noneNearby')
            : t('browse.product.stores.none')
        }
      />
    );
  } else {
    // Without a location the list can span countries; each price is compared
    // with the cheapest in its own currency, never across.
    const cheapest = new Map<string, number>();
    for (const price of prices.data.prices) {
      cheapest.set(price.currency, Math.min(cheapest.get(price.currency) ?? Infinity, price.priceCents));
    }
    body = prices.data.prices.map((price, index) => (
      <StorePriceRow
        key={price.storeId}
        price={price}
        cheapest={cheapest.get(price.currency)!}
        last={index === prices.data.prices.length - 1}
        onPress={() => setStoreId(price.storeId)}
      />
    ));
  }

  return (
    <View style={styles.section}>
      <View style={styles.cardHeader}>
        <Text variant="heading" accessibilityRole="header">
          {nearby ? t('browse.product.stores.nearby') : t('browse.product.stores.all')}
        </Text>
        <Text variant="caption" tone="muted">
          {t('browse.product.stores.cheapestFirst')}
        </Text>
      </View>
      {location.status === 'none' ? (
        <Text variant="caption" tone="muted">
          {t('browse.product.stores.noLocation')}
        </Text>
      ) : null}
      <View style={styles.list}>{body}</View>
      <StoreSheet storeId={storeId} onClose={() => setStoreId(null)} />
    </View>
  );
}

function StorePriceRow({
  price,
  cheapest,
  last,
  onPress,
}: {
  price: StorePrice;
  cheapest: number;
  last: boolean;
  onPress: () => void;
}) {
  const difference = price.priceCents - cheapest;
  const delta = difference === 0 ? t('browse.product.stores.cheapest') : `+ ${formatPrice(difference, price.currency)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={t('browse.product.stores.rowLabel', {
        store: price.storeName,
        price: formatPrice(price.priceCents, price.currency),
        delta,
        confidence: confidenceLabel(price.confidence),
        distance: price.distanceKm !== null ? t('browse.product.stores.distanceLabel', { distance: formatDistance(price.distanceKm) }) : '',
        closed: price.isOpenNow ? '' : t('browse.product.stores.closedLabel'),
      })}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{price.storeName}</Text>
        <View style={styles.meta}>
          {price.distanceKm !== null ? (
            <Text variant="caption" tone="muted">
              {formatDistance(price.distanceKm)} ·
            </Text>
          ) : null}
          <Text variant="caption" tone={confidenceTone[price.confidence]} style={styles.strong}>
            {confidenceLabel(price.confidence)}
          </Text>
          {price.isOpenNow ? null : (
            <Text variant="caption" tone="muted">
              {t('browse.product.stores.closedNowDot')}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>{formatPrice(price.priceCents, price.currency)}</Text>
        <Text variant="caption" tone="muted">
          {delta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  actions: { flexDirection: 'row', gap: space.sm },
  action: { flex: 1, paddingHorizontal: space.sm },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addButton: {
    height: MIN_TOUCH,
    paddingHorizontal: space.lg,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  identityText: { flex: 1, gap: space.xs },
  name: { fontSize: 24, lineHeight: 27 },
  card: {
    padding: space.lg,
    gap: space.md - 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  strong: { fontFamily: fonts.bodyBold },
  bars: { height: 64, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { flex: 1, borderRadius: 2 },
  section: { gap: space.md - 2 },
  list: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13, paddingHorizontal: space.lg },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  rowText: { flex: 1, gap: 3 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  right: { alignItems: 'flex-end', gap: 2 },
  price: { fontFamily: fonts.bodyBold, fontSize: 17, fontVariant: ['tabular-nums'] },
});
