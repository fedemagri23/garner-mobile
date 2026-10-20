import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { useLocalCurrency } from '@/features/location/use-local-currency';
import { t } from '@/i18n';
import { productCount } from '@/lib/format';
import { errorMessage } from '@/lib/error-message';
import { colors, radii, space } from '@/theme/tokens';

import { CurrencyPicker } from './currency-picker';
import { useAddToList, useCreateList, useListDetails, useLists, type ListDetail } from './use-lists';

/**
 * "A la lista": pick a list and the product goes on it. The sheet stays open
 * with what happened, so adding to two lists, or two of something, is a tap
 * each.
 */
export function AddToListSheet({
  productId,
  productName,
  currency,
  visible,
  onClose,
}: {
  productId: string;
  productName: string;
  /** For a first list: the currency of this product's prices nearby, if any. */
  currency: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const lists = useLists();
  const details = useListDetails(lists.data?.map((list) => list.id) ?? []);
  const add = useAddToList();
  const create = useCreateList();
  const [done, setDone] = useState<string | null>(null);
  const { currency: local, looking } = useLocalCurrency();
  const [picked, setPicked] = useState<string | null>(null);
  const firstListCurrency = picked ?? currency ?? local;

  const close = () => {
    setDone(null);
    setPicked(null);
    add.reset();
    create.reset();
    onClose();
  };

  const addTo = async (list: ListDetail) => {
    setDone(null);
    const result = await add.mutateAsync({ list, productId });
    setDone(
      result.quantity === 1
        ? t('lists.addTo.addedTo', { list: result.listName })
        : t('lists.addTo.nowHasIn', { quantity: result.quantity, list: result.listName }),
    );
  };

  const createAndAdd = async () => {
    if (!firstListCurrency) {
      return;
    }
    const list = await create.mutateAsync({ name: t('lists.addTo.firstListName'), currency: firstListCurrency });
    await addTo({ ...list, items: [] });
  };

  let body;
  if (lists.isPending || details.some((detail) => detail.isPending)) {
    body = <StateMessage loading />;
  } else if (lists.isError) {
    body = <StateMessage tone="danger" message={errorMessage(lists.error)} />;
  } else if (lists.data.length === 0) {
    body = (
      <View style={styles.empty}>
        <Text tone="muted">{t('lists.addTo.none')}</Text>
        <CurrencyPicker
          value={firstListCurrency}
          local={local}
          looking={looking && !currency}
          onChange={setPicked}
        />
        <Button
          label={t('lists.addTo.createAndAdd', { name: t('lists.addTo.firstListName') })}
          disabled={!firstListCurrency}
          loading={create.isPending || add.isPending}
          onPress={() => createAndAdd().catch(() => undefined)}
        />
      </View>
    );
  } else {
    body = details.map((detail) => {
      const list = detail.data;
      if (!list) {
        return null;
      }
      const item = list.items.find((entry) => entry.product.id === productId);
      const count = list.totals.itemCount;

      return (
        <Pressable
          key={list.id}
          accessibilityRole="button"
          accessibilityLabel={t('lists.addTo.rowLabel', { list: list.name, count: productCount(count), has: item ? t('lists.addTo.hasLabel', { quantity: item.quantity }) : '' })}
          disabled={add.isPending}
          onPress={() => addTo(list).catch(() => undefined)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.rowText}>
            <Text variant="bodyStrong">{list.name}</Text>
            <Text variant="caption" tone="muted">
              {productCount(count)}
              {item ? t('lists.addTo.hasMeta', { quantity: item.quantity }) : ''}
            </Text>
          </View>
          <Ionicons name={item ? 'add-circle' : 'add-circle-outline'} size={26} color={colors.accent} />
        </Pressable>
      );
    });
  }

  const failure = add.error ?? create.error;

  return (
    <Sheet title={t('lists.addTo.title')} subtitle={productName} visible={visible} onClose={close}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {body}
      </ScrollView>
      {done ? (
        <Text tone="accent" variant="bodyStrong" accessibilityLiveRegion="polite">
          {done}
        </Text>
      ) : null}
      {failure ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {errorMessage(failure, { 422: t('lists.addTo.full') })}
        </Text>
      ) : null}
      <Button label={t('lists.addTo.done')} variant="secondary" onPress={close} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0 },
  listContent: {
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
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  rowText: { flex: 1, gap: 2 },
  empty: { padding: space.lg, gap: space.md },
});
