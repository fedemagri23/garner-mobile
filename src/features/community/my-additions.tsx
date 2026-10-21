import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { pendingProducts, type ProductChange } from '@/features/outbox/changes';
import { useOutbox } from '@/features/outbox/outbox-provider';
import { t } from '@/i18n';
import { colors, fonts, radii, space } from '@/theme/tokens';

import { StoreSheet } from './store-sheet';
import { useMyAdditions, type AddedProduct, type AddedStore } from './use-community';

type Status = AddedProduct['status'];

const TONE: Record<Status, 'accent' | 'signal' | 'danger' | 'muted'> = {
  PRIVATE: 'signal',
  PUBLIC: 'muted',
  VERIFIED: 'accent',
  UNDER_REVIEW: 'signal',
  HIDDEN: 'danger',
};

/**
 * In "Mis aportes": the products and shops the shopper added, each with
 * where it stands, and those still waiting on the phone. Nothing at all for
 * someone who never added one.
 */
export function MyAdditionsSection() {
  const mine = useMyAdditions();
  const { queue } = useOutbox();
  const waiting = pendingProducts(queue);
  const [storeId, setStoreId] = useState<string | null>(null);

  const products = mine.data?.products ?? [];
  const stores = mine.data?.stores ?? [];
  if (waiting.length + products.length + stores.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text variant="heading" accessibilityRole="header">
        {t('community.mine.title')}
      </Text>
      {waiting.length + products.length > 0 ? (
        <View style={styles.group}>
          <Text variant="label">{t('community.mine.products')}</Text>
          {waiting.map((change) => (
            <Waiting key={change.id} change={change} />
          ))}
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </View>
      ) : null}
      {stores.length > 0 ? (
        <View style={styles.group}>
          <Text variant="label">{t('community.mine.stores')}</Text>
          {stores.map((store) => (
            <StoreRow key={store.id} store={store} onPress={() => setStoreId(store.id)} />
          ))}
        </View>
      ) : null}
      <Text variant="heading" accessibilityRole="header" style={styles.prices}>
        {t('community.mine.prices')}
      </Text>
      <StoreSheet storeId={storeId} onClose={() => setStoreId(null)} />
    </View>
  );
}

function Waiting({ change }: { change: ProductChange }) {
  const status = t('community.mine.waiting');
  return (
    <View
      style={[styles.row, styles.waiting]}
      accessible
      accessibilityLabel={t('community.mine.rowLabel', { name: change.product.name, status })}>
      <Text variant="bodyStrong">{change.product.name}</Text>
      {change.brandLabel ? (
        <Text variant="caption" tone="muted">
          {change.brandLabel}
        </Text>
      ) : null}
      <Text variant="caption" tone="signal" style={styles.strong}>
        {status}
      </Text>
    </View>
  );
}

function ProductRow({ product }: { product: AddedProduct }) {
  const status = t(`community.mine.status.${product.status}`);
  const detail = [product.brandName, product.confirmationCount > 0 ? t('community.mine.confirmations', { count: product.confirmationCount }) : null]
    .filter(Boolean)
    .join(' · ');
  const visible = product.status !== 'HIDDEN';

  return (
    <Pressable
      accessibilityRole={visible ? 'button' : undefined}
      accessibilityLabel={t('community.mine.rowLabel', { name: product.name, status: [status, detail].filter(Boolean).join(', ') })}
      disabled={!visible}
      onPress={() => router.push(`/product/${product.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text variant="bodyStrong">{product.name}</Text>
      {detail ? (
        <Text variant="caption" tone="muted">
          {detail}
        </Text>
      ) : null}
      <Text variant="caption" tone={TONE[product.status]} style={styles.strong}>
        {status}
      </Text>
    </Pressable>
  );
}

function StoreRow({ store, onPress }: { store: AddedStore; onPress: () => void }) {
  const status = t(`community.mine.status.${store.status}`);
  const remaining =
    store.status === 'PRIVATE' ? t('community.mine.remaining', { count: store.productsRemaining }) : null;
  const label = [status, remaining].filter(Boolean).join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('community.mine.rowLabel', { name: store.name, status: label })}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text variant="bodyStrong">{store.name}</Text>
      <Text variant="caption" tone="muted">
        {store.supermarketName} · {store.addressLine}
      </Text>
      <Text variant="caption" tone={TONE[store.status]} style={styles.strong}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md, paddingTop: space.sm },
  group: { gap: space.sm },
  row: {
    gap: 2,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  waiting: { borderColor: colors.signal, backgroundColor: colors.signalSoft },
  pressed: { backgroundColor: colors.surfaceMuted },
  strong: { fontFamily: fonts.bodyBold },
  prices: { marginTop: space.sm },
});
