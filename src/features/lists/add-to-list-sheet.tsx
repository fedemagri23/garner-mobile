import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StateMessage } from '@/components/state-message';
import { Text } from '@/components/text';
import { errorMessage } from '@/lib/error-message';
import { colors, radii, space } from '@/theme/tokens';

import { useAddToList, useCreateList, useListDetails, useLists, type ListDetail } from './use-lists';

const FIRST_LIST_NAME = 'Mi lista';

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
  /** For a first list: the currency of the prices near the shopper. */
  currency: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const lists = useLists();
  const details = useListDetails(lists.data?.map((list) => list.id) ?? []);
  const add = useAddToList();
  const create = useCreateList();
  const [done, setDone] = useState<string | null>(null);

  const close = () => {
    setDone(null);
    add.reset();
    create.reset();
    onClose();
  };

  const addTo = async (list: ListDetail) => {
    setDone(null);
    const result = await add.mutateAsync({ list, productId });
    setDone(
      result.quantity === 1
        ? `Agregado a ${result.listName}.`
        : `Ahora hay ${result.quantity} en ${result.listName}.`,
    );
  };

  const createAndAdd = async () => {
    const list = await create.mutateAsync({ name: FIRST_LIST_NAME, currency });
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
        <Text tone="muted">Todavía no tenés listas.</Text>
        <Button
          label={`Crear “${FIRST_LIST_NAME}” y agregar`}
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
          accessibilityLabel={`${list.name}, ${count === 1 ? '1 producto' : `${count} productos`}${item ? `, ya tiene ${item.quantity}` : ''}`}
          disabled={add.isPending}
          onPress={() => addTo(list).catch(() => undefined)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.rowText}>
            <Text variant="bodyStrong">{list.name}</Text>
            <Text variant="caption" tone="muted">
              {count === 1 ? '1 producto' : `${count} productos`}
              {item ? ` · ya tiene ${item.quantity}` : ''}
            </Text>
          </View>
          <Ionicons name={item ? 'add-circle' : 'add-circle-outline'} size={26} color={colors.accent} />
        </Pressable>
      );
    });
  }

  const failure = add.error ?? create.error;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} accessibilityLabel="Cerrar" onPress={close} />
      <View style={[styles.sheet, { paddingBottom: space.xl + insets.bottom }]}>
        <Text variant="heading" accessibilityRole="header">
          Agregar a una lista
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {productName}
        </Text>
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
            {errorMessage(failure, { 422: 'Esa lista ya está llena.' })}
          </Text>
        ) : null}
        <Button label="Listo" variant="secondary" onPress={close} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,18,0.4)' },
  sheet: {
    backgroundColor: colors.ground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: space.xl,
    gap: space.md,
    maxHeight: '75%',
  },
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
