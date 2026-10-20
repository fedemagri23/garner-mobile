import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProductTile } from '@/components/product-tile';
import { Screen } from '@/components/screen';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useShopperLocation } from '@/features/location/location-provider';
import { usePriceHistory, useProductPrices, type StorePrice } from '@/features/prices/use-prices';
import { errorMessage } from '@/lib/error-message';
import { confidenceLabel, confidenceTone, formatDistance, formatPrice } from '@/lib/format';
import { colors, fonts, MIN_TOUCH, radii, space } from '@/theme/tokens';

import { useProduct } from './use-catalog';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-09-19" → "19 sep". The history's days are UTC calendar days. */
const shortDate = (day: string) => {
  const [, month, date] = day.split('-').map(Number);
  return `${date} ${MONTHS[month - 1]}`;
};

/** A product: where it is cheapest near the shopper, and how its price moved. */
export function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = useProduct(id);

  return (
    <Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={() => (router.canGoBack() ? router.back() : router.navigate('/search'))}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </Pressable>

      {product.isPending ? (
        <StateMessage loading />
      ) : product.isError ? (
        <StateMessage
          tone="danger"
          message={errorMessage(product.error, { 404: 'Este producto ya no está en el catálogo.' })}
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
                {[product.data.brand?.name, product.data.packageLabel, product.data.category.name]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
          <PriceHistoryCard productId={id} />
          <StorePrices productId={id} />
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
        <Text variant="bodyStrong">Últimos 30 días</Text>
        <Text tone="muted" variant="caption">
          Todavía no hay historial de precios de este producto.
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
      ? 'se mantuvo estable'
      : `${trend.direction === 'up' ? 'subió' : 'bajó'} ${Math.abs(Math.round(trend.changePercent))}%`;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text variant="bodyStrong">Últimos 30 días</Text>
        <Text variant="caption" tone="muted">
          promedio <Text variant="caption" style={styles.strong}>{price(average)}</Text>
        </Text>
      </View>
      <View
        style={styles.bars}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Precio promedio por día: de ${price(first.averageCents)} el ${shortDate(first.date)} a ${price(last.averageCents)} el ${shortDate(last.date)}; ${movement}.`}>
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
          {shortDate(first.date)}
        </Text>
        <Text variant="caption" tone="muted">
          {movement}
        </Text>
        <Text variant="caption" tone="muted">
          {shortDate(last.date)}
        </Text>
      </View>
    </View>
  );
}

function StorePrices({ productId }: { productId: string }) {
  const { location } = useShopperLocation();
  const prices = useProductPrices(productId);
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
            ? 'Todavía nadie informó este precio cerca tuyo.'
            : 'Todavía nadie informó este precio.'
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
      />
    ));
  }

  return (
    <View style={styles.section}>
      <View style={styles.cardHeader}>
        <Text variant="heading" accessibilityRole="header">
          {nearby ? 'Cerca tuyo' : 'Todos los súper'}
        </Text>
        <Text variant="caption" tone="muted">
          más barato primero
        </Text>
      </View>
      {location.status === 'none' ? (
        <Text variant="caption" tone="muted">
          Sin tu ubicación no podemos ordenar por cercanía.
        </Text>
      ) : null}
      <View style={styles.list}>{body}</View>
    </View>
  );
}

function StorePriceRow({ price, cheapest, last }: { price: StorePrice; cheapest: number; last: boolean }) {
  const difference = price.priceCents - cheapest;
  const delta = difference === 0 ? 'el más barato' : `+ ${formatPrice(difference, price.currency)}`;

  return (
    <View
      style={[styles.row, !last && styles.divider]}
      accessible
      accessibilityLabel={`${price.storeName}, ${formatPrice(price.priceCents, price.currency)}, ${delta}. ${confidenceLabel[price.confidence]}${price.distanceKm !== null ? `, a ${formatDistance(price.distanceKm)}` : ''}${price.isOpenNow ? '' : ', cerrado ahora'}`}>
      <View style={styles.rowText}>
        <Text variant="bodyStrong">{price.storeName}</Text>
        <View style={styles.meta}>
          {price.distanceKm !== null ? (
            <Text variant="caption" tone="muted">
              {formatDistance(price.distanceKm)} ·
            </Text>
          ) : null}
          <Text variant="caption" tone={confidenceTone[price.confidence]} style={styles.strong}>
            {confidenceLabel[price.confidence]}
          </Text>
          {price.isOpenNow ? null : (
            <Text variant="caption" tone="muted">
              · cerrado ahora
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
    </View>
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
